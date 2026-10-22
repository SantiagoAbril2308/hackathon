/**
 * Genera y firma la APK (Trusted Web Activity) a partir del manifest PUBLICADO en urlWeb.
 * La APK no contiene una copia de la web: abre el dominio publicado, por lo que los cambios
 * de interfaz y contenido llegan con cada despliegue web sin reconstruir la APK.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import bubblewrap from '@bubblewrap/core';
import {
  ARCHIVO_ASSETLINKS, DIR_ANDROID, DIR_PROYECTO, DIR_REPO, DIR_SALIDA,
  buscarBuildTools, buscarJdk, buscarSdkAndroid, contrasenaClave, ejecutable, leerDistribucion, rutaClave, validarUrlPublica,
} from './lib/config.mjs';
import { VARIABLE_CONTRASENA, generarAssetLinks, huellaSha256 } from './lib/firma.mjs';
import { resolverPackageId } from './lib/identificador.mjs';

const { ConsoleLog, TwaGenerator, TwaManifest, util } = bubblewrap;

/** Colores del tema oscuro de la web (src/services/apariencia.js), para la barra de estado de Android. */
const COLOR_OSCURO = '#0F1F1A';

function ejecutar(comando, argumentos, opciones = {}) {
  const resultado = spawnSync(comando, argumentos, { stdio: 'inherit', ...opciones });
  if (resultado.status !== 0) throw new Error(`Falló: ${relative(DIR_REPO, comando) || comando} ${argumentos[0] ?? ''}`);
  return resultado;
}

