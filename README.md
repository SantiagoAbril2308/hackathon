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
