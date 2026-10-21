const ZONA = 'America/Bogota';

/** '2026-10-20' → '20 oct 2026' (las fechas DATE se interpretan como día calendario, sin zona). */
export function fechaCorta(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const mes = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(a, m - 1, d)))
    .replace('.', '');
  return `${d} ${mes} ${a}`;
}

/** Fecha y hora en hora de Colombia: '20 oct 2026, 10:23 a. m.' */
export function fechaHora(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONA }).format(new Date(iso));
}

/** 'hace 5 min', 'hace 2 h', 'hace 3 días'. */
export function haceCuanto(iso, ahora = Date.now()) {
  if (!iso) return '';
  const minutos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function saludo(fecha = new Date()) {
  const hora = Number(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hourCycle: 'h23', timeZone: ZONA }).format(fecha));
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Sin tildes ni mayúsculas, para buscar. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Enlace de WhatsApp: solo dígitos; a números colombianos de 10 dígitos se les antepone 57. */
export function enlaceWhatsApp(numero) {
  const digitos = String(numero).replace(/\D/g, '');
  const conPais = digitos.length === 10 && /^[36]/.test(digitos) ? `57${digitos}` : digitos;
  return `https://wa.me/${conPais}`;
}

export function enlaceTelefono(numero) {
  return `tel:${String(numero).replace(/[^\d+]/g, '')}`;
}

export function dominio(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const ETIQUETAS = {
  temas: {
    ansiedad: 'Ansiedad',
    depresion: 'Tristeza o depresión',
    duelo: 'Duelo',
    consumo_sustancias: 'Consumo de sustancias',
    conducta_suicida: 'Crisis',
    violencias: 'Violencias',
    general: 'Orientación general',
  },
  publico: { ninos: 'Niñas y niños', jovenes: 'Jóvenes', adultos: 'Personas adultas', familias: 'Familias' },
  modalidad: { telefono: 'Teléfono', chat: 'Chat', presencial: 'Presencial' },
  tipo: {
    linea_nacional: 'Línea nacional',
    linea_departamental: 'Línea del Meta',
    linea_municipal: 'Línea de Villavicencio',
    presencial: 'Atención presencial',
    chat: 'Chat',
  },
};
