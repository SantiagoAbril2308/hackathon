import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

// Hora de Colombia para que CURDATE() y las fechas de verificación coincidan con el calendario local.
export const ZONA_HORARIA = '-05:00';

const REQUERIDAS = ['host', 'user', 'password', 'name'];
const NOMBRES_ENV = { host: 'DB_HOST', user: 'DB_USER', password: 'DB_PASSWORD', name: 'DB_NAME' };

export function validarConfiguracion(cfg = env.db) {
  const faltan = REQUERIDAS.filter((k) => !cfg[k]).map((k) => NOMBRES_ENV[k]);
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno de la base de datos: ${faltan.join(', ')}. Llénalas en backend/.env`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(cfg.name)) {
    throw new Error('DB_NAME solo puede tener letras, números y guion bajo');
  }
}

/**
 * Opciones de conexión comunes. TLS es obligatorio (TiDB Cloud Serverless).
 * @param {object} cfg  configuración de base de datos (env.db)
 * @param {object} extra opciones adicionales de mysql2
 */
export function configuracionConexion(cfg = env.db, extra = {}) {
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.name,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    charset: 'utf8mb4',
    timezone: ZONA_HORARIA,
    // Las columnas DATE llegan como 'YYYY-MM-DD' y no se corren por zona horaria.
    dateStrings: ['DATE'],
    ...extra,
  };
}

export function configuracionPool(cfg = env.db) {
  return configuracionConexion(cfg, {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  });
}

let pool = null;

export function getPool() {
  if (!pool) {
    try {
      validarConfiguracion();
    } catch (err) {
      console.error(err.message);
      throw new HttpError(503, 'El servicio no está disponible en este momento');
    }
    pool = mysql.createPool(configuracionPool());
    pool.pool.on('connection', (conn) => {
      conn.query(`SET time_zone = '${ZONA_HORARIA}'`);
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

/** Ejecuta `fn(conn)` dentro de una transacción; hace rollback si algo falla. */
export async function conTransaccion(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export async function ping() {
  const conn = await getPool().getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

export async function cerrarPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Conexión individual para scripts (migrate/seed/check), permite varias sentencias por archivo. */
export async function conexionScript({ sinBase = false } = {}) {
  validarConfiguracion();
  const opciones = configuracionConexion(env.db, { multipleStatements: true });
  if (sinBase) delete opciones.database;
  const conn = await mysql.createConnection(opciones);
  await conn.query(`SET time_zone = '${ZONA_HORARIA}'`);
  return conn;
}
