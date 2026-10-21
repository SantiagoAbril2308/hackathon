import { query } from '../db/pool.js';
import { noEncontrado } from '../utils/httpError.js';

const COLUMNAS = 'id, titulo, organizador, descripcion, fecha, lugar, url, estado, created_at';

/** Públicas: solo aprobadas y desde hoy en adelante. */
export async function listarAprobadas() {
  return query(
    `SELECT id, titulo, organizador, descripcion, fecha, lugar, url FROM actividades
      WHERE estado = 'aprobada' AND fecha >= CURDATE()
      ORDER BY fecha ASC, id ASC`,
  );
}

export async function adminListar({ estado } = {}) {
  return estado
    ? query(`SELECT ${COLUMNAS} FROM actividades WHERE estado = ? ORDER BY fecha ASC`, [estado])
    : query(`SELECT ${COLUMNAS} FROM actividades ORDER BY FIELD(estado, 'pendiente', 'aprobada', 'rechazada'), fecha ASC`);
}

export async function cambiarEstado(id, estado) {
  const r = await query('UPDATE actividades SET estado = ? WHERE id = ?', [estado, id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos esta actividad');
  const [actividad] = await query(`SELECT ${COLUMNAS} FROM actividades WHERE id = ?`, [id]);
  return actividad;
}
