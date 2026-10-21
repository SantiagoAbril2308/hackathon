import { leerPreferencias, guardarPreferencias } from './almacen.js';

/**
 * Acceso rápido (PWA-05 a PWA-08): una notificación silenciosa que abre /apoyo.
 * Siempre se crea con registration.showNotification() (nunca con el constructor Notification),
 * porque en Android solo el service worker puede mostrar notificaciones.
 */
export const TITULO = 'Ruta Serena';
export const TEXTO = 'Toca para ver líneas de apoyo';
export const ETIQUETA = 'ruta-serena-acceso-rapido';

export function esCompatible() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function mostrarNotificacion() {
  const registro = await navigator.serviceWorker.ready;
  await registro.showNotification(TITULO, {
    body: TEXTO,
    tag: ETIQUETA,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    silent: true,
    renotify: false,
    requireInteraction: true,
    data: { url: '/apoyo' },
  });
}

async function cerrarNotificaciones() {
  const registro = await navigator.serviceWorker.ready;
  const abiertas = (await registro.getNotifications?.({ tag: ETIQUETA })) ?? [];
  abiertas.forEach((n) => n.close());
}

/** PWA-05: el permiso se pide SOLO aquí, cuando la persona activa el interruptor. */
export async function activar() {
  if (!esCompatible()) return { ok: false, motivo: 'no_compatible' };
  const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permiso !== 'granted') {
    await guardarPreferencias({ accesoRapido: false });
    return { ok: false, motivo: 'denegado' };
  }
  await guardarPreferencias({ accesoRapido: true });
  await mostrarNotificacion();
  return { ok: true };
}

export async function desactivar() {
  await guardarPreferencias({ accesoRapido: false });
  if (esCompatible()) await cerrarNotificaciones();
  return { ok: true };
}

/** PWA-08: si la preferencia está activa y hay permiso, vuelve a mostrar la notificación al abrir la app. */
export async function restaurarAlIniciar() {
  if (!esCompatible()) return false;
  const { accesoRapido } = await leerPreferencias();
  if (!accesoRapido || Notification.permission !== 'granted') return false;
  await mostrarNotificacion();
  return true;
}
