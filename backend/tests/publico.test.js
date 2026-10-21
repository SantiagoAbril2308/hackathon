import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { cerrarPool, query } from '../src/db/pool.js';
import { hayBaseDeDatos, reiniciarBase } from './helpers.js';

// Seed: ids 1–16 vigentes y al día; 17, 18 y 19 'vigente' pero vencidos; 20 'en_revision'.
const VIGENTES = Array.from({ length: 16 }, (_, i) => i + 1);
const NO_VISIBLES = [17, 18, 19, 20];

describe.skipIf(!hayBaseDeDatos)('API pública (integración con TiDB, datos sintéticos)', () => {
  const app = crearApp();

  beforeAll(reiniciarBase);
  afterAll(cerrarPool);

  describe('GET /api/servicios', () => {
    it('CP-01: solo vigentes, cada uno con url_fuente, fecha_verificacion y canales', async () => {
      const res = await request(app).get('/api/servicios');
      expect(res.status).toBe(200);
      const ids = res.body.servicios.map((s) => s.id);
      expect(ids.sort((a, b) => a - b)).toEqual(VIGENTES);
      for (const id of NO_VISIBLES) expect(ids).not.toContain(id);

      for (const s of res.body.servicios) {
        expect(s.estado).toBe('vigente');
        expect(s.url_fuente).toMatch(/^https:\/\//);
        expect(s.fecha_verificacion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(s.canales.length).toBeGreaterThan(0);
        expect(s.es_sintetico).toBe(true);
        expect(s).not.toHaveProperty('prioridad');
      }
      expect(res.body.aviso).toContain('llama al 123');
    });

    it('pone primero los servicios de emergencia', async () => {
      const res = await request(app).get('/api/servicios');
      expect(res.body.servicios.slice(0, 2).map((s) => s.id)).toEqual([1, 2]);
    });

    it('filtra por tema', async () => {
      const res = await request(app).get('/api/servicios?tema=duelo');
      const ids = res.body.servicios.map((s) => s.id);
      expect(ids).toEqual(expect.arrayContaining([3, 9, 15]));
      expect(ids).not.toContain(18); // también es de duelo, pero está vencido
      for (const s of res.body.servicios) expect(s.temas).toContain('duelo');
    });

    it('filtra por público y modalidad combinados', async () => {
      const res = await request(app).get('/api/servicios?publico=jovenes&modalidad=chat');
      const ids = res.body.servicios.map((s) => s.id);
      expect(ids).toEqual(expect.arrayContaining([1, 4, 6, 16]));
      for (const s of res.body.servicios) {
        expect(s.publico).toContain('jovenes');
        expect(s.modalidad).toContain('chat');
      }
    });

    it('busca por texto sin distinguir tildes ni mayúsculas', async () => {
      const res = await request(app).get('/api/servicios?q=BARZAL');
      expect(res.body.servicios.map((s) => s.id)).toEqual([7]);
      const tildes = await request(app).get('/api/servicios?q=porfia');
      expect(tildes.body.servicios.map((s) => s.id)).toEqual([10]);
    });

    it('trata los comodines como texto literal', async () => {
      const res = await request(app).get('/api/servicios?q=%25');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it('acepta filtros vacíos (?tema=&publico=)', async () => {
      const res = await request(app).get('/api/servicios?tema=&publico=&modalidad=&q=');
      expect(res.body.total).toBe(16);
    });
  });

  describe('GET /api/servicios/:id', () => {
    it('devuelve un servicio vigente con sus canales y su fuente', async () => {
      const res = await request(app).get('/api/servicios/1');
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('vigente');
      expect(res.body.fuente.entidad).toMatch(/Ficticio/);
      expect(res.body.canales.map((c) => c.tipo)).toEqual(['telefono', 'whatsapp', 'web']);
    });

    it('CP-02: un servicio vencido aparece "en_revision" aunque en la base diga vigente', async () => {
      const res = await request(app).get('/api/servicios/18');
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('en_revision');
      expect(res.body.mensaje_estado).toMatch(/123/);
    });

    it('responde 404 si no existe', async () => {
      expect((await request(app).get('/api/servicios/99999')).status).toBe(404);
    });
  });

  it('GET /api/emergencia: servicios de emergencia ordenados y la línea 123', async () => {
    const res = await request(app).get('/api/emergencia');
    expect(res.status).toBe(200);
    expect(res.body.linea_123.numero).toBe('123');
    expect(res.body.servicios.map((s) => s.id)).toEqual([1, 2]);
    expect(res.body.servicios.every((s) => s.es_emergencia)).toBe(true);
  });

  it('GET /api/directorio.json: copia de lo vigente con generado_en', async () => {
    const res = await request(app).get('/api/directorio.json');
    expect(res.status).toBe(200);
    expect(new Date(res.body.generado_en).toString()).not.toBe('Invalid Date');
    expect(res.body.servicios).toHaveLength(16);
    expect(res.body.emergencia.map((s) => s.id)).toEqual([1, 2]);
    expect(res.headers['cache-control']).toMatch(/max-age=300/);
  });

  it('GET /api/actividades: solo aprobadas', async () => {
    const res = await request(app).get('/api/actividades');
    expect(res.status).toBe(200);
    expect(res.body.actividades.map((a) => a.id)).toEqual([1, 2, 3]);
    expect(res.body.actividades[0]).not.toHaveProperty('estado');
  });

  describe('POST /api/reportes', () => {
    it('CP-11: cada reporte sube la prioridad; con 3 el servicio pasa a en_revision', async () => {
      const reportar = () => request(app).post('/api/reportes').send({ servicio_id: 15, canal_id: 22, motivo: 'no_contesta' });

      const primero = await reportar();
      expect(primero.status).toBe(201);
      expect(primero.body.en_revision).toBe(false);
      let [s] = await query('SELECT prioridad, estado FROM servicios WHERE id = 15');
      expect(s).toEqual({ prioridad: 1, estado: 'vigente' });

      await reportar();
      const tercero = await reportar();
      expect(tercero.body.en_revision).toBe(true);
      [s] = await query('SELECT prioridad, estado FROM servicios WHERE id = 15');
      expect(s).toEqual({ prioridad: 3, estado: 'en_revision' });

      const lista = await request(app).get('/api/servicios');
      expect(lista.body.servicios.map((x) => x.id)).not.toContain(15);
    });

    it('no guarda nada que identifique a quien reporta', async () => {
      const columnas = await query('SHOW COLUMNS FROM reportes');
      expect(columnas.map((c) => c.Field).sort()).toEqual(['canal_id', 'created_at', 'id', 'motivo', 'servicio_id']);
    });

    it('rechaza un canal que no pertenece al servicio', async () => {
      const res = await request(app).post('/api/reportes').send({ servicio_id: 1, canal_id: 22, motivo: 'numero_errado' });
      expect(res.status).toBe(400);
    });

    it('responde 404 si el servicio no existe', async () => {
      const res = await request(app).post('/api/reportes').send({ servicio_id: 99999, motivo: 'otro' });
      expect(res.status).toBe(404);
    });
  });
});
