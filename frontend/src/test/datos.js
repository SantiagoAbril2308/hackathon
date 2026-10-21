import { vi } from 'vitest';

/** Datos SINTÉTICOS para las pruebas (teléfonos 000-000-00XX, dominios .example). */
export const servicioEmergencia = {
  id: 1,
  nombre: 'Línea Serena Nacional (ficticia)',
  descripcion: 'Línea de escucha ficticia.',
  tipo: 'linea_nacional',
  temas: ['general', 'ansiedad'],
  publico: ['jovenes', 'adultos'],
  modalidad: ['telefono', 'chat'],
  cobertura: 'Nacional',
  horario: 'Todos los días, 24 horas',
  costo: 'Gratuito',
  direccion: null,
  lat: null,
  lng: null,
  fuente: { id: 1, nombre: 'Directorio nacional (ficticio)', entidad: 'Ministerio Ficticio' },
  url_fuente: 'https://fuente-ficticia-nacional.example/lineas',
  fecha_verificacion: '2026-10-17',
  estado: 'vigente',
  es_emergencia: true,
  orden: 1,
  es_sintetico: true,
  canales: [
    { id: 1, tipo: 'telefono', valor: '000-000-0001', etiqueta: 'Línea gratuita' },
    { id: 2, tipo: 'whatsapp', valor: '000-000-0002', etiqueta: 'WhatsApp' },
  ],
};

export const servicioPresencial = {
  ...servicioEmergencia,
  id: 7,
  nombre: 'Centro de Escucha Barzal (ficticio)',
  tipo: 'presencial',
  temas: ['duelo'],
  publico: ['adultos', 'familias'],
  modalidad: ['presencial'],
  cobertura: 'Villavicencio',
  horario: 'Lunes a viernes',
  direccion: 'Barrio Barzal, dirección ficticia',
  lat: 4.1555,
  lng: -73.639,
  es_emergencia: false,
  orden: 0,
  url_fuente: 'https://fuente-ficticia-villavicencio.example/orientacion',
  canales: [{ id: 12, tipo: 'telefono', valor: '000-000-0009', etiqueta: 'Recepción' }],
};

export const servicioChat = {
  ...servicioEmergencia,
  id: 4,
  nombre: 'Chat Juvenil Amanecer (ficticio)',
  tipo: 'chat',
  temas: ['ansiedad'],
  publico: ['jovenes'],
  modalidad: ['chat'],
  es_emergencia: false,
  canales: [{ id: 7, tipo: 'web', valor: 'https://fuente-ficticia-nacional.example/chat', etiqueta: 'Chat web' }],
};

export const directorio = {
  generado_en: '2026-10-20T15:00:00.000Z',
  dias_vigencia: 30,
  linea_123: { numero: '123', etiqueta: 'Línea de emergencias' },
  emergencia: [servicioEmergencia],
  servicios: [servicioEmergencia, servicioChat, servicioPresencial],
};

const responder = (cuerpo, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(cuerpo) });

/**
 * fetch falso por ruta: { 'GET /api/directorio.json': cuerpo | (url, init) => cuerpo | Error }.
 * Las rutas sin definir responden 404.
 */
export function simularFetch(rutas = {}) {
  const espia = vi.fn((url, init = {}) => {
    const { pathname, search } = new URL(url, 'http://localhost');
    const clave = `${init.method ?? 'GET'} ${pathname}${search}`;
    const claveSinQuery = `${init.method ?? 'GET'} ${pathname}`;
    const definida = rutas[clave] ?? rutas[claveSinQuery];
    if (definida === undefined) return responder({ error: 'No encontrado' }, 404);
    const valor = typeof definida === 'function' ? definida(url, init) : definida;
    if (valor instanceof Error) return Promise.reject(valor);
    if (valor?.__status) return responder(valor.cuerpo, valor.__status);
    return responder(valor);
  });
  vi.stubGlobal('fetch', espia);
  return espia;
}

export const cuerpoDe = (espia, indice = 0) => JSON.parse(espia.mock.calls[indice][1].body);
