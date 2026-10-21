import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { cerrarPool } from '../src/db/pool.js';
import { hayBaseDeDatos } from './helpers.js';

afterAll(cerrarPool);

describe('GET /api/salud', () => {
  it('responde ok con el aviso obligatorio', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.aviso).toBe(
      'Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.',
    );
  });

  it.skipIf(!hayBaseDeDatos)('informa que la base de datos responde', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.body.db).toBe('ok');
  });

  it('no expone la cabecera x-powered-by', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
