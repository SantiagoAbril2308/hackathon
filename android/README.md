# APK Android de Ruta Serena (Trusted Web Activity)

La APK **no contiene una copia de la web**. Es una Trusted Web Activity (TWA) generada con
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) que abre a pantalla completa la versión
publicada en el dominio HTTPS de `distribucion.json`, usando el navegador del teléfono (Chrome u otro compatible).
Los cambios de interfaz y contenido llegan con cada despliegue web, sin reconstruir ni reinstalar la APK.

Esta carpeta está aislada de `frontend/`: tiene sus propias dependencias y no forma parte del build web.

## Comandos

Todos se ejecutan en PowerShell desde la carpeta `android`:

```powershell
cd "C:\Users\BRAYAN CLAROS\OneDrive\Documentos\hackathon\android"
npm.cmd ci                       # una vez, instala las herramientas de esta carpeta
```

| Comando | Qué hace |
| --- | --- |
| `npm.cmd run requisitos` | Comprueba Node, JDK 17+, Android SDK, build-tools, clave, dominio, exclusiones de Git y dispositivo. No cambia nada |
| `npm.cmd run clave:crear` | Crea la clave de firma **una sola vez**, fuera del repositorio. Nunca sobrescribe una existente |
| `npm.cmd run assetlinks` | Escribe `frontend/public/.well-known/assetlinks.json` con el identificador Android y la huella SHA-256 |
| `npm.cmd run apk` | Lee el manifest publicado, genera el proyecto Android, compila, firma y verifica la APK |
| `npm.cmd run assetlinks:verificar` | Comprueba en el dominio publicado que `assetlinks.json` se sirve como JSON y coincide con la firma |
| `npm.cmd run qr:web` | Enlace y QR para **abrir o instalar la PWA desde el navegador** |
| `npm.cmd run qr:apk` | Enlace y QR para **descargar la APK Android** |
| `npm.cmd run qr` | Ambos QR, si están configurados |
| `npm.cmd test` | Pruebas de las validaciones de esta carpeta |

Los QR se muestran en la terminal y se guardan como imagen en `android/salida/qr/`:
`qr-web-pwa.png/.svg` y `qr-descarga-apk.png/.svg`. La APK queda en `android/salida/`
(`ruta-serena-<versión>-<código>.apk` y una copia `ruta-serena.apk` con nombre estable para alojarla).
Ni la APK ni los QR se suben a Git.

## Configuración: `distribucion.json`

| Campo | Valor |
| --- | --- |
| `urlWeb` | Origen HTTPS **definitivo** del frontend publicado en Vercel, sin ruta. Ejemplo de forma: `https://<dominio>` |
| `urlDescargaApk` | Enlace HTTPS de descarga directa de la APK, una vez alojada |
| `packageId` | Identificador Android. Si queda en `null`, se deriva del dominio (convención de Bubblewrap) y se fija aquí la primera vez que se ejecuta `assetlinks` o `apk` |
| `versionCode` / `versionName` | Versión de la APK. Solo cambian cuando hay que distribuir una APK nueva |
| `aliasClave` | Alias dentro del almacén de claves |

Los scripts rechazan `localhost`, redes locales, dominios de ejemplo, túneles temporales (ngrok, Cloudflare Tunnel, etc.)
y URL de Preview de Vercel, porque el dominio queda grabado en la APK.
Para probar otro valor sin editar el archivo: variables `RUTA_SERENA_URL_WEB` y `RUTA_SERENA_URL_APK`.

## Primera APK, paso a paso

1. Publicar la web en su dominio HTTPS definitivo (ver `docs/despliegue.md`) y escribirlo en `urlWeb`.
2. `npm.cmd run requisitos`.
3. `npm.cmd run clave:crear` y hacer la copia de seguridad que indica (ver «Firma»).
4. `npm.cmd run assetlinks`, revisar el archivo generado, subir el cambio y volver a publicar la web.
5. `npm.cmd run assetlinks:verificar`.
6. `npm.cmd run apk`.
7. Alojar `android/salida/ruta-serena.apk` (ver «Descarga»), escribir su enlace en `urlDescargaApk` y ejecutar `npm.cmd run qr`.

Sin Digital Asset Links válidos la app funciona, pero muestra una barra de navegador con la dirección arriba.

## Firma: conservar siempre la misma clave

Android solo instala una versión nueva encima de la anterior si está firmada con **la misma clave** y tiene
el mismo `packageId`. Si se pierde la clave o su contraseña, cada persona tendría que desinstalar la app,
y habría que publicar otra huella en `assetlinks.json`.

- Ubicación predeterminada: `%USERPROFILE%\.ruta-serena\ruta-serena-release.jks` (fuera del repositorio y de OneDrive).
  Se puede cambiar con la variable `RUTA_SERENA_KEYSTORE`; los scripts se niegan a usar una ruta dentro del repositorio.
- Formato PKCS12, RSA 3072, validez de 10 000 días. Alias en `distribucion.json`.
- La contraseña se escribe de forma oculta o se toma de `RUTA_SERENA_CLAVE_PASSWORD` (solo para la sesión actual
  de la terminal). Se pasa a `keytool` y `apksigner` por variable de entorno, nunca como argumento visible.
