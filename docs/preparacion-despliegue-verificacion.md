# Verificación de la preparación del despliegue

Fecha: 21 de octubre de 2026, Colombia. Rama: `feat/redesign-ruta-serena`.
Alcance: preparación local; **sin despliegue, commit, push, migraciones, seed ni llamadas a servicios reales de apoyo**.

## Archivos de esta preparación

- Configuración: `render.yaml`, `frontend/vercel.json`, `frontend/.vercelignore`, `.gitignore`, `frontend/.env.example`.
- Comprobación de publicación: `frontend/scripts/validar-despliegue.mjs`, `frontend/package.json`.
- Instalación: `frontend/src/services/instalacion.js`, `frontend/src/components/InstalarAplicacion.jsx`,
  `frontend/src/main.jsx`, `frontend/src/pages/Ajustes.jsx`, `frontend/src/styles/global.css`.
- Pruebas nuevas: `frontend/src/services/instalacion.test.jsx`, `frontend/src/pwa/despliegue.test.js`.
- Documentación: `docs/despliegue.md` y este reporte.

Los cambios anteriores de logo, paisajes, Inicio y Bienvenida permanecen en el árbol de trabajo;
no se reemplazan ni se incluyen como cambios nuevos de esta preparación.

## Resultados obtenidos

| Comprobación | Resultado | Alcance y limitaciones |
| --- | --- | --- |
| `npm.cmd test`, desde `frontend` | 78/78 pruebas, 11 archivos aprobados | Incluye las 54 anteriores, 8 de instalación voluntaria y 16 de configuración de publicación |
| `npm.cmd run build`, desde `frontend` | Correcto; PWA compilada con 55 entradas de precarga | Persiste el aviso previo de `inlineDynamicImports` de Vite; no bloquea el build |
| `npm.cmd run deploy:check` con HTTP/localhost | Rechazado, como se esperaba | Se comprueba la protección contra una publicación mal configurada; no es un fallo de la aplicación |
| `deploy:check` con un origen HTTPS de prueba | Aceptado | Solo sintaxis; no se ha contactado ni certificado ese dominio como API disponible |
| `render.yaml` | Válido contra el esquema completo publicado por Render | No se ha aplicado en una cuenta ni se han creado recursos |
| `frontend/vercel.json` | Válidos todos los campos utilizados frente al esquema publicado | La validación completa del metaesquema oficial falla en campos experimentales no usados; se validó la configuración contra las definiciones aplicables. Falta validación en Vercel |
| Ajustes en Chrome aislado | 12 combinaciones sin desbordamiento | 320, 360, 390, 768, 1024 y 1440 px, en claro y oscuro |
| Axe, WCAG 2.1 AA | Sin infracciones detectadas en los análisis ejecutados | Instrucciones abiertas, 390 y 1440 px, ambos temas. No sustituye revisión con lector de pantalla |
| Permisos de notificaciones | Ninguna solicitud al entrar ni al instalar | El permiso sigue siendo independiente y voluntario en Acceso rápido |
| Oferta de instalación descartada | Correcto | No se insiste ni se reutiliza la confirmación consumida |
| Confirmación y `appinstalled` | Correcto en simulación | Se espera el evento de instalación antes de mostrar el estado instalado; no demuestra una instalación física |
| Apertura en modo standalone | Reconocida en simulación | Falta comprobar Android y iPhone reales |
| Tema automático | Responde a claro y oscuro del sistema | Se conserva la preferencia y la lógica existente |
| Sin conexión | Instrucciones de instalación y `/apoyo` accesibles | Servidor local apagado y red cortada, tras la carga y precarga inicial |
| `git diff --check` | Sin errores | No se descartan cambios anteriores |
| Backend, base de datos y service worker | Código conservado | No se iniciaron los jobs ni se ejecutaron las pruebas del backend que preparan una base de datos |

El navegador usa los fixtures sintéticos existentes de `frontend/src/test/datos.js`, dentro de un servidor aislado.
Las ofertas y confirmaciones de instalación se simulan para comprobar el comportamiento de la interfaz.
No se probó Web Push ni se habilitaron avisos remotos: esa función no existe todavía.

Durante la verificación se corrigió un error del arnés de navegador al desactivar la interceptación de peticiones;
la ejecución final completó el escenario offline. No se cambiaron pruebas existentes para forzar resultados.
Las dependencias del validador de esquemas se usaron en una carpeta temporal, fuera del proyecto.

## Pendiente antes de publicar

Seguir `docs/despliegue.md`: revisión de la rama y sus cambios, autorización del despliegue, credenciales
en los paneles seguros, URL real HTTPS de la API, CORS explícito, diferenciación de datos sintéticos,
salvaguardas del asistente, pruebas físicas, QR con la URL final y plan de tareas programadas.

El Blueprint mantiene `JOBS_ACTIVOS=false` en la demostración para no escribir sobre la base al arrancar.
El asistente necesita configurar sus variables privadas de IA tras revisar las salvaguardas; sin ellas usa su respaldo.
Estas limitaciones impiden considerar esta preparación como una operación pública completa.

Esquemas técnicos consultados:

- https://openapi.vercel.sh/vercel.json
- https://render.com/schema/render.yaml.json