try {
  const distribucion = leerDistribucion();
  const origen = validarUrlPublica(distribucion.urlWeb, { etiqueta: 'urlWeb (distribucion.json)', soloOrigen: true });
  const { packageId, derivado } = resolverPackageId(distribucion, { fijar: true });
  if (derivado) console.log(`Identificador Android fijado en distribucion.json: ${packageId}`);

  const jdk = buscarJdk();
  const sdk = buscarSdkAndroid();
  const buildTools = sdk && buscarBuildTools(sdk);
  if (!jdk || !sdk || !buildTools) throw new Error('Faltan herramientas de compilación. Ejecuta npm.cmd run requisitos.');
  const clave = rutaClave();
  if (!existsSync(clave)) throw new Error(`No existe la clave de firma en ${clave}. Créala una sola vez con npm.cmd run clave:crear.`);
  const contrasena = await contrasenaClave();
  const huella = huellaSha256({ jdk: jdk.dir, clave, alias: distribucion.aliasClave, contrasena });

  // 1. Manifest de la web publicada: nombre, colores, iconos y accesos directos salen de la PWA real.
  const urlManifest = new URL('/manifest.webmanifest', origen);
  console.log(`Leyendo ${urlManifest}`);
  let manifestWeb;
  try {
    manifestWeb = await util.getWebManifest(urlManifest);
  } catch (error) {
    throw new Error(`No se pudo leer el manifest publicado (${error.message}). Publica primero la web en ${origen}.`);
  }

  const base = TwaManifest.fromWebManifestJson(urlManifest, manifestWeb).toJson();
  const twa = new TwaManifest({
    ...base,
    packageId,
    appVersionCode: distribucion.versionCode,
    appVersion: distribucion.versionName,
    signingKey: { path: clave, alias: distribucion.aliasClave },
    themeColorDark: COLOR_OSCURO,
    navigationColor: base.themeColor,
    navigationColorDark: COLOR_OSCURO,
    // Mantiene el Acceso rápido existente: las notificaciones que ya muestra la web se atribuyen a la app.
    // El permiso solo se pide cuando la persona activa esa opción, nunca al abrir la app.
    enableNotifications: true,
    fallbackType: 'customtabs',
    enableSiteSettingsShortcut: true,
    generatorApp: 'ruta-serena-android',
    fingerprints: [{ name: 'release', value: huella }],
  });
  const errorManifest = twa.validate();
  if (errorManifest) throw new Error(`Configuración TWA no válida: ${errorManifest}`);

  // 2. Proyecto Android generado de cero: así no arrastra cambios manuales ni versiones antiguas.
  rmSync(DIR_PROYECTO, { recursive: true, force: true });
  mkdirSync(DIR_PROYECTO, { recursive: true });
  await new TwaGenerator().createTwaProject(DIR_PROYECTO, twa, new ConsoleLog('twa'));
  await twa.saveToFile(join(DIR_PROYECTO, 'twa-manifest.json'));

  // 3. Compilación sin firma con Gradle.
  const entorno = { ...process.env, JAVA_HOME: jdk.dir, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
  // En Windows, un .bat necesita cmd; se usa la ruta absoluta entre comillas porque la carpeta puede tener espacios.
  const gradle = process.platform === 'win32' ? `"${join(DIR_PROYECTO, 'gradlew.bat')}"` : join(DIR_PROYECTO, 'gradlew');
  ejecutar(gradle, ['assembleRelease', '--no-daemon', '--stacktrace'], { cwd: DIR_PROYECTO, env: entorno, shell: process.platform === 'win32' });
  const sinFirmar = join(DIR_PROYECTO, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk');
  if (!existsSync(sinFirmar)) throw new Error('Gradle no produjo app-release-unsigned.apk.');

  // 4. Alineación y firma. La contraseña viaja por variable de entorno, no por argumentos.
  mkdirSync(DIR_SALIDA, { recursive: true });
  const alineada = join(DIR_PROYECTO, 'app-release-alineada.apk');
  const nombre = `ruta-serena-${distribucion.versionName}-${distribucion.versionCode}.apk`;
  const firmada = join(DIR_SALIDA, nombre);
  ejecutar(join(buildTools.dir, process.platform === 'win32' ? 'zipalign.exe' : 'zipalign'), ['-p', '-f', '4', sinFirmar, alineada]);
  const apksigner = [ejecutable(jdk.dir, 'java'), '-jar', join(buildTools.dir, 'lib', 'apksigner.jar')];
  ejecutar(apksigner[0], [
    ...apksigner.slice(1), 'sign', '--ks', clave, '--ks-key-alias', distribucion.aliasClave,
    '--ks-pass', `env:${VARIABLE_CONTRASENA}`, '--key-pass', `env:${VARIABLE_CONTRASENA}`, '--out', firmada, alineada,
  ], { env: { ...process.env, [VARIABLE_CONTRASENA]: contrasena } });

  // 5. Comprobación: la APK queda firmada con la misma huella que publica assetlinks.json.
  const verificacion = spawnSync(apksigner[0], [...apksigner.slice(1), 'verify', '--print-certs', firmada], { encoding: 'utf8' });
  const digest = /SHA-256 digest:\s*([0-9a-f]{64})/i.exec(verificacion.stdout)?.[1];
  if (verificacion.status !== 0 || !digest || digest.toUpperCase() !== huella.replaceAll(':', '')) {
    throw new Error('La firma de la APK no coincide con la clave esperada.');
  }
  copyFileSync(firmada, join(DIR_SALIDA, 'ruta-serena.apk'));
  rmSync(join(DIR_SALIDA, `${nombre}.idsig`), { force: true });

  const sha = createHash('sha256').update(readFileSync(firmada)).digest('hex');
  console.log('');
  console.log(`APK firmada: ${firmada}`);
  console.log(`Copia con nombre estable para alojar: ${join(DIR_SALIDA, 'ruta-serena.apk')}`);
  console.log(`Tamaño: ${(statSync(firmada).size / 1024).toFixed(0)} KB · SHA-256 del archivo: ${sha}`);
  console.log(`Abre: ${origen}${twa.startUrl} · packageId: ${packageId} · versión ${distribucion.versionName} (${distribucion.versionCode})`);

  const esperado = `${JSON.stringify(generarAssetLinks(packageId, [huella]), null, 2)}\n`;
  if (!existsSync(ARCHIVO_ASSETLINKS) || readFileSync(ARCHIVO_ASSETLINKS, 'utf8') !== esperado) {
    console.warn(`Aviso: ${relative(DIR_ANDROID, ARCHIVO_ASSETLINKS)} no coincide con esta firma. Ejecuta npm.cmd run assetlinks y publica la web;`);
    console.warn('sin Digital Asset Links válidos la app se abre con una barra de navegador en la parte superior.');
  }
} catch (error) {
  console.error(`No se generó la APK: ${error.message}`);
  process.exitCode = 1;
}
