# Ruta Serena — Resumen del trabajo realizado

Qué se ha construido, cómo y con qué herramientas. Estado al **21 de octubre de 2026** (entrega: 22 de octubre de 2026).

Repositorio: https://github.com/SantiagoAbril2308/hackathon

---

## 1. Qué es

**Ruta Serena** es un directorio y navegador de servicios de salud mental para Villavicencio y el Meta. Ayuda a encontrar líneas de apoyo y servicios institucionales verificados, mostrando siempre la **fuente oficial** y la **fecha de verificación**.

No diagnostica, no recomienda tratamientos ni medicamentos, no ofrece ejercicios terapéuticos y no evalúa riesgo. En todas las pantallas públicas aparece el aviso: *"Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123."*

Meta del reto: **TRL 4**, es decir, funciones críticas integradas y probadas en un entorno controlado con **datos sintéticos**.

---

## 2. Estado por fase

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0 | Estructura del monorepo, configuración, gitleaks, README | ✅ Terminada |
| 1 | Base de datos (esquema, datos sintéticos, conexión TLS, scripts) | ✅ Terminada |
| 2 | API pública y de administración | ✅ Terminada |
| 3 | Scraper de fuentes oficiales y tareas programadas | ✅ Terminada |
| 4 | Asistente con límites y evaluación de 40 mensajes | ✅ Terminada |
| 5 | Frontend web y PWA (con el diseño de Figma) | ✅ Terminada |
| — | Diseño adaptable (móvil, tablet y computador) y correcciones | ✅ Terminado |
| 6 | Evidencia TRL 4, declaración y tabla de fuentes | ⏳ Pendiente |
| 7 | Despliegue (Render + Vercel) | ⏳ Pendiente |
| 8 | APK con Capacitor (solo si se pide) | ⏳ Opcional |

---

## 3. Arquitectura

```
Navegador / PWA (React + Vite)          API (Node.js + Express)            Base de datos
───────────────────────────────        ─────────────────────────          ───────────────────
Pantallas públicas y panel admin  ──►   /api/* (público, con límite)  ──►  TiDB Cloud Serverless
Service worker (sin conexión)           /api/admin/* (JWT)                 (MySQL, puerto 4000, TLS)
IndexedDB (copia del directorio)        /api/chat ──► Anthropic (Claude Haiku 5.5)
                                        Tareas programadas (node-cron):
                                        scraper de fuentes + vencimiento
```

- **Monorepo:** `backend/` (API) y `frontend/` (web + PWA); la documentación está en `docs/`.
- **Datos:** 100 % sintéticos en el seed y las pruebas. Teléfonos con formato `000-000-00XX`, dominios `.example` y `es_sintetico = true`.
- **Las pruebas de integración usan una base aparte** (`ruta_serena_test`) para no tocar la de desarrollo.

---

## 4. Qué se hizo y cómo

### 4.1 Fase 0 — Estructura y seguridad del repositorio
- Árbol de carpetas `backend/` y `frontend/`, `.env.example` sin valores, `.gitignore` (los `.env` nunca se suben) y README con instalación, configuración y ejecución.
- **gitleaks antes de cada commit:** un hook de Git (`.githooks/pre-commit`) bloquea el commit si detecta secretos o si alguien intenta subir un `.env`. Hay reglas propias para claves de Anthropic, cadenas de conexión MySQL y variables secretas.

### 4.2 Fase 1 — Base de datos
- **Esquema** (`backend/db/schema.sql`): 8 tablas, `admins`, `fuentes`, `servicios`, `canales`, `verificaciones`, `cambios_pendientes`, `reportes` y `actividades`, con utf8mb4, InnoDB, índices y llaves foráneas. Se agregó la columna `prioridad` en `servicios` para que los reportes ciudadanos la suban.
- **Datos sintéticos** (`backend/db/seed.sql`): 20 servicios ficticios (2 de emergencia), 28 canales, 3 fuentes y 5 actividades. Las coordenadas son de barrios reales de Villavicencio, pero los nombres son ficticios. Las fechas se calculan relativas a hoy, para que siempre haya servicios vencidos.
- **Conexión** (`backend/src/db/pool.js`): mysql2 con TLS 1.2 o superior y validación de certificado, hasta 10 conexiones y hora de Colombia.
- **Scripts:** `npm run db:migrate`, `db:seed` (crea el administrador con bcrypt a partir del `.env`) y `db:check` (conteos por tabla y controles del reglamento).

