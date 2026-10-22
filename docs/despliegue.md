# Preparación del despliegue — Ruta Serena

Estado: **preparado localmente, sin publicar**. El usuario pidió no hacer despliegue, commit ni push en esta etapa.
Rama de trabajo: `feat/redesign-ruta-serena`. Los cambios visuales existentes se conservan.

## Arquitectura y archivos

| Parte | Destino propuesto | Configuración |
| --- | --- | --- |
| React, Vite y PWA | Vercel | `frontend/vercel.json` |
| API Express existente | Render, servicio web Node | `render.yaml`, en la raíz del repositorio |
| Base de datos | TiDB existente, elegida explícitamente por el propietario | Variables privadas de Render |

No se crea otra base, no se reemplazan las APIs y no se ejecutan `db:migrate` ni `db:seed`.
El código del backend, el service worker, IndexedDB y el manifest no cambian en esta preparación.

## Antes de autorizar una publicación

1. El propietario revisa los cambios y decide cuándo incorporarlos a GitHub. El Blueprint apunta a la rama indicada;
   Render no puede leer archivos que solo existen sin commit en este computador.
2. Autorizar expresamente la publicación. No activar integraciones Git, recursos ni despliegues automáticos antes.
3. Usar únicamente datos sintéticos para las pruebas de la hackathon, sin pruebas con público.
4. Resolver los hallazgos pendientes de la auditoría: diferenciación de datos ficticios frente a verificados,
   revisión de salidas del asistente y claridad de la política de privacidad respecto al proveedor de IA.
5. Completar fuentes, fechas, evidencias, declaración y plan de operación. Estos documentos no quedan completados
   por tener una configuración de despliegue.

## 1. API en Render, cuando se autorice

Crear un servicio nuevo; no reemplazar un servicio existente sin revisarlo. El Blueprint propone:

| Campo | Valor |
| --- | --- |
| Repositorio | El repositorio del equipo |
| Rama | `feat/redesign-ruta-serena`, una vez disponible remotamente |
| Root Directory | `backend` |
| Runtime | Node, versión principal 22 |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check | `/api/salud` |
| Plan | Free, exclusivamente como propuesta de demostración |
| Despliegues automáticos | Desactivados |

Introducir en el panel seguro, nunca en Git ni en un chat:

| Variable | Configuración |
| --- | --- |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciales de TiDB y base que el propietario autorice usar |
| `DB_PORT` | `4000`, salvo que la configuración real indique otro |
| `JWT_SECRET` | El Blueprint genera un secreto para el nuevo servicio; no reemplaza el `.env` local |
| `CORS_ORIGIN` | Origen HTTPS exacto del frontend, sin rutas; varios orígenes controlados se separan por coma |
| `NODE_ENV` | `production` |
| `DIAS_VIGENCIA` | `30` |
| `JOBS_ACTIVOS` | `false` durante la preparación y la primera revisión |

El Blueprint no incluye `ADMIN_SEED_EMAIL` ni `ADMIN_SEED_PASSWORD`: no hay que volver a crear el administrador.
Tampoco copia automáticamente las credenciales del `.env` local.

### Asistente

El código existente usa `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL`. Sin ellos, responde con su respaldo informativo.
No se añaden automáticamente al Blueprint: después de cerrar las salvaguardas pendientes, el responsable
puede configurarlos manualmente en Render. Nunca en Vercel ni en variables `VITE_*`.
Sin esa configuración **no se debe anunciar que el asistente está conectado al modelo de IA**.

### Salud de la API

El endpoint actual puede devolver HTTP 200 aunque la conexión a la base no esté configurada.
Además del código HTTP, comprobar que `/api/salud` devuelve **`db: "ok"`** y que `/api/directorio.json`
contiene los registros sintéticos esperados. Un indicador verde de Render no demuestra por sí solo
que el directorio o el asistente funcionen.

### Tareas programadas y plan gratuito

El plan Free puede suspender la API tras periodos de inactividad. La primera petición puede tardar más;
no se promete respuesta inmediata ni ejecución continua de `node-cron`.

`JOBS_ACTIVOS=false` evita que arrancar la API ejecute un vencimiento que escriba sobre la base actual.
Es una configuración para una demostración controlada, **no un reemplazo del plan de operación**.
El equipo debe decidir el alojamiento y horario de los jobs antes de operar el servicio continuamente.
Activar `JOBS_ACTIVOS=true` ejecuta también un vencimiento al arrancar: requiere revisar la base elegida
y autorizar esas escrituras. No habilitarlo como parte de una prueba de instalación.

## 2. Frontend en Vercel, cuando se autorice

1. Importar el repositorio del equipo y elegir **Root Directory: `frontend`**, Framework: **Vite**.
2. Revisar el proyecto y el equipo de Vercel antes de vincularlo. Revisar qué rama se considera Production;
   la rama de rediseño puede desplegarse como Preview sin promoverla automáticamente.
3. Configurar `VITE_API_URL` con el **origen HTTPS real de la API de Render**, sin `/api`, parámetros ni credenciales.
   Es una variable pública que termina en el JavaScript del navegador.
