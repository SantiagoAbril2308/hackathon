import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { cerrarPool, query } from '../src/db/pool.js';
import { hoyColombia } from '../src/utils/fechas.js';
import { hayBaseDeDatos, reiniciarBase, tokenAdmin } from './helpers.js';

const servicioFicticio = {
  nombre: 'Servicio de prueba Ruta Serena (ficticio)',
  descripcion: 'Creado por las pruebas automáticas.',
  tipo: 'presencial',
  temas: ['general'],
  publico: ['adultos'],
  modalidad: ['presencial'],
  cobertura: 'Villavicencio',
  horario: 'Lunes a viernes',
  costo: 'Gratuito',
  direccion: 'Dirección ficticia',
  lat: 4.142,
  lng: -73.627,
  fuente_id: 3,
  es_sintetico: true,
};

describe.skipIf(!hayBaseDeDatos)('API de administración (integración con TiDB, datos sintéticos)', () => {
  let ejecutado = false;
  const app = crearApp({
    ejecutarScraper: async () => {
      ejecutado = true;
      return { ok: true, fuentes: 0, cambios: 0 };
    },
  });
  let token;
  const conToken = (req) => req.set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    await reiniciarBase();
    token = await tokenAdmin(app);
  });
  afterAll(cerrarPool);

  describe('login', () => {
    it('rechaza credenciales incorrectas con un mensaje genérico', async () => {
      const malo = await request(app).post('/api/admin/login').send({ email: env.adminSeed.email, password: 'test-secret-incorrecta' });
      const noExiste = await request(app).post('/api/admin/login').send({ email: 'nadie@ruta-serena.example', password: 'x' });
      expect(malo.status).toBe(401);
      expect(noExiste.status).toBe(401);
      expect(malo.body.error).toBe(noExiste.body.error);
    });

    it('entrega un JWT y no devuelve el hash', async () => {
      const res = await request(app).post('/api/admin/login').send({ email: env.adminSeed.email.toUpperCase(), password: env.adminSeed.password });
      expect(res.status).toBe(200);
      expect(res.body.token.split('.')).toHaveLength(3);
      expect(JSON.stringify(res.body)).not.toMatch(/password|hash/);
    });
  });

  describe('servicios', () => {
    it('lista los 20 servicios con prioridad y marca los vencidos', async () => {
      const res = await conToken(request(app).get('/api/admin/servicios'));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(20);
      const s17 = res.body.servicios.find((s) => s.id === 17);
      expect(s17).toMatchObject({ estado: 'vigente', estado_publico: 'en_revision', vencido: true, prioridad: 0 });
    });

    it('no permite crear un servicio vigente sin fuente ni fecha', async () => {
      const res = await conToken(request(app).post('/api/admin/servicios')).send({ ...servicioFicticio, estado: 'vigente' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/url_fuente y fecha_verificacion/);
    });

    it('no acepta fechas de verificación en el futuro ni fuentes http', async () => {
      const futuro = await conToken(request(app).post('/api/admin/servicios')).send({
        ...servicioFicticio,
        url_fuente: 'https://fuente-ficticia-villavicencio.example/x',
        fecha_verificacion: '2999-01-01',
      });
      expect(futuro.status).toBe(400);
      const http = await conToken(request(app).post('/api/admin/servicios')).send({ ...servicioFicticio, url_fuente: 'http://inseguro.example' });
      expect(http.status).toBe(400);
    });

    it('crea (en_revision por defecto), publica, edita y retira un servicio', async () => {
      const creado = await conToken(request(app).post('/api/admin/servicios')).send(servicioFicticio);
      expect(creado.status).toBe(201);
      expect(creado.body.estado).toBe('en_revision');
      const id = creado.body.id;
      expect((await request(app).get('/api/servicios')).body.servicios.map((s) => s.id)).not.toContain(id);

      const publicado = await conToken(request(app).put(`/api/admin/servicios/${id}`)).send({
        estado: 'vigente',
        url_fuente: 'https://fuente-ficticia-villavicencio.example/orientacion#prueba',
        fecha_verificacion: hoyColombia(),
      });
      expect(publicado.status).toBe(200);
      expect(publicado.body.estado_publico).toBe('vigente');
      expect((await request(app).get(`/api/servicios/${id}`)).body.estado).toBe('vigente');

      const editado = await conToken(request(app).put(`/api/admin/servicios/${id}`)).send({ horario: 'Sábados' });
      expect(editado.body.horario).toBe('Sábados');

      const retirado = await conToken(request(app).delete(`/api/admin/servicios/${id}`));
      expect(retirado.body.estado).toBe('retirado');
      expect((await request(app).get(`/api/servicios/${id}`)).status).toBe(404);
    });

    it('rechaza una fuente inexistente', async () => {
      const res = await conToken(request(app).post('/api/admin/servicios')).send({ ...servicioFicticio, fuente_id: 9999 });
      expect(res.status).toBe(400);
    });

    it('verificar: un servicio vencido vuelve a estar vigente con fecha de hoy y queda en el historial', async () => {
      const res = await conToken(request(app).post('/api/admin/servicios/17/verificar')).send({
        resultado: 'confirmado',
        nota: 'Revisado contra la fuente ficticia',
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: 'vigente', estado_publico: 'vigente', fecha_verificacion: hoyColombia(), prioridad: 0 });
      const historial = await query('SELECT resultado, admin_id FROM verificaciones WHERE servicio_id = 17');
      expect(historial).toHaveLength(1);
      expect(historial[0].resultado).toBe('confirmado');
      expect((await request(app).get('/api/servicios')).body.servicios.map((s) => s.id)).toContain(17);
    });

    it('verificar con resultado retirado lo saca del directorio', async () => {
      const res = await conToken(request(app).post('/api/admin/servicios/19/verificar')).send({ resultado: 'retirado' });
      expect(res.body.estado).toBe('retirado');
    });
  });

  describe('canales', () => {
    it('crea, edita, lista y elimina un canal validando el valor', async () => {
      const invalido = await conToken(request(app).post('/api/admin/canales')).send({ servicio_id: 3, tipo: 'telefono', valor: 'llamar' });
      expect(invalido.status).toBe(400);

      const creado = await conToken(request(app).post('/api/admin/canales')).send({ servicio_id: 3, tipo: 'whatsapp', valor: '000-000-0090' });
      expect(creado.status).toBe(201);

      const editado = await conToken(request(app).put(`/api/admin/canales/${creado.body.id}`)).send({ valor: '000-000-0091' });
      expect(editado.body.valor).toBe('000-000-0091');

      const lista = await conToken(request(app).get('/api/admin/canales?servicio_id=3'));
      expect(lista.body.canales.map((c) => c.id)).toContain(creado.body.id);

      const borrado = await conToken(request(app).delete(`/api/admin/canales/${creado.body.id}`));
      expect(borrado.status).toBe(204);
    });
  });

  describe('fuentes', () => {
    it('crea una fuente derivando el dominio, la edita y la desactiva', async () => {
      const creada = await conToken(request(app).post('/api/admin/fuentes')).send({
        nombre: 'Fuente de prueba (ficticia)',
        entidad: 'Entidad Ficticia',
        url: 'https://otra-fuente-ficticia.example/servicios',
        selector_css: '#lista',
      });
      expect(creada.status).toBe(201);
      expect(creada.body).toMatchObject({ dominio: 'otra-fuente-ficticia.example', activa: true });

      const editada = await conToken(request(app).put(`/api/admin/fuentes/${creada.body.id}`)).send({ url: 'https://nueva-fuente.example/x' });
      expect(editada.body.dominio).toBe('nueva-fuente.example');

      const desactivada = await conToken(request(app).delete(`/api/admin/fuentes/${creada.body.id}`));
      expect(desactivada.body.activa).toBe(false);

      const lista = await conToken(request(app).get('/api/admin/fuentes'));
      expect(lista.body.fuentes.length).toBe(4);
    });
  });

  describe('cambios pendientes', () => {
    let aplicable;
    let manual;

    beforeAll(async () => {
      const r1 = await query(
        `INSERT INTO cambios_pendientes (fuente_id, servicio_id, campo, valor_anterior, valor_nuevo, hash, prioridad)
         VALUES (3, 3, 'telefono', '000-000-0005', '000-000-0095', ?, 2)`,
        ['a'.repeat(64)],
      );
      const r2 = await query(
        `INSERT INTO cambios_pendientes (fuente_id, servicio_id, campo, valor_anterior, valor_nuevo, hash)
         VALUES (1, NULL, 'bloque', 'texto anterior', 'texto nuevo', ?)`,
        ['b'.repeat(64)],
      );
      aplicable = r1.insertId;
      manual = r2.insertId;
    });

    it('lista los pendientes ordenados por prioridad', async () => {
      const res = await conToken(request(app).get('/api/admin/cambios'));
      expect(res.body.cambios.map((c) => c.id)).toEqual([aplicable, manual]);
    });

    it('aprobar aplica el teléfono nuevo al canal y registra la verificación', async () => {
      const res = await conToken(request(app).post(`/api/admin/cambios/${aplicable}/aprobar`));
      expect(res.status).toBe(200);
      expect(res.body.aplicado).toBe(true);
      const [canal] = await query('SELECT valor FROM canales WHERE id = 6');
      expect(canal.valor).toBe('000-000-0095');

      const otraVez = await conToken(request(app).post(`/api/admin/cambios/${aplicable}/aprobar`));
      expect(otraVez.status).toBe(409);
    });

    it('rechazar no modifica nada', async () => {
      const res = await conToken(request(app).post(`/api/admin/cambios/${manual}/rechazar`));
      expect(res.body.estado).toBe('rechazado');
      const pendientes = await conToken(request(app).get('/api/admin/cambios'));
      expect(pendientes.body.total).toBe(0);
    });
  });

  it('reportes: resumen por servicio y recientes', async () => {
    await request(app).post('/api/reportes').send({ servicio_id: 8, motivo: 'enlace_caido' });
    const res = await conToken(request(app).get('/api/admin/reportes'));
    expect(res.status).toBe(200);
    expect(res.body.resumen.find((r) => r.servicio_id === 8)).toMatchObject({ total: 1, enlace_caido: 1, prioridad: 1 });
    expect(res.body.recientes[0].servicio_id).toBe(8);
  });

  describe('actividades', () => {
    it('lista pendientes, aprueba la 4 y rechaza la 1', async () => {
      const pendientes = await conToken(request(app).get('/api/admin/actividades?estado=pendiente'));
      expect(pendientes.body.actividades.map((a) => a.id)).toEqual([4]);

      await conToken(request(app).post('/api/admin/actividades/4/aprobar'));
      await conToken(request(app).post('/api/admin/actividades/1/rechazar'));

      const publicas = await request(app).get('/api/actividades');
      expect(publicas.body.actividades.map((a) => a.id)).toEqual([2, 3, 4]);
    });

    it('responde 404 con una actividad inexistente', async () => {
      expect((await conToken(request(app).post('/api/admin/actividades/9999/aprobar'))).status).toBe(404);
    });
  });

  it('scraper/ejecutar invoca el scraper con sesión', async () => {
    const res = await conToken(request(app).post('/api/admin/scraper/ejecutar'));
    expect(res.status).toBe(200);
    expect(ejecutado).toBe(true);
  });
});
