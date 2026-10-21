import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

const OPCIONES = { algorithm: 'HS256', issuer: 'ruta-serena', expiresIn: '8h' };

function secreto() {
  if (!env.jwtSecret || env.jwtSecret.length < 16) {
    throw new HttpError(500, 'La autenticación no está configurada (JWT_SECRET)');
  }
  return env.jwtSecret;
}

export function firmarToken(admin) {
  return jwt.sign({ sub: String(admin.id), email: admin.email, nombre: admin.nombre }, secreto(), OPCIONES);
}

export function verificarToken(token) {
  const datos = jwt.verify(token, secreto(), { algorithms: ['HS256'], issuer: 'ruta-serena' });
  return { id: Number(datos.sub), email: datos.email, nombre: datos.nombre };
}