4. Configurar `CORS_ORIGIN` en Render con la URL exacta que se vaya a usar. Si cambia una URL de Preview,
   actualizar la lista explícita; no abrir CORS a todos los sitios.
5. La configuración ejecuta `npm run deploy:check && npm run build`, con salida en `dist`.
   La comprobación rechaza HTTP, localhost, direcciones privadas comunes, dominios de ejemplo,
   credenciales en la URL y el error de añadir `/api` dos veces.
6. Los valores de `VITE_API_URL` se fijan durante la compilación. Si cambia la API, recompilar y volver a desplegar.

`frontend/.vercelignore` excluye archivos `.env*`, dependencias, cachés y resultados locales.
La regla SPA permite abrir directamente `/bienvenida` y `/directorio/7`; `/api` no se convierte en HTML.
El service worker y el manifest tienen cabeceras de revalidación para no fijar una versión antigua.

## 3. Instalación desde Ajustes

En **Ajustes → Lleva Ruta Serena contigo**:

- El botón **Instalar Ruta Serena** aparece solo si el navegador entrega una oferta de instalación válida.
- La confirmación nativa se abre únicamente al tocar el botón; no se insiste si la persona lo descarta.
- Android: menú del navegador compatible → Instalar aplicación o Añadir a pantalla de inicio.
- iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio; activar Abrir como app si aparece esa opción.
- Se detecta el modo standalone y el evento de instalación para no volver a ofrecerla en esa sesión.
- No se piden permisos de notificaciones al visitar Ajustes ni al instalar.

El enlace `localhost` del computador no sirve para abrir la app en otro celular. Un enlace HTTP de la
red local tampoco demuestra instalación segura. Para la prueba en el teléfono hace falta el enlace HTTPS
publicado y una conexión inicial que permita guardar el directorio.

La vista de desarrollo (`npm run dev`) no activa el service worker. La instalación y el modo offline
deben comprobarse con la versión compilada o publicada. La UI no afirma que el botón vaya a aparecer
en todos los navegadores.

## 4. Notificaciones: alcance real

Se conserva el **Acceso rápido** existente: muestra una notificación silenciosa que abre `/apoyo`
y puede restaurarse al abrir la app si hay permiso. Su permanencia depende del sistema y del navegador.
No se ha implementado Web Push, avisos remotos, suscripciones de dispositivos ni envío masivo.
Publicar o instalar no activa esas funciones.

Las notificaciones web en iPhone/iPad requieren una aplicación añadida a la pantalla de inicio,
una versión compatible del sistema (iOS/iPadOS 16.4 o posterior) y permiso solicitado desde un toque.
Falta comprobar el comportamiento en dispositivos físicos; no se certifica con una simulación de navegador.

## 5. Comprobación reproducible, sin tocar la base de datos

Desde `frontend`, en PowerShell:

```powershell
npm.cmd test
npm.cmd run build
```

Para comprobar la configuración de publicación, definir primero `VITE_API_URL` en el panel de Vercel
o en el entorno de la terminal con la URL real autorizada y ejecutar:

```powershell
npm.cmd run deploy:check
```

Sin esa variable real o con localhost, el fallo es **esperado** y evita publicar una configuración incorrecta.
La validación de URL es sintáctica: no se conecta a la API ni certifica DNS, CORS o contenido.
No ejecutar los tests del backend contra una base existente sin revisar su preparación: pueden migrar y
recargar la base de pruebas.

Después de autorizar y realizar el despliegue, registrar resultados obtenidos, no solo casillas marcadas:

| Comprobación | Evidencia necesaria |
| --- | --- |
| API y base | `/api/salud` con `db: "ok"` y directorio sintético esperado |
| Rutas públicas | Abrir directamente Inicio, Bienvenida, Directorio, detalle, Asistente, Mapa y Ajustes |
| PWA | Manifest válido, `/sw.js` servido como JavaScript y service worker controlando la app |
| Instalación | Android/iPhone reales, según dispositivos disponibles; anotar sistema y navegador |
| Sin conexión | Cargar y guardar primero, cortar la red, reabrir el directorio y `/apoyo` |
| Acceso rápido | Conceder y negar permiso, tocar la notificación y comprobar destino, sin llamadas reales |
| Temas y accesibilidad | Claro, oscuro, automático, teclado, movimiento reducido y lector de pantalla |
| QR | Generarlo únicamente con la URL HTTPS final y escanearlo en el dispositivo de prueba |

## Fuentes técnicas consultadas el 21 de octubre de 2026

- [Vite y rutas SPA en Vercel](https://vercel.com/docs/frameworks/frontend/vite).
- [Configuración de Vercel](https://vercel.com/docs/project-configuration/vercel-json).
- [Blueprints de Render](https://render.com/docs/blueprint-spec).
- [Limitaciones de instancias gratuitas de Render](https://render.com/docs/free).
- [Instalación de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
- [Confirmación de instalación](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt).
- [Web Push en iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Estas fuentes técnicas no sustituyen las fuentes oficiales de los servicios de apoyo ni las bases del concurso.
