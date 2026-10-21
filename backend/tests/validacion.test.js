import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { escaparLike } from '../src/services/servicios.js';
import { validarValorCanal } from '../src/services/canales.js';
import { hoyColombia } from '../src/utils/fechas.js';

// Estas pruebas fallan antes de llegar a la base de datos: no la necesitan.
const app = crearApp();

describe('validación de entradas públicas (zod)', () => {
  it('rechaza un tema que no existe con detalle en español', async () => {
    const res = await request(app).get('/api/servicios?tema=inventado');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Revisa los datos enviados');
    expect(res.body.detalles[0].campo).toBe('tema');
  });

  it('rechaza ids no numéricos', async () => {
    expect((await request(app).get('/api/servicios/abc')).status).toBe(400);
    expect((await request(app).get('/api/servicios/-3')).status).toBe(400);
  });

  it('rechaza búsquedas de más de 100 caracteres', async () => {
    const res = await request(app).get(`/api/servicios?q=${'a'.repeat(101)}`);
    expect(res.status).toBe(400);
  });

  it('rechaza reportes con motivo inválido o campos extra (no se aceptan datos personales)', async () => {
    const motivo = await request(app).post('/api/reportes').send({ servicio_id: 1, motivo: 'me_cae_mal' });
    expect(motivo.status).toBe(400);
    const extra = await request(app)
      .post('/api/reportes')
      .send({ servicio_id: 1, motivo: 'no_contesta', telefono_persona: '000-000-0000' });
    expect(extra.status).toBe(400);
  });

  it('responde 400 con JSON mal formado', async () => {
    const res = await request(app).post('/api/reportes').set('Content-Type', 'application/json').send('{malo');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/);
  });

  it('responde 404 en rutas desconocidas', async () => {
    expect((await request(app).get('/api/no-existe')).status).toBe(404);
  });
});

describe('protección de administración (JWT)', () => {
  it('pide sesión sin token', async () => {
    const res = await request(app).get('/api/admin/servicios');
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const falso = jwt.sign({ sub: '1' }, 'otro-secreto-que-no-es', { issuer: 'ruta-serena' });
    const res = await request(app).get('/api/admin/servicios').set('Authorization', `Bearer ${falso}`);
    expect(res.status).toBe(401);
  });

  it('rechaza un token vencido', async () => {
    const vencido = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, { issuer: 'ruta-serena', expiresIn: -10 });
    const res = await request(app).post('/api/admin/scraper/ejecutar').set('Authorization', `Bearer ${vencido}`);
    expect(res.status).toBe(401);
  });

  it('rechaza el algoritmo "none"', async () => {
    const sinFirma = jwt.sign({ sub: '1' }, null, { algorithm: 'none', issuer: 'ruta-serena' });
    const res = await request(app).get('/api/admin/servicios').set('Authorization', `Bearer ${sinFirma}`);
    expect(res.status).toBe(401);
  });

  it('valida el cuerpo del login', async () => {
    const res = await request(app).post('/api/admin/login').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
  });
});

describe('cabeceras y límites', () => {
  it('aplica helmet, CORS solo al origen configurado y rate limit', async () => {
    const res = await request(app).get('/api/servicios/abc').set('Origin', 'http://localhost:5173');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['ratelimit-policy'] || res.headers['ratelimit']).toBeDefined();

    const otro = await request(app).get('/api/servicios/abc').set('Origin', 'https://otro-sitio.example');
    expect(otro.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('el límite de reportes bloquea después de 10 por hora', async () => {
    const appLocal = crearApp();
    let ultimo;
    for (let i = 0; i < 11; i += 1) {
      ultimo = await request(appLocal).post('/api/reportes').send({ motivo: 'invalido' });
    }
    expect(ultimo.status).toBe(429);
  });
});

describe('utilidades', () => {
  it('escapa comodines de LIKE', () => {
    expect(escaparLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });

  it('valida valores de canal por tipo', () => {
    expect(() => validarValorCanal('telefono', '000-000-0001')).not.toThrow();
    expect(() => validarValorCanal('telefono', 'llámame')).toThrow();
    expect(() => validarValorCanal('web', 'http://inseguro.example')).toThrow();
    expect(() => validarValorCanal('web', 'https://seguro.example/x')).not.toThrow();
    expect(() => validarValorCanal('email', 'a@b.example')).not.toThrow();
  });

  it('calcula la fecha de Colombia (UTC-5)', () => {
    expect(hoyColombia(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-20');
    expect(hoyColombia(new Date('2026-10-21T06:00:00Z'))).toBe('2026-10-21');
  });
});
