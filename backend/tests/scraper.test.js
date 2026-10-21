import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { cerrarPool, query } from '../src/db/pool.js';
import { crearScraper } from '../src/services/scraper.js';
import { hayBaseDeDatos, reiniciarBase, tokenAdmin } from './helpers.js';

// Servidor local con 2 páginas ficticias. Teléfonos solo en formato sintético 000-000-00XX.
const INTERVALO_PRUEBA_MS = 150;
const paginas = {
  '/robots.txt': 'User-agent: *\nDisallow: /privado\n',
  '/pagina-1': `<html><body>
      <header>Contacto general 000-000-0077 (fuera del selector)</header>
      <div id="lineas">
        <p>Línea Municipal Escucha (ficticia): 000-000-0005</p>
        <p>Centro de Escucha Barzal (ficticio): 000-000-0009</p>
      </div></body></html>`,
  '/pagina-2': `<html><body><section class="oferta">
        <p>Casa Comunitaria La Esperanza (ficticia): 000-000-0011</p>
        <p>Horario: martes y jueves</p>
      </section><script>var x = "000-000-0066";</script></body></html>`,
  '/privado/pagina': '<html><body>No debería leerse 000-000-0055</body></html>',
};

function iniciarServidorFicticio() {
  const solicitudes = [];
  const servidor = http.createServer((req, res) => {
    solicitudes.push({ ruta: req.url, ua: req.headers['user-agent'], t: Date.now() });
    if (req.url === '/redir') {
      res.writeHead(302, { Location: 'http://fuera-de-lista.example/' });
      return res.end();
    }
    const cuerpo = paginas[req.url];
    if (cuerpo === undefined) {
      res.writeHead(404);
      return res.end('no');
    }
    res.writeHead(200, { 'Content-Type': req.url.endsWith('.txt') ? 'text/plain' : 'text/html; charset=utf-8' });
    return res.end(cuerpo);
  });
  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => resolve({ servidor, solicitudes, base: `http://127.0.0.1:${servidor.address().port}` }));
  });
}

const fotoServicios = () =>
  query(`SELECT s.id, s.nombre, s.estado, s.fecha_verificacion, s.updated_at,
                (SELECT GROUP_CONCAT(c.valor ORDER BY c.id) FROM canales c WHERE c.servicio_id = s.id) AS canales
           FROM servicios s ORDER BY s.id`);

