import { rateLimit } from 'express-rate-limit';

const MINUTO = 60 * 1000;

function limitador(windowMs, limit, mensaje, extra = {}) {
  // La IP solo vive en la memoria del contador durante la ventana; no se guarda ni se registra.
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: mensaje },
    ...extra,
  });
}

/** Se crean por instancia de la app para que cada servidor (y cada prueba) tenga su propio contador. */
export function crearLimites() {
  return {
    publico: limitador(15 * MINUTO, 300, 'Hiciste muchas consultas seguidas. Intenta de nuevo en unos minutos.'),
    reportes: limitador(60 * MINUTO, 10, 'Ya recibimos varios reportes tuyos. Gracias, los revisaremos.'),
    login: limitador(15 * MINUTO, 10, 'Demasiados intentos de inicio de sesión. Espera unos minutos.', {
      skipSuccessfulRequests: true,
    }),
    admin: limitador(15 * MINUTO, 1000, 'Demasiadas solicitudes. Espera unos minutos.'),
  };
}
