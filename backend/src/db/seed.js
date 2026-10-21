import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { conexionScript } from './pool.js';

const RUTA_SEED = fileURLToPath(new URL('../../db/seed.sql', import.meta.url));
const COSTO_BCRYPT = 12;

function validarAdmin() {
  const { email, password } = env.adminSeed;
  if (!email || !password) {
    throw new Error('Faltan ADMIN_SEED_EMAIL y/o ADMIN_SEED_PASSWORD en backend/.env');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_SEED_EMAIL no tiene formato de correo válido');
  }
  if (password.length < 10) {
    throw new Error('ADMIN_SEED_PASSWORD debe tener al menos 10 caracteres');
  }
}

async function sembrar() {
  if (env.nodeEnv === 'production' && !process.argv.includes('--forzar')) {
    throw new Error('El seed borra los datos y solo carga datos sintéticos. En producción usa --forzar si estás seguro.');
  }
  validarAdmin();

  const conn = await conexionScript();
  try {
    const sql = await readFile(RUTA_SEED, 'utf8');
    await conn.beginTransaction();
    await conn.query(sql);

    const hash = await bcrypt.hash(env.adminSeed.password, COSTO_BCRYPT);
    await conn.query(
      `INSERT INTO admins (nombre, email, password_hash) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      ['Administrador inicial', env.adminSeed.email.toLowerCase(), hash],
    );
    await conn.commit();
    console.log('Seed sintético cargado y administrador inicial creado/actualizado.');
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.end();
  }
}

sembrar().catch((err) => {
  console.error(`Error en el seed: ${err.message}`);
  process.exit(1);
});
