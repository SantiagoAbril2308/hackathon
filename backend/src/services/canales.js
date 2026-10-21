import { query } from '../db/pool.js';
import { noEncontrado, solicitudInvalida } from '../utils/httpError.js';

const PATRON_TELEFONO = /^\+?[0-9][0-9\s\-()]{1,19}$/;
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida el valor según el tipo de canal. Se usa también al aprobar cambios del scraper. */
export function validarValorCanal(tipo, valor) {
  const ok = {
    telefono: () => PATRON_TELEFONO.test(valor),
    whatsapp: () => PATRON_TELEFONO.test(valor),
    email: () => PATRON_EMAIL.test(valor),
    web: () => {
      try {
        return new URL(valor).protocol === 'https:';
      } catch {
        return false;
      }
    },
  }[tipo];
  if (!ok || !ok()) {
    const ayuda = {
      telefono: 'un número con solo dígitos, espacios, guiones o paréntesis',
      whatsapp: 'un número con solo dígitos, espacios, guiones o paréntesis',
      email: 'un correo válido',
      web: 'un enlace https válido',
    }[tipo];
    throw solicitudInvalida(`El valor del canal debe ser ${ayuda || 'válido'}`);
  }
}

async function obtener(id) {
  const [canal] = await query('SELECT id, servicio_id, tipo, valor, etiqueta FROM canales WHERE id = ?', [id]);
  if (!canal) throw noEncontrado('No encontramos este canal');
  return canal;
}

export async function listar(servicioId) {
  return query('SELECT id, servicio_id, tipo, valor, etiqueta FROM canales WHERE servicio_id = ? ORDER BY id', [
    servicioId,
  ]);
}

export async function crear({ servicio_id, tipo, valor, etiqueta }) {
  validarValorCanal(tipo, valor);
  const r = await query('INSERT INTO canales (servicio_id, tipo, valor, etiqueta) VALUES (?, ?, ?, ?)', [
    servicio_id,
    tipo,
    valor,
    etiqueta ?? null,
  ]);
  return obtener(r.insertId);
}

export async function actualizar(id, cambios) {
  const actual = await obtener(id);
  const nuevo = { ...actual, ...cambios };
  validarValorCanal(nuevo.tipo, nuevo.valor);
  await query('UPDATE canales SET tipo = ?, valor = ?, etiqueta = ? WHERE id = ?', [
    nuevo.tipo,
    nuevo.valor,
    nuevo.etiqueta ?? null,
    id,
  ]);
  return obtener(id);
}

export async function eliminar(id) {
  const r = await query('DELETE FROM canales WHERE id = ?', [id]);
  if (!r.affectedRows) throw noEncontrado('No encontramos este canal');
}
