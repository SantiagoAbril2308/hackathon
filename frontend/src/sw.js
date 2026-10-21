/* Service worker de Ruta Serena (PWA-02, PWA-07). Se compila con vite-plugin-pwa (injectManifest). */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';
import { abrirApoyo } from './sw/notificaciones.js';

self.skipWaiting();
clientsClaim();

// Todo el build (incluida la vista /apoyo, sus estilos, fuentes e iconos) queda en caché al instalar.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cualquier ruta de la app (/apoyo, /directorio, ...) responde con index.html precargado, también sin conexión.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// Copia del directorio para uso sin conexión: primero la red; si falla o tarda, la última copia.
registerRoute(
  ({ url }) => url.pathname.endsWith('/api/directorio.json'),
  new NetworkFirst({
    cacheName: 'ruta-serena-directorio',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 2 })],
  }),
);

// Teselas del mapa (OpenStreetMap): se reutilizan las ya vistas.
registerRoute(
  ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
  new StaleWhileRevalidate({
    cacheName: 'ruta-serena-mapa',
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(abrirApoyo(self.clients, self.location.origin));
});