- Hacer **al menos dos copias** del archivo `.jks` en lugares distintos y seguros (por ejemplo, un gestor de
  contraseñas que admita archivos y una unidad cifrada), y guardar la contraseña en un gestor de contraseñas.
- Nunca subir el `.jks`, la contraseña ni archivos `keystore.properties`/`local.properties` a Git, chats o tickets.
  `.gitignore` excluye `*.jks`, `*.keystore`, `*.p12`, `*.pfx`, `*.apk`, `*.aab`, `android/proyecto/` y `android/salida/`.
- La huella SHA-256 **sí es pública**: va en `assetlinks.json`.

Para firmar en otro computador, copiar el `.jks` de forma segura y definir `RUTA_SERENA_KEYSTORE` con su ruta.

## Descarga de la APK y QR

Un archivo APK local no tiene una URL pública. Para el QR de descarga hace falta alojar el archivo en un sitio
HTTPS estable con descarga directa. Opción recomendada: un release de GitHub del repositorio del equipo con el
archivo `ruta-serena.apk`; el enlace
`https://github.com/<propietario>/<repositorio>/releases/latest/download/ruta-serena.apk` apunta siempre al último.
Crear el release es una publicación: la decide y la hace el equipo. No usar `localhost`, una IP de la red local
ni un túnel temporal.

En el teléfono hay que permitir «Instalar apps desconocidas» para el navegador o el gestor de archivos que abra la APK.
Android puede mostrar avisos de Play Protect por tratarse de una app fuera de Play Store.

Diferencia entre los dos QR:

- **QR web (PWA)**: abre la web publicada. Desde el navegador se puede usar directamente o instalar como PWA
  (Ajustes → Lleva Ruta Serena contigo). Sirve también en iPhone.
- **QR APK**: descarga el instalador Android. Solo para Android.

## Actualizaciones

### Llegan sin reinstalar la APK (despliegue web normal)

Textos, diseño, pantallas, directorio, rutas internas, asistente, lógica de la web y estilos. Basta con publicar
la web en Vercel.

Cómo influye el service worker: la app usa una caché de precarga (`registerType: 'autoUpdate'`, `skipWaiting`,
`clientsClaim`). Al abrir la APK después de un despliegue, la primera pantalla puede salir de la caché anterior;
el navegador descarga en segundo plano el nuevo `sw.js` (servido sin caché por Vercel), precarga la versión nueva
y la página se recarga sola al activarse. Según la conexión, el cambio se ve segundos después o en la siguiente
apertura. **No es instantáneo** y requiere conexión en ese momento.

Sin conexión: solo funciona lo que ya se descargó en una apertura anterior con conexión (la app precargada y la
última copia del directorio). La primera apertura necesita internet.

### Requieren generar y distribuir una APK nueva

Aumentar `versionCode` (y `versionName`) en `distribucion.json`, ejecutar `npm.cmd run apk`, alojar el archivo y
avisar a quienes la instalaron:

- Dominio de la web (`urlWeb`) o la ruta de inicio.
- Nombre de la app, icono del lanzador, pantalla de bienvenida, colores de barra de estado y navegación.
- Accesos directos del icono (la APK los copia del manifest al compilar).
- Orientación, modo de pantalla, permisos y opciones de notificaciones.
- Actualizaciones de la librería TWA o del `targetSdk` exigidas por Android.

El `packageId` y la clave **no deben cambiar nunca** después de distribuir la APK.

## Notificaciones

La APK no añade notificaciones push ni pide permisos al abrirse. Mantiene el **Acceso rápido** existente de la web:
la notificación local que abre `/apoyo` y que la persona activa voluntariamente. La APK declara el permiso
`POST_NOTIFICATIONS` (delegación de notificaciones de la TWA) para que esa notificación aparezca como de la app.
La solicitud del permiso se origina cuando la web lo pide, es decir, al activar el Acceso rápido; la web no lo pide
al iniciar. **Pendiente de comprobar en un dispositivo físico** (Android 13+ y anterior). Su permanencia depende del
sistema y del navegador. No hay Web Push ni avisos con la app cerrada.

## Llamadas, WhatsApp y enlaces externos

`tel:` abre el marcador del teléfono; los enlaces de WhatsApp y de otros dominios se abren en su app o en una pestaña
del navegador, fuera de la TWA. Pendiente de comprobar en un dispositivo físico.

## Dependencias de compilación

`@bubblewrap/core` 1.25.0 y `qrcode` 1.5.4, con versiones fijas. `npm audit` informa avisos en dependencias internas
de Bubblewrap (`extract-zip`, `jimp`, `node-forge`, `googleapis`) sin corrección publicada. Son herramientas que solo
se ejecutan en el computador de compilación, con archivos propios; no se usa la descarga automática de JDK/SDK de
Bubblewrap y nada de ello se incluye en la APK ni en la web.

El proyecto Android generado usa Gradle 8.11.1, Android Gradle Plugin 8.9.1, `compileSdk`/`targetSdk` 36 y funciona
con el JDK 21 de Android Studio (el CLI de Bubblewrap exige JDK 17, por eso se usa su librería).
