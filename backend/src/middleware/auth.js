import { HttpError } from '../utils/httpError.js';
import { verificarToken } from '../utils/jwt.js';

export function requiereAdmin(req, _res, next) {
  const [tipo, token] = (req.get('authorization') || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    throw new HttpError(401, 'Inicia sesión para continuar');
  }
  try {
    req.admin = verificarToken(token);
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, 'Tu sesión no es válida o ya venció. Inicia sesión de nuevo');
  }
  next();
}
