import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { conexionScript } from './pool.js';

const RUTA_SCHEMA = fileURLToPath(new URL('../../db/schema.sql', import.meta.url));
const RUTA_SEED = fileURLToPath(new URL('../../db/seed.sql', import.meta.url));
const COSTO_BCRYPT = 12;

/** Crea la base (si no existe) y aplica schema.sql. Devuelve los nombres de las tablas. */
export async function migrarBase() {
  const conn = await conexionScript({ sinBase: true });
  try {
    const nombre = env.db.name;
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.query(`USE \`${nombre}\``);
    await conn.query(await readFile(RUTA_SCHEMA, 'utf8'));
    const [tablas] = await conn.query('SHOW TABLES');
    return tablas.map((t) => Object.values(t)[0]);
  } finally {
    await conn.end();
  }
}

function validarAdminSeed() {
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

/** Borra los datos, carga seed.sql (sintético) y crea/actualiza el admin inicial con bcrypt. */
export async function sembrarBase() {
  validarAdminSeed();
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
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.end();
  }
}
