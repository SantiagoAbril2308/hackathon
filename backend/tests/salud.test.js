import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';

describe('GET /api/salud', () => {
  it('responde ok con el aviso obligatorio', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.aviso).toContain('llama al 123');
  });

  it('no expone la cabecera x-powered-by', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('responde 404 en rutas desconocidas', async () => {
    const res = await request(crearApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
  });
});
