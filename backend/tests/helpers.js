import request from 'supertest';
import { env } from '../src/config/env.js';
import { sembrarBase } from '../src/db/operaciones.js';
import { DB_PRUEBAS } from './setup/constantes.js';

export const hayBaseDeDatos = Boolean(env.db.host);

/** Vuelve a cargar el seed sintético en la base de pruebas. */
export async function reiniciarBase() {
  if (env.db.name !== DB_PRUEBAS) {
    throw new Error(`Protección: las pruebas solo reinician "${DB_PRUEBAS}", no "${env.db.name}"`);
  }
  await sembrarBase();
}

export async function tokenAdmin(app) {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ email: env.adminSeed.email, password: env.adminSeed.password });
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión en pruebas: ${res.status}`);
  return res.body.token;
}
