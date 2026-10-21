import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';

let hashFicticio = null;

/** Hash señuelo para que el tiempo de respuesta no revele si el correo existe. */
async function obtenerHashFicticio() {
  hashFicticio ??= await bcrypt.hash(randomUUID(), 12);
  return hashFicticio;
}

export async function autenticar(email, password) {
  const [admin] = await query('SELECT id, nombre, email, password_hash FROM admins WHERE email = ?', [
    email.toLowerCase(),
  ]);
  const hash = admin?.password_hash ?? (await obtenerHashFicticio());
  const valido = await bcrypt.compare(password, hash);
  if (!admin || !valido) {
    throw new HttpError(401, 'Correo o contraseña incorrectos');
  }
  return { id: admin.id, nombre: admin.nombre, email: admin.email };
}
