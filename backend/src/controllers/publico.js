import { env, AVISO } from '../config/env.js';
import { LINEA_123 } from '../config/catalogos.js';
import { ping } from '../db/pool.js';
import * as servicios from '../services/servicios.js';
import * as reportes from '../services/reportes.js';
import * as actividades from '../services/actividades.js';

function conLimiteDeTiempo(promesa, ms) {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error('tiempo agotado')), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

export async function salud(_req, res) {
  let db = 'sin_configurar';
  if (env.db.host) {
    try {
      await conLimiteDeTiempo(ping(), 3000);
      db = 'ok';
    } catch {
      db = 'error';
    }
  }
  res.json({ ok: true, servicio: 'ruta-serena-api', db, aviso: AVISO });
}

export async function listarServicios(req, res) {
  const lista = await servicios.listarVigentes(req.valid.query);
  res.json({ total: lista.length, dias_vigencia: env.diasVigencia, aviso: AVISO, servicios: lista });
}

export async function obtenerServicio(req, res) {
  res.json(await servicios.obtenerPublico(req.valid.params.id));
}

export async function emergencia(_req, res) {
  const lista = await servicios.listarEmergencia();
  res.json({ linea_123: LINEA_123, aviso: AVISO, servicios: lista });
}

/** Copia de lo vigente para uso sin conexión (la guarda la PWA en caché e IndexedDB). */
export async function directorio(_req, res) {
  const [vigentes, deEmergencia] = await Promise.all([servicios.listarVigentes(), servicios.listarEmergencia()]);
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    generado_en: new Date().toISOString(),
    dias_vigencia: env.diasVigencia,
    aviso: AVISO,
    linea_123: LINEA_123,
    emergencia: deEmergencia,
    servicios: vigentes,
  });
}

export async function crearReporte(req, res) {
  const resultado = await reportes.crear(req.valid.body);
  res.status(201).json({
    ok: true,
    mensaje: 'Gracias por avisarnos. Revisaremos este servicio lo antes posible.',
    en_revision: resultado.en_revision,
  });
}

export async function listarActividades(_req, res) {
  const lista = await actividades.listarAprobadas();
  res.json({ total: lista.length, actividades: lista });
}
