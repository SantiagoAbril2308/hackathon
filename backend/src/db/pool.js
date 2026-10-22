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
    // TiDB Serverless corta en silencio las conexiones inactivas (la consulta se queda colgada).
    // En mysql2, idleTimeout solo cierra las inactivas que superan maxIdle: con maxIdle 0 ninguna
    // conexión pasa más de IDLE_MS sin usarse, así el pool nunca entrega una conexión vieja.
    maxIdle: 0,
    idleTimeout: IDLE_MS,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 10_000,
  });
}

/** Tiempo que una conexión puede quedar sin usarse antes de que el pool la cierre. */
export const IDLE_MS = 20_000;

/** Intentos ante una conexión rota (la primera más dos reintentos con conexiones nuevas). */
export const MAX_INTENTOS = 3;

/** Tiempo máximo de una consulta: una conexión colgada no debe dejar esperando a la persona. */
export const TIEMPO_CONSULTA_MS = 10_000;

/** Errores de una conexión rota o colgada: se puede reintentar con otra conexión del pool. */
const ERRORES_CONEXION = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'ECONNREFUSED',
]);

export function esErrorDeConexion(err) {
  return ERRORES_CONEXION.has(err?.code) || err?.fatal === true;
}

/**
 * Ejecuta `operacion` y, si falla por una conexión rota, la reintenta con otra conexión
 * (red de seguridad: con maxIdle 0 casi nunca debería hacer falta).
 */
export async function conReintento(operacion, { intentos = MAX_INTENTOS } = {}) {
  for (let intento = 1; ; intento += 1) {
    try {
      return await operacion();
    } catch (err) {
      if (intento >= intentos || !esErrorDeConexion(err)) throw err;
      console.warn(`[db] conexión perdida (${err.code ?? 'fatal'}); reintentando con otra conexión`);
    }
  }
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
  return conReintento(async () => {
    const [rows] = await getPool().query({ sql, timeout: TIEMPO_CONSULTA_MS }, params);
    return rows;
  });
}

/** Toma una conexión del pool que responda; descarta las que estén muertas. */
async function conexionViva() {
  return conReintento(async () => {
    const conn = await getPool().getConnection();
    try {
      await conn.query({ sql: 'SELECT 1', timeout: TIEMPO_CONSULTA_MS });
      return conn;
    } catch (err) {
      conn.destroy();
      throw err;
    }
  });
}

/** Ejecuta `fn(conn)` dentro de una transacción; hace rollback si algo falla. */
export async function conTransaccion(fn) {
  const conn = await conexionViva();
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
  const conn = await conexionViva();
  conn.release();
  return true;
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
