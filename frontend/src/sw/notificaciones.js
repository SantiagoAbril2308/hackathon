export const RUTA_APOYO = '/apoyo';

/**
 * PWA-07: al tocar la notificación, enfoca una ventana abierta de la app y la lleva a /apoyo,
 * o abre una nueva si no hay ninguna. `clientes` es `self.clients` del service worker.
 */
export async function abrirApoyo(clientes, origen) {
  const destino = new URL(RUTA_APOYO, origen).href;
  const ventanas = await clientes.matchAll({ type: 'window', includeUncontrolled: true });
  const propia = ventanas.find((v) => new URL(v.url).origin === origen);
  if (propia) {
    const enfocada = await propia.focus();
    if (new URL(enfocada.url).pathname !== RUTA_APOYO && 'navigate' in enfocada) {
      return enfocada.navigate(destino);
    }
    return enfocada;
  }
  return clientes.openWindow(destino);
}
