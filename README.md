# Ruta Serena

Directorio y navegador de servicios de salud mental para Villavicencio y el Meta (Colombia). Ayuda a encontrar líneas de apoyo y servicios institucionales verificados, siempre con **fuente oficial** y **fecha de verificación** visibles.

> Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.

Hackathon Villavicencio 2026 · Entrega: 22 de octubre de 2026 · Meta: TRL 4 (funciones críticas integradas y probadas en entorno controlado con datos sintéticos).

## Qué hace y qué NO hace

| Hace | No hace |
| --- | --- |
| Muestra servicios verificados con fuente y fecha | No diagnostica ni evalúa riesgo |
| Marca "en revisión" lo que lleva más de 30 días sin verificar | No recomienda tratamientos ni medicamentos |
| Funciona sin conexión para las líneas de apoyo | No incluye ejercicios terapéuticos ni de respiración |
| Asistente que solo orienta hacia servicios del directorio | No guarda conversaciones, no tiene cuentas públicas, no registra IPs |

## Estructura

```
ruta-serena/
  backend/    API Node.js + Express + MySQL (TiDB Cloud Serverless)
  frontend/   React + Vite + PWA + Leaflet/OpenStreetMap
  docs/       evidencia TRL 4, fuentes oficiales y declaración
```

## Requisitos