describe.skipIf(!hayBaseDeDatos)('scraper contra servidor local (integración)', () => {
  const app = crearApp();
  const scraper = crearScraper({
    listaBlanca: ['127.0.0.1'],
    intervaloMs: INTERVALO_PRUEBA_MS,
    permitirHttp: true,
    aceptarSinteticos: true,
  });
  let local;
  const fuente = {};

  beforeAll(async () => {
    await reiniciarBase();
    local = await iniciarServidorFicticio();
    const crearFuente = async (nombre, ruta, selector) => {
      const r = await query(
        "INSERT INTO fuentes (nombre, entidad, url, dominio, selector_css, activa) VALUES (?, 'Entidad Ficticia', ?, '127.0.0.1', ?, TRUE)",
        [nombre, `${local.base}${ruta}`, selector],
      );
      return r.insertId;
    };
    fuente.p1 = await crearFuente('Página ficticia 1', '/pagina-1', '#lineas');
    fuente.p2 = await crearFuente('Página ficticia 2', '/pagina-2', '.oferta');
    fuente.privada = await crearFuente('Página bloqueada por robots', '/privado/pagina', null);
    await query('UPDATE servicios SET fuente_id = ? WHERE id IN (3, 7)', [fuente.p1]);
    await query('UPDATE servicios SET fuente_id = ? WHERE id = 9', [fuente.p2]);
  });

  afterAll(async () => {
    await new Promise((r) => local.servidor.close(r));
    await cerrarPool();
  });

  const resultadoDe = (resumen, id) => resumen.fuentes.find((f) => f.id === id);

  it('primera lectura: fija la línea base sin proponer cambios', async () => {
    const r = await scraper.ejecutar();
    expect(resultadoDe(r, fuente.p1).estado).toBe('linea_base');
    expect(resultadoDe(r, fuente.p2).estado).toBe('linea_base');
    expect(r.total_cambios).toBe(0);
    const [f] = await query('SELECT ultimo_hash, ultima_lectura FROM fuentes WHERE id = ?', [fuente.p1]);
    expect(f.ultimo_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(f.ultima_lectura).not.toBeNull();
  });

  it('respeta robots.txt y la lista blanca (sin tocar dominios no permitidos)', async () => {
    const r = await scraper.ejecutar();
    expect(resultadoDe(r, fuente.privada)).toMatchObject({ estado: 'omitida', motivo: expect.stringMatching(/robots/) });
    for (const id of [1, 2, 3]) {
      expect(resultadoDe(r, id)).toMatchObject({ estado: 'omitida', motivo: expect.stringMatching(/lista blanca/) });
    }
    expect(local.solicitudes.some((s) => s.ruta.startsWith('/privado'))).toBe(false);
  });

  it('se identifica como RutaSerenaBot/1.0 y espera entre solicitudes al mismo dominio', () => {
    expect(local.solicitudes.length).toBeGreaterThan(0);
    expect(local.solicitudes.every((s) => s.ua === 'RutaSerenaBot/1.0')).toBe(true);
    const tiempos = local.solicitudes.map((s) => s.t);
    for (let i = 1; i < tiempos.length; i += 1) {
      expect(tiempos[i] - tiempos[i - 1]).toBeGreaterThanOrEqual(INTERVALO_PRUEBA_MS - 10);
    }
  });

  it('CP-03: un teléfono cambiado crea un cambio pendiente y NO se publica', async () => {
    const antes = await fotoServicios();
    paginas['/pagina-1'] = paginas['/pagina-1'].replace('000-000-0005', '000-000-0099');

    const r = await scraper.ejecutar();
    expect(resultadoDe(r, fuente.p1)).toMatchObject({ estado: 'con_cambios', cambios: 1 });

    const cambios = await query('SELECT * FROM cambios_pendientes WHERE fuente_id = ?', [fuente.p1]);
    expect(cambios).toHaveLength(1);
    expect(cambios[0]).toMatchObject({
      servicio_id: 3,
      campo: 'telefono',
      valor_anterior: '000-000-0005',
      valor_nuevo: '000-000-0099',
      estado: 'pendiente',
      prioridad: 2,
    });
    expect(cambios[0].hash).toMatch(/^[a-f0-9]{64}$/);

    // Nada publicado: servicios y canales idénticos, y la API sigue mostrando el número anterior.
    expect(await fotoServicios()).toEqual(antes);
    const publico = await request(app).get('/api/servicios/3');
    expect(publico.body.canales.map((c) => c.valor)).toContain('000-000-0005');
    expect(publico.body.canales.map((c) => c.valor)).not.toContain('000-000-0099');
  });

  it('ignora lo que está fuera del selector_css y dentro de <script>', async () => {
    const valores = (await query('SELECT valor_nuevo FROM cambios_pendientes')).map((c) => c.valor_nuevo);
    expect(valores).not.toContain('000-000-0077');
    expect(valores).not.toContain('000-000-0066');
  });

  it('si la página no vuelve a cambiar, no repite el cambio', async () => {
    const r = await scraper.ejecutar();
    expect(resultadoDe(r, fuente.p1)).toMatchObject({ estado: 'sin_cambios', cambios: 0 });
    expect(await query('SELECT id FROM cambios_pendientes WHERE fuente_id = ?', [fuente.p1])).toHaveLength(1);
  });

  it('un cambio de texto sin teléfonos nuevos propone revisar el bloque', async () => {
    paginas['/pagina-2'] = paginas['/pagina-2'].replace('martes y jueves', 'solo los sábados');
    const r = await scraper.ejecutar();
    expect(resultadoDe(r, fuente.p2)).toMatchObject({ estado: 'con_cambios', cambios: 1 });
    const [c] = await query('SELECT campo, valor_nuevo FROM cambios_pendientes WHERE fuente_id = ?', [fuente.p2]);
    expect(c.campo).toBe('bloque');
    expect(c.valor_nuevo).toContain('solo los sábados');
  });

  it('el número nuevo solo se publica cuando un administrador aprueba el cambio', async () => {
    const [cambio] = await query('SELECT id FROM cambios_pendientes WHERE fuente_id = ?', [fuente.p1]);
    const token = await tokenAdmin(app);
    const res = await request(app).post(`/api/admin/cambios/${cambio.id}/aprobar`).set('Authorization', `Bearer ${token}`);
    expect(res.body.aplicado).toBe(true);
    const publico = await request(app).get('/api/servicios/3');
    expect(publico.body.canales.map((c) => c.valor)).toContain('000-000-0099');
  });

  it('no permite dos lecturas al mismo tiempo', async () => {
    const [a, b] = await Promise.allSettled([scraper.ejecutar(), scraper.ejecutar()]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('rejected');
    expect(b.reason.status).toBe(409);
  });

  it('bloquea redirecciones hacia dominios fuera de la lista blanca', async () => {
    const r1 = await query(
      "INSERT INTO fuentes (nombre, entidad, url, dominio, activa) VALUES ('Redirección', 'Entidad Ficticia', ?, '127.0.0.1', TRUE)",
      [`${local.base}/redir`],
    );
    const r = await scraper.ejecutar();
    expect(resultadoDe(r, r1.insertId)).toMatchObject({ estado: 'error', motivo: expect.stringMatching(/redirección bloqueada/) });
  });
});
