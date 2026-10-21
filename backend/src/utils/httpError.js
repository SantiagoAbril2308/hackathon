export class HttpError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.name = 'HttpError';
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (mensaje = 'No encontramos lo que buscas') => new HttpError(404, mensaje);
export const solicitudInvalida = (mensaje, detalles) => new HttpError(400, mensaje, detalles);
export const conflicto = (mensaje) => new HttpError(409, mensaje);