### 4.3 Fase 2 — API
- **Regla única de vigencia:** un servicio se muestra como vigente solo si tiene estado `vigente`, `url_fuente`, `fecha_verificacion` y lleva 30 días o menos sin verificar. Si no, aparece como **"en revisión"**.
- **Rutas públicas:** `salud`, `servicios` (con filtros por tema, público, modalidad y texto), detalle, `emergencia`, `directorio.json` (copia para uso sin conexión), `reportes` y `actividades`. Todas con límite de peticiones.
- **Reportes ciudadanos** ("este número no funciona"): son anónimos, sin IP ni datos personales. Suben la prioridad del servicio y, con 3 reportes desde la última verificación, lo pasan a revisión.
- **Administración con JWT:**
  - Inicio de sesión y gestión completa de servicios (retirarlos no los borra), canales y fuentes.
  - Verificación de servicios.
  - Cambios pendientes, que se aprueban o rechazan.
  - Reportes, actividades y ejecución manual del scraper.
- **Validación** de todas las entradas con zod (mensajes en español) y un manejador central de errores.

### 4.4 Fase 3 — Scraper y tareas programadas
- **Scraper** (`backend/src/services/scraper.js`):
  - Solo lee dominios de una lista blanca (`SCRAPER_LISTA_BLANCA`) y solo por https.
  - Bloquea las redirecciones hacia otros dominios y respeta `robots.txt`.
  - Hace como máximo 1 solicitud cada 5 segundos por dominio y se identifica como `RutaSerenaBot/1.0`.
- **Extracción:** toma el bloque marcado por `selector_css`, busca teléfonos colombianos (fijos `60…`, celulares `3…` y líneas cortas de 3 dígitos) y calcula un hash SHA-256 del bloque.
- **Nunca modifica `servicios`:** solo propone cambios en `cambios_pendientes`, que un administrador debe aprobar.
- **Tareas programadas** (node-cron, hora de Colombia): el scraper según `SCRAPER_CRON` y un vencimiento diario que pasa a revisión lo que supera los 30 días.

### 4.5 Fase 4 — Asistente (`POST /api/chat`)
1. **Capa de emergencia antes del modelo** (`backend/src/config/emergencia.js`): si el mensaje contiene una expresión de la lista, se responde un mensaje fijo con las líneas de emergencia, sin llamar a la IA y sin calcular ni guardar riesgo.
2. **Prefiltro SQL** por palabras clave: máximo 8 servicios vigentes del tema; si no hay, los de tema general.
3. **Llamada a Claude Haiku 5.5:**
   - El system prompt es el definido en el reto.
   - Los servicios van como contexto, **sin teléfonos**.
   - Se envían como máximo 6 turnos de historial.
   - La respuesta tiene que ser JSON según un esquema.
   - No se guarda nada.
4. **Revisión de la salida:**
   - Se descartan los ids que no estén en el contexto.
   - Si el texto trae consejos clínicos o teléfonos, se reemplaza.
   - Si la API falla, se responde con las líneas de emergencia.
5. **Evaluación** (`npm run eval:chat`) con 40 mensajes sintéticos. El resultado es **100 %** sin consejos clínicos, sin ids inventados, sin teléfonos inventados y con la capa de emergencia correcta. Costo: US$ 0,008. El reporte está en `docs/eval-chat.md`.

### 4.6 Fase 5 — Frontend y PWA
- **Diseño "Propuesta 2 — Claridad que acompaña"** (tomado de la referencia en Figma):
  - Tipografías Fraunces y Manrope, logo de sol y hojas, e ilustración del camino.
  - Modo claro y oscuro.
