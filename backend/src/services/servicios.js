import { query, conTransaccion } from '../db/pool.js';
import { env } from '../config/env.js';
import { HttpError, noEncontrado, solicitudInvalida } from '../utils/httpError.js';
import { hoyColombia } from '../utils/fechas.js';

/**
 * Regla única de vigencia: estado 'vigente' + url_fuente + fecha_verificacion dentro de DIAS_VIGENCIA.
 * Recibe un parámetro: los días de vigencia.
 */
export const CONDICION_VIGENTE = `(s.estado = 'vigente'
  AND s.url_fuente IS NOT NULL AND s.url_fuente <> ''
  AND s.fecha_verificacion IS NOT NULL
  AND s.fecha_verificacion >= DATE_SUB(CURDATE(), INTERVAL ? DAY))`;

const COLUMNAS = `s.id, s.nombre, s.descripcion, s.tipo, s.temas, s.publico, s.modalidad, s.cobertura,
  s.horario, s.costo, s.direccion, s.lat, s.lng, s.fuente_id, s.url_fuente, s.fecha_verificacion,
  s.verificado_por, s.estado, s.es_emergencia, s.orden, s.prioridad, s.es_sintetico, s.created_at,
  s.updated_at, f.nombre AS fuente_nombre, f.entidad AS fuente_entidad`;

const DESDE = 'FROM servicios s LEFT JOIN fuentes f ON f.id = s.fuente_id';

const CAMPOS_JSON = ['temas', 'publico', 'modalidad'];
const CAMPOS_ESCRIBIBLES = [
  'nombre', 'descripcion', 'tipo', 'temas', 'publico', 'modalidad', 'cobertura', 'horario', 'costo',
  'direccion', 'lat', 'lng', 'fuente_id', 'url_fuente', 'fecha_verificacion', 'estado', 'es_emergencia',
  'orden', 'es_sintetico',
];

const MENSAJE_EN_REVISION =
  'Estamos revisando que esta información siga vigente. Mientras tanto, si necesitas apoyo inmediato, llama al 123.';

// ------------------------------------------------------------------ utilidades
function listaJson(valor) {
  if (valor == null) return [];
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return [];
    }
  }
  return valor;
}
const numero = (v) => (v == null ? null : Number(v));
const booleano = (v) => Boolean(Number(v));

export function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function estadoPublico(fila) {
  if (booleano(fila.es_vigente)) return 'vigente';
  return fila.estado === 'retirado' ? 'retirado' : 'en_revision';
}

export function aPublico(fila, canales = []) {
  const estado = estadoPublico(fila);
  const servicio = {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    tipo: fila.tipo,
    temas: listaJson(fila.temas),
    publico: listaJson(fila.publico),
    modalidad: listaJson(fila.modalidad),
    cobertura: fila.cobertura,
    horario: fila.horario,
    costo: fila.costo,
    direccion: fila.direccion,
    lat: numero(fila.lat),
    lng: numero(fila.lng),
    fuente: fila.fuente_id ? { id: fila.fuente_id, nombre: fila.fuente_nombre, entidad: fila.fuente_entidad } : null,
    url_fuente: fila.url_fuente,
    fecha_verificacion: fila.fecha_verificacion,
    estado,
    es_emergencia: booleano(fila.es_emergencia),
    orden: fila.orden,
    es_sintetico: booleano(fila.es_sintetico),
    canales,
  };
  if (estado === 'en_revision') servicio.mensaje_estado = MENSAJE_EN_REVISION;
  return servicio;
}

export function aAdmin(fila, canales = []) {
  return {
    ...aPublico(fila, canales),
    estado: fila.estado,
    estado_publico: estadoPublico(fila),
    vencido: fila.estado === 'vigente' && !booleano(fila.es_vigente),
    verificado_por: fila.verificado_por,
    prioridad: fila.prioridad,
    created_at: fila.created_at,
    updated_at: fila.updated_at,
  };
}

async function canalesPorServicio(ids) {
  const mapa = new Map(ids.map((id) => [id, []]));
  if (!ids.length) return mapa;
  const filas = await query(
    `SELECT id, servicio_id, tipo, valor, etiqueta FROM canales
      WHERE servicio_id IN (?)
      ORDER BY FIELD(tipo, 'telefono', 'whatsapp', 'web', 'email'), id`,
    [ids],
  );
  for (const c of filas) {
    mapa.get(c.servicio_id)?.push({ id: c.id, tipo: c.tipo, valor: c.valor, etiqueta: c.etiqueta });
  }
  return mapa;
}

