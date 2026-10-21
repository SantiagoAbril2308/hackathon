import { env } from '../config/env.js';
import { conexionScript } from './pool.js';

const TABLAS = [
  'admins',
  'fuentes',
  'servicios',
  'canales',
  'verificaciones',
  'cambios_pendientes',
  'reportes',
  'actividades',
];

// Controles que deben dar 0 para cumplir el reglamento.
const CONTROLES = [
  {
    nombre: 'Servicios no sintéticos',
    sql: 'SELECT COUNT(*) AS n FROM servicios WHERE es_sintetico = FALSE',
  },
  {
    nombre: "Teléfonos/WhatsApp fuera del formato 000-000-00XX",
    sql: "SELECT COUNT(*) AS n FROM canales WHERE tipo IN ('telefono','whatsapp') AND valor NOT REGEXP '^000-000-00[0-9]{2}$'",
  },
  {
    nombre: 'Vigentes sin url_fuente o fecha_verificacion',
    sql: "SELECT COUNT(*) AS n FROM servicios WHERE estado = 'vigente' AND (url_fuente IS NULL OR url_fuente = '' OR fecha_verificacion IS NULL)",
  },
];

async function revisar() {
  const conn = await conexionScript();
  try {
    await conn.ping();
    const [[{ version }]] = await conn.query('SELECT VERSION() AS version');
    const [ssl] = await conn.query("SHOW STATUS LIKE 'Ssl_cipher'");
    console.log(`Conexión OK · ${version} · TLS: ${ssl[0]?.Value || 'desconocido'}\n`);

    const conteos = [];
    for (const tabla of TABLAS) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${tabla}\``);
      conteos.push({ tabla, registros: Number(n) });
    }
    console.log('Conteos por tabla:');
    console.table(conteos);

    const [estados] = await conn.query(
      `SELECT estado,
              COUNT(*) AS total,
              SUM(fecha_verificacion < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS vencidos,
              SUM(es_emergencia) AS emergencia
         FROM servicios GROUP BY estado ORDER BY estado`,
      [env.diasVigencia],
    );
    console.log(`Servicios por estado (vencidos = más de ${env.diasVigencia} días sin verificar):`);
    console.table(estados.map((e) => ({ ...e, total: Number(e.total), vencidos: Number(e.vencidos), emergencia: Number(e.emergencia) })));

    let fallas = 0;
    console.log('Controles del reglamento (deben ser 0):');
    for (const c of CONTROLES) {
      const [[{ n }]] = await conn.query(c.sql);
      const ok = Number(n) === 0;
      if (!ok) fallas += 1;
      console.log(`  ${ok ? 'OK ' : 'ERR'} ${c.nombre}: ${n}`);
    }
    if (fallas) {
      process.exitCode = 1;
    }
  } finally {
    await conn.end();
  }
}

revisar().catch((err) => {
  console.error(`Error al revisar la base de datos: ${err.message}`);
  process.exit(1);
});
