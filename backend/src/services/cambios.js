import { query, conTransaccion } from '../db/pool.js';
import { CAMPOS_CAMBIO_SERVICIO, TIPOS_CANAL } from '../config/catalogos.js';
import { conflicto, noEncontrado } from '../utils/httpError.js';
import { validarValorCanal } from './canales.js';

export async function listar({ estado = 'pendiente' } = {}) {
  const where = estado === 'todos' ? '' : 'WHERE c.estado = ?';
  return query(
    `SELECT c.id, c.fuente_id, f.nombre AS fuente_nombre, f.url AS fuente_url, c.servicio_id,
            s.nombre AS servicio_nombre, c.campo, c.valor_anterior, c.valor_nuevo, c.hash, c.prioridad,
            c.estado, c.revisado_por, c.revisado_en, c.created_at
       FROM cambios_pendientes c
       JOIN fuentes f ON f.id = c.fuente_id
       LEFT JOIN servicios s ON s.id = c.servicio_id
       ${where}
      ORDER BY c.prioridad DESC, c.created_at ASC, c.id ASC`,
    estado === 'todos' ? [] : [estado],
  );
}

async function bloquearPendiente(conn, id) {
  const [[cambio]] = await conn.query('SELECT * FROM cambios_pendientes WHERE id = ? FOR UPDATE', [id]);
  if (!cambio) throw noEncontrado('No encontramos este cambio');
  if (cambio.estado !== 'pendiente') throw conflicto(`Este cambio ya fue ${cambio.estado}`);
  return cambio;
}

/** Aplica el cambio al servicio cuando es posible hacerlo de forma segura. Devuelve si se aplicó. */
async function aplicar(conn, cambio, admin) {
  const { servicio_id: servicioId, campo, valor_anterior: anterior, valor_nuevo: nuevo } = cambio;
  if (!servicioId) return false;

  let aplicado = false;
  if (CAMPOS_CAMBIO_SERVICIO.includes(campo)) {
    await conn.query(`UPDATE servicios SET \`${campo}\` = ? WHERE id = ?`, [nuevo, servicioId]);
    aplicado = true;
  } else if (TIPOS_CANAL.includes(campo) && nuevo) {
    validarValorCanal(campo, nuevo);
    if (anterior) {
      const [r] = await conn.query('UPDATE canales SET valor = ? WHERE servicio_id = ? AND tipo = ? AND valor = ?', [
        nuevo,
        servicioId,
        campo,
        anterior,
      ]);
      aplicado = r.affectedRows > 0;
    } else {
      await conn.query('INSERT INTO canales (servicio_id, tipo, valor, etiqueta) VALUES (?, ?, ?, ?)', [
        servicioId,
        campo,
        nuevo,
        'Actualizado desde fuente oficial',
      ]);
      aplicado = true;
    }
  }

  if (aplicado) {
    // Un administrador revisó el dato contra la fuente oficial: cuenta como verificación.
    await conn.query('UPDATE servicios SET fecha_verificacion = CURDATE(), verificado_por = ? WHERE id = ?', [
      admin.nombre || admin.email,
      servicioId,
    ]);
    await conn.query(
      "INSERT INTO verificaciones (servicio_id, admin_id, resultado, nota) VALUES (?, ?, 'corregido', ?)",
      [servicioId, admin.id, `Cambio #${cambio.id} aprobado (${campo})`],
    );
  }
  return aplicado;
}

export async function aprobar(id, admin) {
  return conTransaccion(async (conn) => {
    const cambio = await bloquearPendiente(conn, id);
    const aplicado = await aplicar(conn, cambio, admin);
    await conn.query(
      "UPDATE cambios_pendientes SET estado = 'aprobado', revisado_por = ?, revisado_en = NOW() WHERE id = ?",
      [admin.id, id],
    );
    return {
      id,
      estado: 'aprobado',
      aplicado,
      mensaje: aplicado
        ? 'Cambio aprobado y aplicado al servicio.'
        : 'Cambio aprobado. No se pudo aplicar automáticamente: actualiza el servicio manualmente.',
    };
  });
}

export async function rechazar(id, admin) {
  return conTransaccion(async (conn) => {
    await bloquearPendiente(conn, id);
    await conn.query(
      "UPDATE cambios_pendientes SET estado = 'rechazado', revisado_por = ?, revisado_en = NOW() WHERE id = ?",
      [admin.id, id],
    );
    return { id, estado: 'rechazado' };
  });
}