async function conCanales(filas, convertir) {
  const canales = await canalesPorServicio(filas.map((f) => f.id));
  return filas.map((f) => convertir(f, canales.get(f.id)));
}

// ------------------------------------------------------------------ públicos
export async function listarVigentes({ tema, publico, modalidad, q } = {}) {
  const where = [CONDICION_VIGENTE];
  const params = [env.diasVigencia];
  if (tema) {
    where.push('JSON_CONTAINS(s.temas, JSON_QUOTE(?))');
    params.push(tema);
  }
  if (publico) {
    where.push('JSON_CONTAINS(s.publico, JSON_QUOTE(?))');
    params.push(publico);
  }
  if (modalidad) {
    where.push('JSON_CONTAINS(s.modalidad, JSON_QUOTE(?))');
    params.push(modalidad);
  }
  if (q) {
    const like = `%${escaparLike(q)}%`;
    where.push('(s.nombre LIKE ? OR s.descripcion LIKE ? OR s.cobertura LIKE ? OR s.direccion LIKE ?)');
    params.push(like, like, like, like);
  }
  const filas = await query(
    `SELECT ${COLUMNAS}, 1 AS es_vigente ${DESDE}
      WHERE ${where.join(' AND ')}
      ORDER BY s.es_emergencia DESC, s.orden ASC, s.nombre ASC
      LIMIT 200`,
    params,
  );
  return conCanales(filas, aPublico);
}

/**
 * Prefiltro del asistente: hasta `limite` servicios vigentes de los temas indicados, priorizando
 * el público y la modalidad mencionados. Si no hay ninguno, devuelve los de tema 'general'.
 */
export async function buscarParaChat({ temas = [], publico, modalidad, limite = 8 } = {}) {
  const consultar = async (listaTemas) => {
    const params = [env.diasVigencia, ...listaTemas];
    const orden = [];
    if (publico) {
      orden.push('JSON_CONTAINS(s.publico, JSON_QUOTE(?)) DESC');
      params.push(publico);
    }
    if (modalidad) {
      orden.push('JSON_CONTAINS(s.modalidad, JSON_QUOTE(?)) DESC');
      params.push(modalidad);
    }
    params.push(limite);
    return query(
      `SELECT ${COLUMNAS}, 1 AS es_vigente ${DESDE}
        WHERE ${CONDICION_VIGENTE}
          AND (${listaTemas.map(() => 'JSON_CONTAINS(s.temas, JSON_QUOTE(?))').join(' OR ')})
        ORDER BY ${[...orden, 's.es_emergencia ASC', 's.orden ASC', 's.nombre ASC'].join(', ')}
        LIMIT ?`,
      params,
    );
  };
  let filas = temas.length ? await consultar(temas) : [];
  if (!filas.length) filas = await consultar(['general']);
  return conCanales(filas, aPublico);
}

export async function obtenerPublico(id) {
  const [fila] = await query(
    `SELECT ${COLUMNAS}, ${CONDICION_VIGENTE} AS es_vigente ${DESDE}
      WHERE s.id = ? AND s.estado <> 'retirado'`,
    [env.diasVigencia, id],
  );
  if (!fila) throw noEncontrado('No encontramos este servicio');
  const [servicio] = await conCanales([fila], aPublico);
  return servicio;
}

/** Servicios de emergencia (no retirados) ordenados por `orden`, con su estado público calculado. */
export async function listarEmergencia() {
  const filas = await query(
    `SELECT ${COLUMNAS}, ${CONDICION_VIGENTE} AS es_vigente ${DESDE}
      WHERE s.es_emergencia = TRUE AND s.estado <> 'retirado'
      ORDER BY s.orden ASC, s.id ASC`,
    [env.diasVigencia],
  );
  return conCanales(filas, aPublico);
}

