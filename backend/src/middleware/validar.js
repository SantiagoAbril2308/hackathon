/**
 * Valida params, query y body con esquemas zod. El resultado queda en `req.valid`
 * (en Express 5 `req.query` es de solo lectura). Un ZodError lo atiende el manejador central.
 */
export function validar(esquemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const parte of ['params', 'query', 'body']) {
      if (esquemas[parte]) {
        req.valid[parte] = esquemas[parte].parse(req[parte] ?? {});
      }
    }
    next();
  };
}
