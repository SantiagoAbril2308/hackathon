import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { conexionScript } from './pool.js';

const RUTA_SCHEMA = fileURLToPath(new URL('../../db/schema.sql', import.meta.url));

async function migrar() {
  const conn = await conexionScript({ sinBase: true });
  try {
    const nombre = env.db.name;
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.query(`USE \`${nombre}\``);
    const sql = await readFile(RUTA_SCHEMA, 'utf8');
    await conn.query(sql);
    const [tablas] = await conn.query('SHOW TABLES');
    console.log(`Migración completa en "${nombre}". Tablas: ${tablas.map((t) => Object.values(t)[0]).join(', ')}`);
  } finally {
    await conn.end();
  }
}

migrar().catch((err) => {
  console.error(`Error en la migración: ${err.message}`);
  process.exit(1);
});
