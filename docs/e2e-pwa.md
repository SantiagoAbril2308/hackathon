# Verificación de punta a punta de la PWA — Ruta Serena

Fecha: 2026-10-21T04:28:43.491Z · Navegador: msedge.exe sin interfaz (móvil 390×844) · Datos sintéticos · Comando: `npm run e2e:pwa`

| Caso | Verificación | Resultado | Detalle |
| --- | --- | --- | --- |
| PWA-02 | Service worker propio instalado y controlando la app | ✅ | 49 archivos precargados (incluye index.html, JS, CSS, fuentes e iconos) |
| PWA-03 | Manifest con nombre, standalone, iconos 192/512 y atajo a /apoyo | ✅ | 4 iconos + atajo "Líneas de apoyo" |
| CP-01 | Directorio con fuente y fecha de verificación en cada tarjeta | ✅ | 16 tarjetas, todas con fuente enlazada y fecha |
| PWA-02 | /api/directorio.json queda en caché y en IndexedDB | ✅ | caché SW: 1 · IndexedDB: 16 servicios (guardado 2026-10-21T04:26:48.926Z) |
| PWA-05/06 | Activar "Acceso rápido" muestra la notificación con showNotification() | ✅ | "Ruta Serena: Toca para ver líneas de apoyo" · silenciosa · abre /apoyo |
| PWA-08 | La preferencia se guarda en IndexedDB y la notificación vuelve a mostrarse al abrir la app | ✅ | notificación cerrada → al abrir la app se mostró de nuevo |
| CP-04 | Abrir /apoyo (destino de la notificación) muestra el 123 en menos de 2 s | ✅ | 147 / 146 / 140 ms (máx. 147 ms) |
| CP-05 | /apoyo funciona sin conexión (servidor apagado y red cortada) | ✅ | 123 visible en 141 ms sin servidor ni red · 7 líneas desde la copia · el directorio también abre |
| CP-12 | WCAG 2.1 AA con axe-core (modo claro) en 10 pantallas | ✅ | sin violaciones |
| CP-12 | WCAG 2.1 AA con axe-core (modo oscuro del sistema) en 10 pantallas | ✅ | sin violaciones |
| CP-12 | WCAG 2.1 AA con axe-core (modo oscuro elegido en Ajustes) en 10 pantallas | ✅ | sin violaciones |
| RESP | Sin desborde horizontal en 320, 375, 768, 1024, 1440 px (10 pantallas) | ✅ | 50 combinaciones sin desborde |
| A11Y | Botones y controles de al menos 48 px | ✅ | todos ≥ 48 px |

Limitaciones: el toque físico sobre la notificación (PWA-07) no se puede automatizar sin interfaz; su lógica tiene prueba unitaria
(`src/pwa/pwa.test.js`) y se valida a mano en Android. CP-04 mide la apertura de /apoyo, que es lo que hace notificationclick.
