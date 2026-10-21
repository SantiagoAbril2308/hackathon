import { query } from '../db/pool.js';
import { noEncontrado } from '../utils/httpError.js';

const COLUMNAS = `f.id, f.nombre, f.entidad, f.url, f.dominio, f.selector_css, f.activa, f.ultimo_hash,
  f.ultima_lectura, f.created_at`;

function aFuente(fila) {
  return { ...fila, activa: Boolean(Number(fila.activa)), servicios: fila.servicios == null ? undefined : Number(fila.servicios) };
}

export async function listar() {
  const filas = await query(
    `SELECT ${COLUMNAS}, (SELECT COUNT(*) FROM servicios s WHERE s.fuente_id = f.id) AS servicios
       FROM fuentes f ORDER BY f.activa DESC, f.nombre ASC`,
  );
  return filas.map(aFuente);
}

export async function obtener(id) {
  const [fila] = await query(`SELECT ${COLUMNAS} FROM fuentes f WHERE f.id = ?`, [id]);
  if (!fila) throw noEncontrado('No encontramos esta fuente');
  return aFuente(fila);
}

export async function crear({ nombre, entidad, url, selector_css, activa = true }) {
  const r = await query(
    'INSERT INTO fuentes (nombre, entidad, url, dominio, selector_css, activa) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, entidad, url, new URL(url).hostname, selector_css ?? null, activa],
  );
  return obtener(r.insertId);
}

export async function actualizar(id, cambios) {
  const actual = await obtener(id);
  const nuevo = { ...actual, ...cambios };
  await query(
    'UPDATE fuentes SET nombre = ?, entidad = ?, url = ?, dominio = ?, selector_css = ?, activa = ? WHERE id = ?',
    [nuevo.nombre, nuevo.entidad, nuevo.url, new URL(nuevo.url).hostname, nuevo.selector_css ?? null, nuevo.activa, id],
  );
  return obtener(id);
}

/** Borrado lógico: la fuente deja de leerse pero se conserva el historial de cambios. */
export async function desactivar(id) {
  const r = await query('UPDATE fuentes SET activa = FALSE WHERE id = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos esta fuente');
  return obtener(id);
}
