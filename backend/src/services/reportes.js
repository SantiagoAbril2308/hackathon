import { query, conTransaccion } from '../db/pool.js';
import { UMBRAL_REPORTES } from '../config/catalogos.js';
import { noEncontrado, solicitudInvalida } from '../utils/httpError.js';

/**
 * Registra un reporte ciudadano (sin IP ni datos personales), sube la prioridad del servicio
 * y, al llegar a UMBRAL_REPORTES desde la última verificación, lo pasa a 'en_revision'.
 */
export async function crear({ servicio_id: servicioId, canal_id: canalId, motivo }) {
  return conTransaccion(async (conn) => {
    const [[servicio]] = await conn.query(
      "SELECT id, estado, fecha_verificacion FROM servicios WHERE id = ? AND estado <> 'retirado' FOR UPDATE",
      [servicioId],
    );
    if (!servicio) throw noEncontrado('No encontramos este servicio');

    if (canalId) {
      const [[canal]] = await conn.query('SELECT servicio_id FROM canales WHERE id = ?', [canalId]);
      if (!canal || canal.servicio_id !== servicioId) {
        throw solicitudInvalida('El canal indicado no pertenece a este servicio');
      }
    }

    await conn.query('INSERT INTO reportes (servicio_id, canal_id, motivo) VALUES (?, ?, ?)', [
      servicioId,
      canalId ?? null,
      motivo,
    ]);
    await conn.query('UPDATE servicios SET prioridad = prioridad + 1 WHERE id = ?', [servicioId]);

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM reportes r
        WHERE r.servicio_id = ?
          AND r.created_at >= COALESCE(
                (SELECT MAX(v.fecha) FROM verificaciones v WHERE v.servicio_id = ?),
                TIMESTAMP(?),
                '1970-01-02')`,
      [servicioId, servicioId, servicio.fecha_verificacion],
    );

    let enRevision = servicio.estado === 'en_revision';
    if (Number(total) >= UMBRAL_REPORTES && servicio.estado === 'vigente') {
      await conn.query("UPDATE servicios SET estado = 'en_revision' WHERE id = ?", [servicioId]);
      enRevision = true;
    }
    return { reportes_desde_verificacion: Number(total), en_revision: enRevision };
  });
}

export async function resumenAdmin() {
  const resumen = await query(
    `SELECT s.id AS servicio_id, s.nombre, s.estado, s.prioridad, COUNT(r.id) AS total,
            MAX(r.created_at) AS ultimo_reporte,
            SUM(r.motivo = 'no_contesta') AS no_contesta,
            SUM(r.motivo = 'numero_errado') AS numero_errado,
            SUM(r.motivo = 'enlace_caido') AS enlace_caido,
            SUM(r.motivo = 'otro') AS otro
       FROM reportes r JOIN servicios s ON s.id = r.servicio_id
      GROUP BY s.id, s.nombre, s.estado, s.prioridad
      ORDER BY s.prioridad DESC, ultimo_reporte DESC`,
  );
  const recientes = await query(
    `SELECT r.id, r.servicio_id, s.nombre AS servicio_nombre, r.canal_id, c.tipo AS canal_tipo,
            c.valor AS canal_valor, r.motivo, r.created_at
       FROM reportes r
       JOIN servicios s ON s.id = r.servicio_id
       LEFT JOIN canales c ON c.id = r.canal_id
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 200`,
  );
  const n = (v) => Number(v ?? 0);
  return {
    resumen: resumen.map((f) => ({
      ...f,
      total: n(f.total),
      no_contesta: n(f.no_contesta),
      numero_errado: n(f.numero_errado),
      enlace_caido: n(f.enlace_caido),
      otro: n(f.otro),
    })),
    recientes,
  };
}
