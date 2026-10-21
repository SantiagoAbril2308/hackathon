const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ErrorApi extends Error {
  constructor(mensaje, status, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

/**
 * fetch con tiempo límite, JSON y errores en español.
 * @param {string} ruta ej. "/api/servicios"
 * @param {{ metodo?: string, cuerpo?: unknown, token?: string, tiempoMs?: number }} [opciones]
 */
export async function pedir(ruta, { metodo = 'GET', cuerpo, token, tiempoMs = 12000 } = {}) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), tiempoMs);
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch {
    throw new ErrorApi('No hay conexión en este momento.', 0);
  } finally {
    clearTimeout(temporizador);
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new ErrorApi(datos.error || 'Algo salió mal. Intenta de nuevo.', respuesta.status, datos.detalles);
  }
  return datos;
}

export const api = {
  directorio: () => pedir('/api/directorio.json'),
  servicio: (id) => pedir(`/api/servicios/${id}`),
  emergencia: () => pedir('/api/emergencia'),
  actividades: () => pedir('/api/actividades'),
  reportar: (cuerpo) => pedir('/api/reportes', { metodo: 'POST', cuerpo }),
  chat: (cuerpo) => pedir('/api/chat', { metodo: 'POST', cuerpo, tiempoMs: 30000 }),
};