- **Pantallas públicas:** bienvenida en 3 pasos, inicio, `/apoyo`, directorio y detalle, mapa (Leaflet + OpenStreetMap), asistente, actividades, ajustes y acerca.
- **Panel de administración:** cambios pendientes, servicios con sus canales, verificación, reportes, actividades y fuentes.
- **Tarjeta de servicio:** botón de llamar (`tel:`), WhatsApp (`wa.me`), horario, costo, fuente enlazada, fecha de verificación y "Este número no funciona".
- **PWA:**
  - Service worker propio que precarga la app y guarda `/api/directorio.json`.
  - Copia del directorio en IndexedDB, con la fecha de "Última actualización".
  - Manifest con atajo a `/apoyo`, e iconos SVG y PNG con badge monocromático.
- **Acceso rápido:** notificación silenciosa con `registration.showNotification()` que abre `/apoyo`. El permiso se pide solo al activarla y vuelve a mostrarse al abrir la app.

### 4.7 Diseño adaptable y correcciones posteriores
- **Celular** (menos de 768 px): barra de navegación inferior.
- **Tablet y computador:** cabecera superior con "Necesito apoyo ahora" siempre visible, tarjetas en 2 o 3 columnas y vistas en dos paneles (inicio, detalle, mapa y bienvenida).
- **Correcciones:**
  - Contraste de botones en el modo oscuro automático.
  - Marcadores del mapa que no se veían.
  - Desborde horizontal en pantallas de 320 px.
  - Barra de mensaje del asistente de borde a borde.
  - En desarrollo se quita el service worker viejo, que mostraba una versión anterior desde la caché.
  - **Conexiones cerradas por TiDB Serverless:** el pool cierra las inactivas antes y las consultas tienen tiempo máximo y reintento. Esto evitaba los errores 500 en actividades y el chat colgado.

---

## 5. Cómo se cumplen las reglas del reto

| Regla | Cómo se cumple |
| --- | --- |
| No diagnostica, no trata, no evalúa riesgo | El system prompt lo prohíbe y la salida se revisa (y reemplaza) si hay contenido clínico. La capa de emergencia no calcula ni guarda riesgo. La evaluación de 40 mensajes da 100 %. |
| Cero datos reales | Seed y pruebas sintéticos (`000-000-00XX`, `.example`, `es_sintetico`). `db:check` y las pruebas lo verifican. |
| Cero credenciales en el repositorio | `.env` en `.gitignore` y `.env.example` sin valores. gitleaks corre antes de cada commit y se escaneó el historial completo antes de subirlo. |
| Fuente y fecha | Una sola regla de vigencia en SQL. Más de 30 días = "en revisión" (en la API y con el job diario). |
| Sin cuentas públicas, sin guardar conversaciones, sin registrar IPs | El chat vive solo en la pantalla (está probado). Los reportes son anónimos. No hay registro de peticiones. |
| Aviso del 123 en todas las pantallas públicas | Va en el pie de todas las pantallas y lo verifican pruebas automáticas en 11 rutas. |
| Lenguaje amable, sin iconos estigmatizantes | Textos sencillos e iconos neutros (Lucide). |
| Accesibilidad WCAG 2.1 AA | axe-core sin violaciones en 10 pantallas y 3 modos de color, controles de al menos 48 px y foco visible. Dos colores de la referencia se oscurecieron para alcanzar 4,5:1. |

---

## 6. Con qué se hizo

### Lenguajes y servicios
- **JavaScript** con Node.js 22 (el proyecto requiere 20 o superior) y React 19.
- **TiDB Cloud Serverless** (compatible con MySQL) como base de datos.
- **Anthropic API** con el modelo `claude-haiku-5-5`, solo para el asistente.
- **OpenStreetMap** para los mapas.
- **Git + GitHub** para el control de versiones, y **gitleaks** 8.30.1 para detectar secretos.

### Dependencias del backend

