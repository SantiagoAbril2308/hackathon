import { DB_PRUEBAS } from './constantes.js';

/** Crea/actualiza el esquema de la base de pruebas una sola vez por ejecución. */
export default async function prepararBaseDePruebas() {
  process.env.DB_NAME = DB_PRUEBAS;
  const { env } = await import('../../src/config/env.js');
  if (!env.db.host) {
    console.warn('[pruebas] Sin DB_HOST en backend/.env: se omiten las pruebas de integración.');
    return;
  }
  if (env.db.name !== DB_PRUEBAS) {
    throw new Error(`Las pruebas solo pueden usar la base "${DB_PRUEBAS}"`);
  }
  const { migrarBase } = await import('../../src/db/operaciones.js');
  await migrarBase();
}
