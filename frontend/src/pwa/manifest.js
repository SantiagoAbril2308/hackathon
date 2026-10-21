/** Manifest de la PWA (PWA-03). Lo usa vite.config.js y lo verifican las pruebas. */
export const manifest = {
  id: '/',
  name: 'Ruta Serena',
  short_name: 'Ruta Serena',
  description: 'Líneas de apoyo y servicios de salud mental verificados en Villavicencio y el Meta.',
  lang: 'es-CO',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F8F6F0',
  theme_color: '#164F3B',
  categories: ['health', 'lifestyle'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icono.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
  shortcuts: [
    {
      name: 'Líneas de apoyo',
      short_name: 'Apoyo',
      description: 'Ver el 123 y las líneas de apoyo, también sin conexión',
      url: '/apoyo',
      icons: [{ src: '/icons/atajo-apoyo-96.png', sizes: '96x96', type: 'image/png' }],
    },
  ],
};