// ------------------------------------------------------------------ administración
export async function adminListar({ estado, q } = {}) {
  const where = ['1 = 1'];
  const params = [env.diasVigencia];
  if (estado) {
    where.push('s.estado = ?');
    params.push(estado);
  }
  if (q) {
    const like = `%${escaparLike(q)}%`;
    where.push('(s.nombre LIKE ? OR s.descripcion LIKE ?)');
    params.push(like, like);
  }
  const filas = await query(
    `SELECT ${COLUMNAS}, ${CONDICION_VIGENTE} AS es_vigente ${DESDE}
      WHERE ${where.join(' AND ')}
      ORDER BY s.prioridad DESC, s.fecha_verificacion ASC, s.id ASC`,
    params,
  );
  return conCanales(filas, aAdmin);
}

export async function adminObtener(id) {
  const [fila] = await query(`SELECT ${COLUMNAS}, ${CONDICION_VIGENTE} AS es_vigente ${DESDE} WHERE s.id = ?`, [
    env.diasVigencia,
    id,
  ]);
  if (!fila) throw noEncontrado('No encontramos este servicio');
  const [servicio] = await conCanales([fila], aAdmin);
  return servicio;
}

/** Reglas que no puede expresar zod porque dependen del registro completo. */
function validarReglas(datos) {
  if (datos.estado === 'vigente' && (!datos.url_fuente || !datos.fecha_verificacion)) {
    throw solicitudInvalida('Un servicio solo puede estar vigente si tiene url_fuente y fecha_verificacion');
  }
  if (datos.fecha_verificacion && datos.fecha_verificacion > hoyColombia()) {
    throw solicitudInvalida('La fecha de verificación no puede estar en el futuro');
  }
}

function valorColumna(campo, valor) {
  if (CAMPOS_JSON.includes(campo)) return JSON.stringify(valor);
  return valor ?? null;
}

export async function crear(datos) {
  validarReglas(datos);
  const campos = CAMPOS_ESCRIBIBLES.filter((c) => datos[c] !== undefined);
  const resultado = await query(
    `INSERT INTO servicios (${campos.map((c) => `\`${c}\``).join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    campos.map((c) => valorColumna(c, datos[c])),
  );
  return adminObtener(resultado.insertId);
}

export async function actualizar(id, cambios) {
  const actual = await adminObtener(id);
  validarReglas({ ...actual, ...cambios });
  const campos = CAMPOS_ESCRIBIBLES.filter((c) => cambios[c] !== undefined);
  await query(`UPDATE servicios SET ${campos.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [
    ...campos.map((c) => valorColumna(c, cambios[c])),
    id,
  ]);
  return adminObtener(id);
}

/** Borrado lógico: el servicio pasa a 'retirado' y queda registrado en verificaciones. */
export async function retirar(id, admin) {
  await conTransaccion(async (conn) => {
    const [r] = await conn.query("UPDATE servicios SET estado = 'retirado' WHERE id = ?", [id]);
    if (!r.affectedRows) throw noEncontrado('No encontramos este servicio');
    await conn.query(
      "INSERT INTO verificaciones (servicio_id, admin_id, resultado, nota) VALUES (?, ?, 'retirado', ?)",
      [id, admin.id, 'Retirado desde administración'],
    );
  });
  return adminObtener(id);
}

export async function verificar(id, admin, { resultado, nota, url_fuente }) {
  await conTransaccion(async (conn) => {
    const [[actual]] = await conn.query('SELECT id, url_fuente FROM servicios WHERE id = ? FOR UPDATE', [id]);
    if (!actual) throw noEncontrado('No encontramos este servicio');
    const url = url_fuente ?? actual.url_fuente;
    if (resultado !== 'retirado' && !url) {
      throw new HttpError(400, 'Para confirmar un servicio indica la url_fuente oficial donde lo verificaste');
    }
    const estado = resultado === 'retirado' ? 'retirado' : 'vigente';
    await conn.query(
      `UPDATE servicios
          SET estado = ?, fecha_verificacion = CURDATE(), verificado_por = ?, url_fuente = ?, prioridad = 0
        WHERE id = ?`,
      [estado, admin.nombre || admin.email, url, id],
    );
    await conn.query('INSERT INTO verificaciones (servicio_id, admin_id, resultado, nota) VALUES (?, ?, ?, ?)', [
      id,
      admin.id,
      resultado,
      nota ?? null,
    ]);
  });
  return adminObtener(id);
}
