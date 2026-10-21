import { query } from '../db/pool.js';
import { env } from '../config/env.js';

/**
 * Pasa a 'en_revision' todo servicio 'vigente' que ya no cumple la regla de vigencia
 * (más de DIAS_VIGENCIA días sin verificar, o sin url_fuente / fecha). Devuelve cuántos cambió.
 */
export async function vencerServicios() {
  const resultado = await query(
    `UPDATE servicios
        SET estado = 'en_revision'
      WHERE estado = 'vigente'
        AND (fecha_verificacion IS NULL
             OR fecha_verificacion < DATE_SUB(CURDATE(), INTERVAL ? DAY)
             OR url_fuente IS NULL OR url_fuente = '')`,
    [env.diasVigencia],
  );
  return resultado.affectedRows;
}
