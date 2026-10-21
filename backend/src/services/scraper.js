import { createHash } from 'node:crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { query, conTransaccion } from '../db/pool.js';
import {
  USER_AGENT,
  INTERVALO_POR_DOMINIO_MS,
  TIEMPO_MAXIMO_MS,
  TAMANO_MAXIMO_BYTES,
  MAX_REDIRECCIONES,
  listaBlanca as listaBlancaConfigurada,
} from '../config/scraper.js';
import { conflicto } from '../utils/httpError.js';
import { extraerTelefonos, soloDigitos } from '../utils/telefonos.js';
import { parsearRobots, rutaPermitida } from '../utils/robots.js';

const LIMITE_TEXTO_CAMBIO = 4000;

// ------------------------------------------------------------------ utilidades puras
export function sha256(texto) {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function normalizarTexto(texto) {
  return String(texto ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** El host debe ser un dominio de la lista o un subdominio suyo (no basta con "terminar en"). */
export function dominioPermitido(hostname, lista) {
  const host = String(hostname).toLowerCase().replace(/\.$/, '');
  return lista.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Serializa las solicitudes por dominio y garantiza `intervaloMs` entre una y otra. */
export function crearLimitadorPorDominio(intervaloMs, { ahora = Date.now, dormir } = {}) {
  const esperar = dormir ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const ultimaSolicitud = new Map();
  const colas = new Map();

  return function turno(dominio) {
    const previo = colas.get(dominio) ?? Promise.resolve();
    const actual = previo.then(async () => {
      const espera = (ultimaSolicitud.get(dominio) ?? -Infinity) + intervaloMs - ahora();
      if (espera > 0) await esperar(espera);
      ultimaSolicitud.set(dominio, ahora());
    });
    colas.set(dominio, actual.catch(() => {}));
    return actual;
  };
}

/**
 * Compara los teléfonos conocidos (canales de los servicios de la fuente) con los encontrados.
 * Devuelve los cambios a proponer. Nunca modifica nada.
 */
export function calcularCambios({ conocidos, encontrados, primeraLectura, texto, ultimoHash }) {
  const encontradosDig = new Set(encontrados.map((t) => t.digitos));
  const conocidosDig = new Set(conocidos.map((c) => soloDigitos(c.valor)));

  const faltan = conocidos.filter(
    (c, i, arr) =>
      !encontradosDig.has(soloDigitos(c.valor)) &&
      arr.findIndex((o) => soloDigitos(o.valor) === soloDigitos(c.valor)) === i,
  );
  const nuevos = encontrados.filter((t) => !conocidosDig.has(t.digitos));
  const prioridadDe = (c) => 2 + (c.es_emergencia ? 5 : 0);

  const cambios = [];
  const pares = Math.min(faltan.length, nuevos.length);
  for (let i = 0; i < pares; i += 1) {
    cambios.push({
      servicio_id: faltan[i].servicio_id,
      campo: faltan[i].tipo,
      valor_anterior: faltan[i].valor,
      valor_nuevo: nuevos[i].valor,
      prioridad: prioridadDe(faltan[i]),
    });
  }
  for (const c of faltan.slice(pares)) {
    cambios.push({ servicio_id: c.servicio_id, campo: c.tipo, valor_anterior: c.valor, valor_nuevo: null, prioridad: prioridadDe(c) });
  }
  // En la primera lectura no se proponen números sueltos: solo se fija la línea base.
  if (!primeraLectura) {
    for (const t of nuevos.slice(pares)) {
      cambios.push({ servicio_id: null, campo: 'telefono', valor_anterior: null, valor_nuevo: t.valor, prioridad: 1 });
    }
  }
  if (!cambios.length && !primeraLectura) {
    cambios.push({
      servicio_id: null,
      campo: 'bloque',
      valor_anterior: ultimoHash ? `sha256:${ultimoHash}` : null,
      valor_nuevo: texto.slice(0, LIMITE_TEXTO_CAMBIO),
      prioridad: 0,
    });
  }
  return cambios;
}

// ------------------------------------------------------------------ scraper
/**
 * @param {object} [opciones]
 * @param {string[]} [opciones.listaBlanca]
 * @param {number}   [opciones.intervaloMs]  mínimo entre solicitudes al mismo dominio
 * @param {boolean}  [opciones.permitirHttp] solo para el servidor local de pruebas
 * @param {boolean}  [opciones.aceptarSinteticos] reconoce teléfonos 000-000-00XX (pruebas)
 * @param {import('axios').AxiosInstance} [opciones.http]
 */
export function crearScraper({
  listaBlanca = listaBlancaConfigurada(),
  intervaloMs = INTERVALO_POR_DOMINIO_MS,
  permitirHttp = false,
  aceptarSinteticos = false,
  http = axios.create(),
} = {}) {
  const turno = crearLimitadorPorDominio(intervaloMs);
  let enCurso = false;

  function urlValida(url) {
    if (url.protocol !== 'https:' && !(permitirHttp && url.protocol === 'http:')) {
      return 'solo se permiten páginas https';
    }
    if (!dominioPermitido(url.hostname, listaBlanca)) return 'el dominio no está en la lista blanca';
    return null;
  }

  async function descargar(direccion) {
    const url = new URL(direccion);
    const motivo = urlValida(url);
    if (motivo) throw new Error(motivo);
    await turno(url.hostname);
    return http.get(url.href, {
      responseType: 'text',
      transformResponse: [(d) => d],
      timeout: TIEMPO_MAXIMO_MS,
      maxContentLength: TAMANO_MAXIMO_BYTES,
      maxRedirects: MAX_REDIRECCIONES,
      validateStatus: () => true,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.1' },
      beforeRedirect: (opciones) => {
        const destino = new URL(`${opciones.protocol}//${opciones.hostname}`);
        const problema = urlValida(destino);
        if (problema) throw new Error(`redirección bloqueada: ${problema}`);
      },
    });
  }

  /** robots.txt por origen, cacheado durante una ejecución. 4xx = todo permitido; error/5xx = nada permitido. */
  function robotsDe(origen, cache) {
    if (!cache.has(origen)) {
      cache.set(
        origen,
        descargar(`${origen}/robots.txt`)
          .then((res) => {
            if (res.status >= 200 && res.status < 300) return parsearRobots(res.data);
            if (res.status >= 400 && res.status < 500) return [];
            return null;
          })
          .catch(() => null),
      );
    }
    return cache.get(origen);
  }

  async function leer(fuente, cacheRobots) {
    const url = new URL(fuente.url);
    const motivo = urlValida(url);
    if (motivo) return { estado: 'omitida', motivo };

    const robots = await robotsDe(url.origin, cacheRobots);
    if (robots === null) return { estado: 'omitida', motivo: 'no se pudo leer robots.txt; por prudencia no se lee la página' };
    if (!rutaPermitida(robots, USER_AGENT, url.pathname + url.search)) {
      return { estado: 'omitida', motivo: 'robots.txt no permite leer esta página' };
    }

    const res = await descargar(url.href);
    if (res.status !== 200) return { estado: 'error', motivo: `la página respondió HTTP ${res.status}` };

    const $ = cheerio.load(String(res.data));
    $('script, style, noscript, template').remove();
    const nodos = fuente.selector_css ? $(fuente.selector_css) : $('body');
    if (!nodos.length) return { estado: 'error', motivo: 'el selector_css no encontró contenido' };

    const texto = normalizarTexto(nodos.map((_, el) => $(el).text()).get().join('\n'));
    return { estado: 'leida', texto, hash: sha256(texto), telefonos: extraerTelefonos(texto, { aceptarSinteticos }) };
  }

  /** Guarda la lectura: solo actualiza `fuentes` e inserta en `cambios_pendientes`. */
  async function registrar(fuente, lectura) {
    return conTransaccion(async (conn) => {
      const [[actual]] = await conn.query('SELECT ultimo_hash FROM fuentes WHERE id = ? FOR UPDATE', [fuente.id]);
      if (actual.ultimo_hash === lectura.hash) {
        await conn.query('UPDATE fuentes SET ultima_lectura = NOW() WHERE id = ?', [fuente.id]);
        return { estado: 'sin_cambios', cambios: 0 };
      }

      const [conocidos] = await conn.query(
        `SELECT c.servicio_id, c.tipo, c.valor, s.es_emergencia
           FROM canales c JOIN servicios s ON s.id = c.servicio_id
          WHERE s.fuente_id = ? AND s.estado <> 'retirado' AND c.tipo IN ('telefono', 'whatsapp')
          ORDER BY c.servicio_id, c.id`,
        [fuente.id],
      );
      const primeraLectura = !actual.ultimo_hash;
      const propuestos = calcularCambios({
        conocidos: conocidos.map((c) => ({ ...c, es_emergencia: Boolean(Number(c.es_emergencia)) })),
        encontrados: lectura.telefonos,
        primeraLectura,
        texto: lectura.texto,
        ultimoHash: actual.ultimo_hash,
      });

      let insertados = 0;
      for (const c of propuestos) {
        // No repite una propuesta que ya está pendiente o que un administrador rechazó.
        const [[repetido]] = await conn.query(
          `SELECT id FROM cambios_pendientes
            WHERE fuente_id = ? AND campo = ? AND estado IN ('pendiente', 'rechazado')
              AND servicio_id <=> ? AND valor_anterior <=> ? AND valor_nuevo <=> ?
            LIMIT 1`,
          [fuente.id, c.campo, c.servicio_id, c.valor_anterior, c.valor_nuevo],
        );
        if (repetido) continue;
        await conn.query(
          `INSERT INTO cambios_pendientes (fuente_id, servicio_id, campo, valor_anterior, valor_nuevo, hash, prioridad)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [fuente.id, c.servicio_id, c.campo, c.valor_anterior, c.valor_nuevo, lectura.hash, c.prioridad],
        );
        insertados += 1;
      }

      await conn.query('UPDATE fuentes SET ultimo_hash = ?, ultima_lectura = NOW() WHERE id = ?', [lectura.hash, fuente.id]);
      if (insertados) return { estado: 'con_cambios', cambios: insertados };
      return { estado: primeraLectura ? 'linea_base' : 'sin_cambios', cambios: 0 };
    });
  }

  async function procesar(fuente, cacheRobots) {
    const base = { id: fuente.id, nombre: fuente.nombre };
    try {
      const lectura = await leer(fuente, cacheRobots);
      if (lectura.estado !== 'leida') return { ...base, ...lectura, cambios: 0 };
      return { ...base, ...(await registrar(fuente, lectura)) };
    } catch (err) {
      return { ...base, estado: 'error', motivo: err.message, cambios: 0 };
    }
  }

  async function ejecutar() {
    if (enCurso) throw conflicto('Ya hay una lectura de fuentes en curso. Espera a que termine.');
    enCurso = true;
    const iniciado = new Date();
    try {
      const fuentes = await query('SELECT id, nombre, url, selector_css FROM fuentes WHERE activa = TRUE ORDER BY id');
      const cacheRobots = new Map();
      // Dominios distintos avanzan en paralelo; el limitador serializa cada dominio.
      const resultados = await Promise.all(fuentes.map((f) => procesar(f, cacheRobots)));
      const resumen = {
        iniciado_en: iniciado.toISOString(),
        terminado_en: new Date().toISOString(),
        total_fuentes: resultados.length,
        total_cambios: resultados.reduce((s, r) => s + r.cambios, 0),
        fuentes: resultados,
      };
      console.log(
        `[scraper] ${resumen.total_fuentes} fuentes, ${resumen.total_cambios} cambios pendientes nuevos: ` +
          resultados.map((r) => `#${r.id}=${r.estado}`).join(' '),
      );
      return resumen;
    } finally {
      enCurso = false;
    }
  }

  return { ejecutar };
}

let scraperPorDefecto = null;

/** Usado por el endpoint de administración y el job programado. */
export async function ejecutarScraper() {
  scraperPorDefecto ??= crearScraper();
  return scraperPorDefecto.ejecutar();
}
