import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

export function rutaNoEncontrada(_req, res) {
  res.status(404).json({ error: 'No encontrado' });
}

const ERRORES_MYSQL = {
  ER_NO_REFERENCED_ROW_2: [400, 'Uno de los datos hace referencia a un registro que no existe'],
  ER_ROW_IS_REFERENCED_2: [409, 'El registro está en uso y no se puede eliminar'],
  ER_DUP_ENTRY: [409, 'Ya existe un registro con esos datos'],
};

// eslint-disable-next-line no-unused-vars
export function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Revisa los datos enviados',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (err instanceof HttpError) {
    const cuerpo = { error: err.message };
    if (err.detalles) cuerpo.detalles = err.detalles;
    return res.status(err.status).json(cuerpo);
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande' });
  }
  if (err?.code && ERRORES_MYSQL[err.code]) {
    const [status, mensaje] = ERRORES_MYSQL[err.code];
    return res.status(status).json({ error: mensaje });
  }
  // Sin datos de la solicitud en el log: solo el tipo de error.
  console.error(`[error] ${err?.code || err?.name || 'Error'}: ${err?.message}`);
  return res.status(500).json({ error: 'Algo salió mal. Intenta de nuevo más tarde.' });
}