- Node.js 20 o superior y npm
- Git
- [gitleaks](https://github.com/gitleaks/gitleaks) (obligatorio para hacer commits): `winget install Gitleaks.Gitleaks`
- Una base de datos en TiDB Cloud Serverless (puerto 4000, TLS)
- Una API key de Anthropic (solo para el asistente)

## Instalación

```bash
git clone <url-del-repo> ruta-serena
cd ruta-serena
git config core.hooksPath .githooks
cd backend && npm install
cd ../frontend && npm install
```

## Configuración

1. Copia `backend/.env.example` a `backend/.env` y llena:
   - `DB_HOST`, `DB_PORT` (4000), `DB_USER`, `DB_PASSWORD`, `DB_NAME` (ruta_serena)
   - `JWT_SECRET`: cadena aleatoria larga (por ejemplo `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`
   - `CORS_ORIGIN`: `http://localhost:5173` en desarrollo
   - `SCRAPER_CRON` (por defecto `0 3 * * *`) y `DIAS_VIGENCIA` (por defecto 30)
   - `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD`: administrador inicial
2. Copia `frontend/.env.example` a `frontend/.env` y llena `VITE_API_URL` (`http://localhost:3000` en desarrollo).

Los archivos `.env` están en `.gitignore` y el hook de pre-commit bloquea cualquier intento de subirlos.

## Ejecución

```bash
# Backend (puerto 3000)
cd backend
npm run db:migrate   # crea las tablas (fase 1)
npm run db:seed      # carga datos sintéticos y el admin (fase 1)
npm run dev

# Frontend (puerto 5173)
cd frontend
npm run dev
```

## API

Un servicio se publica como **vigente** solo si tiene `estado = 'vigente'`, `url_fuente`, `fecha_verificacion` y esa fecha no supera `DIAS_VIGENCIA` días. Si no, aparece como `en_revision`.

### Pública (con límite de peticiones; no se registran IPs)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/salud` | Estado de la API y de la base de datos |
| GET | `/api/servicios?tema=&publico=&modalidad=&q=` | Servicios vigentes con canales, fuente y fecha |
| GET | `/api/servicios/:id` | Detalle; si está vencido devuelve `estado: en_revision` |
| GET | `/api/emergencia` | Servicios de emergencia ordenados por `orden` + línea 123 |
| GET | `/api/directorio.json` | Copia de lo vigente con `generado_en` (uso sin conexión) |
| POST | `/api/reportes` | `{ servicio_id, canal_id?, motivo }`. Sube la prioridad; con 3 reportes desde la última verificación pasa a `en_revision` |
| GET | `/api/actividades` | Actividades aprobadas desde hoy |

### Administración (`Authorization: Bearer <token>`)

| Método | Ruta |
| --- | --- |
| POST | `/api/admin/login` |
| GET, POST | `/api/admin/servicios` |
| GET, PUT, DELETE | `/api/admin/servicios/:id` (DELETE = retirar) |
| POST | `/api/admin/servicios/:id/verificar` `{ resultado, nota?, url_fuente? }` |
| GET (`?servicio_id=`), POST | `/api/admin/canales` |
| PUT, DELETE | `/api/admin/canales/:id` |
| GET, POST | `/api/admin/fuentes` |
| GET, PUT, DELETE | `/api/admin/fuentes/:id` (DELETE = desactivar) |
| GET | `/api/admin/cambios?estado=pendiente\|aprobado\|rechazado\|todos` |
| POST | `/api/admin/cambios/:id/aprobar`, `/api/admin/cambios/:id/rechazar` |
| GET | `/api/admin/reportes` |
| GET | `/api/admin/actividades?estado=` |
| POST | `/api/admin/actividades/:id/aprobar`, `/api/admin/actividades/:id/rechazar` |
| POST | `/api/admin/scraper/ejecutar` |

Los errores siempre tienen la forma `{ "error": "...", "detalles"?: [{ "campo", "mensaje" }] }`.

## Frontend (web + PWA)

Diseño "Propuesta 2 — Claridad que acompaña": tipografías Fraunces y Manrope (empaquetadas, funcionan sin conexión), paleta tranquila con modo claro y oscuro.

| Ruta | Pantalla |
| --- | --- |
| `/bienvenida` | 3 pasos, solo la primera vez (con enlace directo a "Necesito apoyo ahora") |
| `/` | Inicio con buscador y botón "Necesito apoyo ahora" |
| `/apoyo` | 123 y líneas de apoyo; ligera y disponible sin conexión |
| `/directorio`, `/directorio/:id` | Directorio con filtros y detalle del servicio |
| `/mapa` | Leaflet + OpenStreetMap (se carga solo en esta ruta) |
| `/asistente` | Asistente con aviso fijo y botón de líneas de emergencia |
| `/actividades`, `/ajustes`, `/acerca` | Actividades aprobadas, preferencias y acceso rápido, información y privacidad |
| `/admin/*` | Login, cambios pendientes, servicios, verificar, reportes, actividades y fuentes |

PWA: service worker propio (`src/sw.js`, estrategia `injectManifest`) que precarga la app y guarda `/api/directorio.json`; copia del directorio en IndexedDB; manifest con atajo a `/apoyo`; iconos en `public/icons` (`npm run icons` los regenera); "Acceso rápido" en Ajustes con una notificación silenciosa creada con `registration.showNotification()`.

Verificación de punta a punta en un navegador real (Chrome o Edge instalado; en Windows ejecútalo desde PowerShell o CMD):

```bash
cd frontend
VITE_API_URL=http://localhost:3000 npm run build
npm run e2e:pwa
```

Requiere el backend corriendo en el puerto 3000. Comprueba service worker, manifest, caché, IndexedDB, notificación, `/apoyo` sin conexión (apaga su propio servidor), tiempos y WCAG 2.1 AA con axe-core. Reporte en `docs/e2e-pwa.md`.

## Asistente (`POST /api/chat`)

`{ "mensaje": "...", "historial"?: [{ "rol": "usuario"|"asistente", "texto": "..." }] }` → `{ origen, emergencia, mensaje, servicios, linea_123, aviso }`. No se guarda nada de la conversación.

1. **Capa de emergencia** (`src/config/emergencia.js`): si el mensaje contiene una expresión de la lista, responde un mensaje fijo y las líneas de emergencia **sin llamar al modelo**. No calcula ni guarda riesgo.
2. **Prefiltro SQL** por palabras clave (`src/config/temasChat.js`): máximo 8 servicios vigentes del tema; si no hay, los de tema `general`.
3. **Modelo** (`ANTHROPIC_MODEL`, por ejemplo `claude-haiku-5-5`): system prompt fijo, CONTEXTO sin teléfonos, máximo 6 turnos de historial y salida JSON forzada por esquema.
4. **Salida segura**: descarta ids que no estén en el CONTEXTO y reemplaza respuestas con consejos clínicos o teléfonos. Si la API falla o el JSON no es válido, responde con las líneas de emergencia.

Límite: 20 mensajes cada 10 minutos por persona.

Evaluación con 40 mensajes sintéticos (`tests/chat-banco.json`), usando la API real (cuesta menos de 1 centavo de dólar):

```bash
cd backend && npm run eval:chat
```

Escribe el reporte en `docs/eval-chat.md`. Meta: 100 % sin consejos clínicos, sin ids inventados, sin teléfonos inventados y con la capa de emergencia correcta.

## Scraper y jobs

El scraper **nunca modifica `servicios`**: solo propone filas en `cambios_pendientes`, que un administrador aprueba o rechaza.

- Solo lee dominios de la lista blanca (`SCRAPER_LISTA_BLANCA`, por defecto `minsalud.gov.co`, `meta.gov.co`, `villavicencio.gov.co` y sus subdominios), solo por https, y bloquea redirecciones hacia otros dominios.
- Respeta `robots.txt` (si no se puede leer, no lee la página), hace como máximo 1 solicitud cada 5 s por dominio y se identifica como `RutaSerenaBot/1.0`.
- Extrae el bloque indicado por `selector_css` de cada fuente, busca teléfonos colombianos (fijos `60…` de 10 dígitos, celulares `3…` de 10 dígitos y líneas cortas de 3 dígitos) y calcula un hash SHA-256. Si el hash cambia, compara los teléfonos con los canales de los servicios de esa fuente y propone los cambios. La primera lectura solo fija la línea base.

Jobs (node-cron, hora de Colombia), activos al iniciar el servidor salvo `JOBS_ACTIVOS=false`:

| Job | Cuándo | Qué hace |
| --- | --- | --- |
| Scraper | `SCRAPER_CRON` (por defecto 3:00 a. m.) | Lee las fuentes activas |
| Vencimiento | 00:05 todos los días y al arrancar | Pasa a `en_revision` lo que supere `DIAS_VIGENCIA` |

Ejecución manual: `npm run jobs:scraper` y `npm run jobs:vencimiento`.

## Pruebas

```bash
cd backend && npm test
cd frontend && npm test
```

Las pruebas de integración del backend usan una base **aparte**, `ruta_serena_test`, en el mismo clúster. La crean y la vuelven a llenar con el seed sintético en cada ejecución; la base de desarrollo no se toca. Sin `DB_HOST` en `backend/.env`, esas pruebas se omiten y solo corren las unitarias.

## Reglas del proyecto

- Cero datos reales: el seed y las pruebas usan servicios ficticios con teléfonos `000-000-00XX` y `es_sintetico = true`.
- Cero credenciales en el repositorio: gitleaks corre antes de cada commit.
- Nada se muestra como vigente sin `url_fuente` oficial y `fecha_verificacion`.
- Lenguaje amable y simple, sin términos clínicos ni iconos estigmatizantes.

## Licencia

MIT
