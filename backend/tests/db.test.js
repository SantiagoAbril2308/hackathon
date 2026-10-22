import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configuracionPool, validarConfiguracion, conReintento, esErrorDeConexion } from '../src/db/pool.js';

const leer = (ruta) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8');
const schema = leer('../db/schema.sql');
const seed = leer('../db/seed.sql');

/** Devuelve el bloque de un INSERT INTO <tabla> ... ; */
function bloqueInsert(tabla) {
  const inicio = seed.indexOf(`INSERT INTO ${tabla}`);
  expect(inicio, `falta INSERT INTO ${tabla}`).toBeGreaterThan(-1);
  return seed.slice(inicio, seed.indexOf(';', seed.indexOf('VALUES', inicio)) + 1);
}

describe('pool de conexiones', () => {
  const cfg = configuracionPool({ host: 'h', port: 4000, user: 'u', password: 'p', name: 'ruta_serena' });

  it('exige TLS 1.2+ y valida el certificado', () => {
    expect(cfg.ssl).toEqual({ minVersion: 'TLSv1.2', rejectUnauthorized: true });
  });

  it('usa connectionLimit 10, puerto 4000 y utf8mb4', () => {
    expect(cfg.connectionLimit).toBe(10);
    expect(cfg.port).toBe(4000);
    expect(cfg.charset).toBe('utf8mb4');
  });

  it('avisa qué variables faltan sin mostrar valores', () => {
    expect(() => validarConfiguracion({ host: '', user: '', password: '', name: 'ruta_serena' })).toThrow(
      /DB_HOST, DB_USER, DB_PASSWORD/,
    );
  });

  it('rechaza nombres de base de datos inseguros', () => {
    expect(() => validarConfiguracion({ host: 'h', user: 'u', password: 'p', name: 'x; DROP' })).toThrow(/DB_NAME/);
  });
});

describe('conexiones caídas (TiDB Serverless cierra las inactivas)', () => {
  const cfg = configuracionPool({ host: 'h', port: 4000, user: 'u', password: 'p', name: 'ruta_serena' });

  it('el pool cierra conexiones inactivas antes que el servidor y usa keep-alive', () => {
    expect(cfg.idleTimeout).toBeLessThanOrEqual(30_000);
    expect(cfg.maxIdle).toBe(0); // ninguna conexión inactiva sobrevive al idleTimeout
    expect(cfg.enableKeepAlive).toBe(true);
    expect(cfg.connectTimeout).toBeGreaterThan(0);
  });

  it('reintenta una vez si la conexión estaba rota', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let llamadas = 0;
    const resultado = await conReintento(async () => {
      llamadas += 1;
      if (llamadas === 1) throw Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
      return 'ok';
    });
    expect(resultado).toBe('ok');
    expect(llamadas).toBe(2);
  });

  it('no reintenta errores de datos ni reintenta para siempre', async () => {
    const duplicado = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
    let llamadas = 0;
    await expect(
      conReintento(async () => {
        llamadas += 1;
        throw duplicado;
      }),
    ).rejects.toBe(duplicado);
    expect(llamadas).toBe(1);

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    llamadas = 0;
    const caida = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
    await expect(
      conReintento(async () => {
        llamadas += 1;
        throw caida;
      }),
    ).rejects.toBe(caida);
    expect(llamadas).toBe(3); // MAX_INTENTOS
  });

  it('reconoce los errores de conexión y los tiempos agotados', () => {
    expect(esErrorDeConexion({ code: 'PROTOCOL_SEQUENCE_TIMEOUT' })).toBe(true);
    expect(esErrorDeConexion({ fatal: true })).toBe(true);
    expect(esErrorDeConexion({ code: 'ER_PARSE_ERROR' })).toBe(false);
  });
});

describe('schema.sql', () => {
  const tablas = ['admins', 'fuentes', 'servicios', 'canales', 'verificaciones', 'cambios_pendientes', 'reportes', 'actividades'];

  it('define las 8 tablas con InnoDB y utf8mb4', () => {
    for (const t of tablas) {
      expect(schema).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${t} \\(`));
    }
    expect(schema.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/g)).toHaveLength(tablas.length);
  });

  it('servicios queda en_revision por defecto y tiene los ENUM pedidos', () => {
    expect(schema).toContain("estado ENUM('vigente','en_revision','retirado') NOT NULL DEFAULT 'en_revision'");
    expect(schema).toContain("tipo ENUM('linea_nacional','linea_departamental','linea_municipal','presencial','chat')");
    expect(schema).toContain("motivo ENUM('no_contesta','numero_errado','enlace_caido','otro')");
  });

  it('reportes no guarda IP ni datos de quien reporta', () => {
    const reportes = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS reportes'));
    const def = reportes.slice(0, reportes.indexOf(';'));
    expect(def).not.toMatch(/\bip\b|user_agent|email|nombre/i);
  });
});

describe('seed.sql (solo datos sintéticos)', () => {
  const servicios = bloqueInsert('servicios');
  const filas = [...servicios.matchAll(/'(vigente|en_revision|retirado)', (TRUE|FALSE), (\d+), (\d+), (TRUE|FALSE)\)/g)];

  it('tiene 20 servicios, todos con es_sintetico = TRUE', () => {
    expect(filas).toHaveLength(20);
    expect(filas.every((f) => f[5] === 'TRUE')).toBe(true);
  });

  it('tiene exactamente 2 servicios de emergencia', () => {
    expect(filas.filter((f) => f[2] === 'TRUE')).toHaveLength(2);
  });

  it('todos los servicios tienen url_fuente y fecha de verificación', () => {
    expect(
      servicios.match(/'https:\/\/fuente-ficticia-[a-z]+\.example\/[^']+', DATE_SUB\(CURDATE\(\), INTERVAL \d+ DAY\)/g),
    ).toHaveLength(20);
  });

  it('incluye servicios con más de 30 días sin verificar', () => {
    const dias = [...servicios.matchAll(/INTERVAL (\d+) DAY/g)].map((m) => Number(m[1]));
    expect(dias.filter((d) => d > 30).length).toBeGreaterThanOrEqual(3);
  });

  it('teléfonos y WhatsApp siguen el formato 000-000-00XX', () => {
    const canales = bloqueInsert('canales');
    const tel = [...canales.matchAll(/'(telefono|whatsapp)', '([^']+)'/g)].map((m) => m[2]);
    expect(tel.length).toBeGreaterThan(0);
    for (const v of tel) expect(v).toMatch(/^000-000-00\d{2}$/);
  });

  it('no contiene números con forma de teléfono colombiano real', () => {
    const sinSinteticos = seed.replace(/000-000-00\d{2}/g, '');
    expect(sinSinteticos).not.toMatch(/\b60\d{8}\b/); // fijos
    expect(sinSinteticos).not.toMatch(/\b3\d{9}\b/); // celulares
    expect(sinSinteticos).not.toMatch(/'\d{3}'/); // líneas cortas
  });

  it('usa solo dominios reservados .example', () => {
    const urls = seed.match(/https?:\/\/[^'\s)]+/g);
    for (const u of urls) expect(new URL(u).hostname.endsWith('.example')).toBe(true);
  });

  it('tiene 3 fuentes y 5 actividades', () => {
    expect(bloqueInsert('fuentes').match(/^\(\d+, '/gm)).toHaveLength(3);
    expect(bloqueInsert('actividades').match(/^\(\d+, '/gm)).toHaveLength(5);
  });
});
