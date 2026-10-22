# Declaración de trabajo previo, herramientas y uso de IA — Ruta Serena

**Proyecto:** Ruta Serena, un directorio y navegador de servicios de salud mental para Villavicencio y el Meta.

**Evento:** Hackathon Villavicencio 2026, entregado el 22 de octubre de 2026.

**Repositorio:** https://github.com/SantiagoAbril2308/hackathon

## Equipo

| Integrante |
| --- |
| Brayan Richer Claros |
| Santiago Abril Monroy |
| Frederick Abril |

## Trabajo previo reutilizado (GastroApp)

**GastroApp** es un proyecto propio y anterior del equipo. Para Ruta Serena **solo se reutilizó el concepto**: la experiencia y la forma de estructurar y construir una aplicación (organización del proyecto y flujo de desarrollo).

**No se reutilizó código, datos, diseño visual ni contenido de GastroApp.** Todo el código, la base de datos, los textos y el diseño de Ruta Serena se crearon para esta hackathon.

## Trabajo hecho durante la hackathon

- Backend:
  - API con Node.js y Express.
  - Esquema de base de datos.
  - Datos sintéticos de prueba.
  - Scraper de fuentes oficiales con lista blanca.
  - Tareas programadas.
  - Asistente con límites.
- Frontend:
  - Web y PWA con React.
  - Diseño adaptable para móvil, tablet y computador.
  - Panel de administración.
  - Modo sin conexión.
  - Acceso rápido.
- Diseño visual ("Propuesta 2 — Claridad que acompaña"), hecho por el equipo en Figma.
- APK Android (Trusted Web Activity) con Digital Asset Links y QR.
- Despliegue en Vercel (web) y Render (API), con base de datos en TiDB Cloud.
- Pruebas automatizadas, evaluación del asistente y evidencia TRL 4 (ver [evidencia.md](evidencia.md)).

## Herramientas

| Herramienta | Uso |
| --- | --- |
| Visual Studio Code | Editor |
| Git y GitHub | Control de versiones, repositorio y release de la APK |
| Node.js 22 y npm | Ejecución y dependencias |
| TiDB Cloud Serverless | Base de datos MySQL con TLS |
| Render (plan gratuito) | Publicación de la API |
| Vercel | Publicación de la web y la PWA |
| Figma | Referencia de diseño de las pantallas |
| Android Studio, JDK 17 y Android SDK | Compilación de la APK |
| gitleaks | Detección de secretos antes de cada commit |
| Microsoft Edge (sin interfaz) | Pruebas de punta a punta y accesibilidad |
| Anthropic API (Claude Haiku 5.5) | Modelo del asistente dentro de la app |
| Claude Code (Anthropic) | Asistente de programación (ver la sección de uso de IA) |

## Componentes de terceros y licencias

Todos son de código abierto y se usan según sus licencias.

### Backend

| Componente | Versión | Licencia |
| --- | --- | --- |
| express | 5.3.0 | MIT |
| mysql2 | 3.24.6 | MIT |
| zod | 4.6.7 | MIT |
| jsonwebtoken | 9.0.3 | MIT |
| bcrypt | 6.0.0 | MIT |
| helmet | 8.3.0 | MIT |
| cors | 2.8.6 | MIT |
| express-rate-limit | 8.7.1 | MIT |
| node-cron | 4.6.0 | ISC |
| axios | 1.20.0 | MIT |
| cheerio | 1.2.0 | MIT |
| @anthropic-ai/sdk | 0.137.0 | MIT |
| dotenv | 18.0.8 | BSD-2-Clause |
| vitest, supertest | 5.0.5, 7.3.1 | MIT |

### Frontend

| Componente | Versión | Licencia |
| --- | --- | --- |
| react, react-dom | 19.3.1 | MIT |
| react-router-dom | 7.18.4 | MIT |
| vite, vite-plugin-pwa | 8.3.4, 2.0.0 | MIT |
| workbox (core, precaching, routing, strategies, expiration) | 7.4.1 | MIT |
| leaflet | 1.9.4 | BSD-2-Clause |
| lucide-react (iconos) | 1.60.0 | ISC |
| Fraunces y Manrope (@fontsource) | 5.3.0 | SIL Open Font License 1.1 |
| @testing-library/*, jsdom | 16.3.3, 14.6.8, 7.0.1 / 29.1.1 | MIT |
| fake-indexeddb | 6.2.6 | Apache-2.0 |
| puppeteer-core | 25.15.0 | Apache-2.0 |
| axe-core | 4.14.0 | MPL-2.0 |
| sharp | 0.35.5 | Apache-2.0 |

### Android

| Componente | Versión | Licencia |
| --- | --- | --- |
| @bubblewrap/core | 1.25.0 | Apache-2.0 |
| qrcode | 1.5.4 | MIT |

### Datos y servicios

| Componente | Licencia o condición |
| --- | --- |
| Mapas de OpenStreetMap | © colaboradores de OpenStreetMap, ODbL. La atribución se muestra en el mapa |
| Ilustraciones, logo e iconos de la app | Creación propia del equipo |

Las herramientas de pruebas y de compilación (puppeteer-core, axe-core, sharp, Bubblewrap) solo se usan en el computador de desarrollo; **no se incluyen** en la web ni en la APK.

## Uso de Claude como herramienta de IA

El equipo usó **Claude (Anthropic)** de dos formas.

### 1. Como asistente de desarrollo, mediante Claude Code

- **Para qué:**
  - Generar código del backend, del frontend y de los scripts.
  - Escribir pruebas automatizadas.
  - Diagnosticar y corregir errores (por ejemplo, las conexiones caídas con TiDB y la compatibilidad de JDK al compilar la APK).
  - Revisar accesibilidad y diseño adaptable.
  - Redactar la documentación.
- **Bajo dirección del equipo:** el equipo definió los requisitos, las reglas del reto, la referencia visual (Figma), las decisiones de despliegue y la gestión de la clave de firma. El equipo revisó, probó y aprobó cada fase antes de continuar.
- **Credenciales y datos:** los secretos (base de datos, JWT y clave de Anthropic) se configuraron directamente en archivos locales y en los paneles de Render y Vercel, sin compartirlos en las conversaciones. No se usaron datos personales reales.

### 2. Como componente de la app: el asistente de información

El asistente usa **Claude Haiku 5.5** mediante la API de Anthropic, con estos límites:

- **Capa de emergencia antes del modelo:** si se detecta una expresión de riesgo, se responde un mensaje fijo con las líneas de emergencia, sin llamar a la IA.
- **Instrucciones fijas:** el modelo no diagnostica, no recomienda tratamientos ni medicamentos y no evalúa a la persona.
- **Contexto limitado:** solo recibe servicios verificados y sin teléfonos.
- **Revisión de cada respuesta:** se descartan los ids que no estén en el contexto y se reemplaza cualquier contenido clínico o teléfono.
- **Privacidad:** las conversaciones no se guardan en el servidor ni en el navegador.
- **Evaluación:** con 40 mensajes sintéticos se obtuvo 100 % sin consejos clínicos, sin ids inventados, sin teléfonos inventados y con la capa de emergencia correcta (ver [eval-chat.md](eval-chat.md)).

La app aclara en pantalla: *"Soy un asistente de información, no un profesional de salud."*

> Si algún integrante usó otra herramienta de IA durante el reto, debe agregarse en esta sección antes de la entrega.