| Paquete | Versión | Uso | Licencia |
| --- | --- | --- | --- |
| express | 5.3.0 | Servidor HTTP y rutas | MIT |
| mysql2 | 3.24.6 | Conexión a TiDB/MySQL con TLS | MIT |
| zod | 4.6.7 | Validación de entradas | MIT |
| jsonwebtoken | 9.0.3 | Sesión de administradores (JWT) | MIT |
| bcrypt | 6.0.0 | Hash de contraseñas | MIT |
| helmet | 8.3.0 | Cabeceras de seguridad | MIT |
| cors | 2.8.6 | Orígenes permitidos | MIT |
| express-rate-limit | 8.7.1 | Límite de peticiones | MIT |
| node-cron | 4.6.0 | Tareas programadas | ISC |
| axios | 1.20.0 | Peticiones del scraper | MIT |
| cheerio | 1.2.0 | Lectura del HTML de las fuentes | MIT |
| @anthropic-ai/sdk | 0.137.0 | Llamadas al modelo del asistente | MIT |
| dotenv | 18.0.8 | Variables de entorno | BSD-2-Clause |
| vitest / supertest | 5.0.5 / 7.3.1 | Pruebas | MIT |

### Dependencias del frontend

| Paquete | Versión | Uso | Licencia |
| --- | --- | --- | --- |
| react / react-dom | 19.3.1 | Interfaz | MIT |
| react-router-dom | 7.18.4 | Rutas | MIT |
| vite | 8.3.4 | Servidor de desarrollo y build | MIT |
| vite-plugin-pwa | 2.0.0 | PWA (estrategia `injectManifest`) | MIT |
| workbox-* | 7.4.1 | Service worker (caché y rutas sin conexión) | MIT |
| leaflet | 1.9.4 | Mapa | BSD-2-Clause |
| lucide-react | 1.60.0 | Iconos | ISC |
| @fontsource/fraunces, @fontsource/manrope | 5.3.0 | Tipografías empaquetadas | OFL-1.1 |
| vitest, @testing-library/*, jsdom | 5.0.5 / 16–14 / 29.1.1 | Pruebas de componentes | MIT |
| fake-indexeddb | 6.2.6 | IndexedDB simulado en pruebas | Apache-2.0 |
| puppeteer-core | 25.15.0 | Prueba de punta a punta en Edge/Chrome real | Apache-2.0 |
| axe-core | 4.14.0 | Auditoría de accesibilidad | MPL-2.0 |
| sharp | 0.35.5 | Generación de iconos PNG | Apache-2.0 |

Datos del mapa: © colaboradores de OpenStreetMap (ODbL).

### Herramienta de IA
El desarrollo se hizo con **Claude (Anthropic), mediante Claude Code**, como herramienta de asistencia de programación, siguiendo las especificaciones, la referencia de diseño y las decisiones del equipo. Debe declararse en `docs/declaracion.md`, porque lo exige el reglamento.

---

## 7. Pruebas y evidencia

| Prueba | Comando | Resultado |
| --- | --- | --- |
| Backend: unitarias + integración (Supertest contra `ruta_serena_test`) | `cd backend && npm test` | **138/138** |
| Frontend: componentes y servicios (Vitest + Testing Library) | `cd frontend && npm test` | **54/54** |
| Evaluación del asistente (40 mensajes, API real) | `cd backend && npm run eval:chat` | **100 %** en las métricas obligatorias |
| PWA de punta a punta en Edge real | `cd frontend && npm run e2e:pwa` | **13/13** |

Casos del reto ya cubiertos por estas pruebas:
- **CP-01:** directorio con fuente y fecha.
- **CP-02:** un servicio vencido aparece "en revisión".
- **CP-03:** el scraper crea un cambio pendiente sin publicarlo.
- **CP-04:** `/apoyo` abre en menos de 150 ms (meta: menos de 2 s).
- **CP-05:** `/apoyo` funciona sin servidor y sin red.
- **CP-07 a CP-10:** el asistente con un pedido normal, un pedido de diagnóstico, una emergencia y un servicio inexistente.
- **CP-11:** un reporte sube la prioridad.
- **CP-12:** accesibilidad automática con axe-core.

Reportes en `docs/eval-chat.md` y `docs/e2e-pwa.md`.

**Falta verificar a mano:**
- Navegar con un lector de pantalla (NVDA o TalkBack) para CP-12.
- Tocar la notificación en un celular Android (PWA-07).

---

## 8. Decisiones y cambios frente a la especificación

1. **Columna `prioridad` en `servicios`:** se agregó para que los reportes ciudadanos tengan dónde subir la prioridad.
2. **Retirar en vez de borrar:** "eliminar" un servicio lo pasa a `retirado` y desactivar una fuente la deja inactiva. Así se conserva el historial.
3. **Reportes desde la última verificación:** cuentan solo los posteriores a la última verificación, para que los viejos no devuelvan un servicio a revisión.
4. **Contexto del asistente sin teléfonos:** las tarjetas los toman de la base de datos, así el modelo no puede inventarlos.
5. **Detector de consejos clínicos:** no cuenta como consejo un término dentro de un rechazo explícito ("no puedo darte dosis…"), pero sí una frase como "no te preocupes, respira profundo".
6. **Colores ajustados para cumplir WCAG AA:** emergencia con texto blanco `#E6604C` → `#C2432F`, y texto secundario `#687A73` → `#5A6B64`.
7. **Bienvenida con salida directa:** tiene el enlace "Necesito apoyo ahora", para que nadie en crisis tenga que pasar los 3 pasos.
8. **Sin "Usuarios" en el panel:** no hay cuentas públicas. En su lugar se agregaron "Verificar" y "Fuentes oficiales".
9. **Puppeteer:** no se usó para el scraper porque ninguna fuente lo necesita. Se usa `puppeteer-core` solo para las pruebas, con el Edge ya instalado.
10. **Commits sin coautor de IA:** se quitó la línea de coautoría de todos los commits, por pedido del equipo.

---

## 9. Pendiente

- **Fase 6:** `docs/evidencia.md` (tabla CP-01 a CP-12), `docs/declaracion.md` (trabajo previo reutilizado de GastroApp, herramientas, licencias y uso de IA) y `docs/fuentes.md` (fuentes oficiales con la columna de fecha vacía).
- **Fase 7:**
  - Preparar `render.yaml` (backend) y `vercel.json` (frontend).
  - Configurar las variables de entorno en cada servicio.
  - Plan para las tareas programadas, porque Render gratis "duerme" el servidor cuando no tiene tráfico.
- **Otros:** archivo `LICENSE` (el README dice MIT), confirmar los dominios oficiales de la lista blanca del scraper y las pruebas manuales en Android y con lector de pantalla.

---

## 10. Cómo ejecutarlo

```bash
# Backend (puerto 3000). Requiere backend/.env lleno (ver backend/.env.example)
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (puerto 5173), en otra terminal
cd frontend
npm install
npm run dev     # con VITE_API_URL=http://localhost:3000 en frontend/.env
```

Para probar la PWA (sin conexión y notificación) hay que usar la versión compilada, con el backend corriendo:

```bash
cd frontend
npm run build
npx vite preview --port 5173
```

---

## 11. Historial de commits

| Commit | Fecha | Descripción |
| --- | --- | --- |
| aee9669 | 2026-10-20 | Fase 0: estructura del monorepo, configuración y pruebas base |
| 18a48fc | 2026-10-20 | Fase 1: esquema, seed sintético, pool TLS y scripts de base de datos |
| f2e0207 | 2026-10-20 | Fase 2: API pública y de administración con validación y pruebas |
| 2f8f613 | 2026-10-20 | Fase 3: scraper con lista blanca y robots.txt, jobs de scraper y vencimiento |
| 2cd61dc | 2026-10-20 | Fase 4: asistente con límites (POST /api/chat) y evaluación de 40 mensajes |
| b5a22ea | 2026-10-20 | Fase 5: frontend web y PWA con el diseño "Claridad que acompaña" |
| fc767da | 2026-10-20 | Diseño adaptable: móvil, tablet y computador |
| 1f638be | 2026-10-21 | Desarrollo: quitar service worker y caché de builds anteriores |
| 7346087 | 2026-10-21 | Base de datos: recuperar conexiones cerradas por TiDB Serverless |
| 64ecb4a | 2026-10-21 | Asistente: barra de mensaje de borde a borde |
