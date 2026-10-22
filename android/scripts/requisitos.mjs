/**
 * Comprueba lo necesario para compilar la APK sin modificar nada.
 * [ok] listo · [FALTA] impide compilar · [pendiente] no impide compilar, pero sí distribuir.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ARCHIVO_ASSETLINKS, DIR_ANDROID, DIR_REPO, buscarBuildTools, buscarJdk, buscarSdkAndroid, leerDistribucion, rutaClave, validarUrlPublica,
} from './lib/config.mjs';
import { dentroDelRepositorio } from './lib/firma.mjs';

const filas = [];
const anotar = (estado, tema, detalle) => filas.push({ estado, tema, detalle });

const mayor = Number(process.versions.node.split('.')[0]);
anotar(mayor >= 20 ? 'ok' : 'FALTA', 'Node.js', `v${process.versions.node}${mayor >= 20 ? '' : ' (se necesita 20 o posterior)'}`);

const dependencias = ['@bubblewrap/core', 'qrcode'].every((d) => existsSync(join(DIR_ANDROID, 'node_modules', d)));
anotar(dependencias ? 'ok' : 'FALTA', 'Dependencias de android/', dependencias ? 'instaladas' : 'ejecuta npm.cmd ci en la carpeta android');

const jdk = buscarJdk();
anotar(jdk ? 'ok' : 'FALTA', 'JDK 17+', jdk ? `${jdk.dir} (versión ${jdk.version})` : 'instala un JDK 17+ o Android Studio, o define JAVA_HOME');

const sdk = buscarSdkAndroid();
anotar(sdk ? 'ok' : 'FALTA', 'Android SDK', sdk ?? 'instala Android Studio o define ANDROID_HOME');
if (sdk) {
  const buildTools = buscarBuildTools(sdk);
  anotar(buildTools ? 'ok' : 'FALTA', 'Build-tools', buildTools ? buildTools.version : 'instala build-tools con el SDK Manager');
  const plataforma = existsSync(join(sdk, 'platforms', 'android-36'));
  anotar(plataforma ? 'ok' : 'pendiente', 'Plataforma android-36', plataforma ? 'instalada' : 'Gradle intentará descargarla durante la compilación');
}

const ignorados = ['android/proyecto/build.gradle', 'android/salida/ruta-serena.apk', 'android/node_modules/x'].every(
  (ruta) => spawnSync('git', ['check-ignore', '-q', ruta], { cwd: DIR_REPO }).status === 0,
);
anotar(ignorados ? 'ok' : 'FALTA', 'Exclusiones de Git', ignorados ? 'proyecto generado, salida y dependencias excluidos' : 'revisa .gitignore');

const clave = rutaClave();
if (dentroDelRepositorio(clave)) anotar('FALTA', 'Clave de firma', 'RUTA_SERENA_KEYSTORE apunta dentro del repositorio; muévela fuera');
else anotar(existsSync(clave) ? 'ok' : 'FALTA', 'Clave de firma', existsSync(clave) ? `${clave} (no se lee ni se muestra)` : `no existe en ${clave}; créala una vez con npm.cmd run clave:crear`);
anotar(process.env.RUTA_SERENA_CLAVE_PASSWORD ? 'ok' : 'pendiente', 'Contraseña de la clave',
  process.env.RUTA_SERENA_CLAVE_PASSWORD ? 'definida en RUTA_SERENA_CLAVE_PASSWORD' : 'se pedirá de forma oculta al compilar');

const distribucion = leerDistribucion();
let urlWebValida = false;
try {
  anotar('ok', 'Dominio web (urlWeb)', validarUrlPublica(distribucion.urlWeb, { etiqueta: 'urlWeb', soloOrigen: true }));
  urlWebValida = true;
} catch (error) {
  anotar('FALTA', 'Dominio web (urlWeb)', `${error.message} Debe ser el origen HTTPS definitivo publicado en Vercel.`);
}

if (distribucion.packageId) anotar('ok', 'Identificador Android', distribucion.packageId);
else if (urlWebValida && dependencias) {
  const { resolverPackageId } = await import('./lib/identificador.mjs');
  anotar('pendiente', 'Identificador Android', `se fijará como ${resolverPackageId(distribucion).packageId} (derivado del dominio) al compilar`);
} else anotar('pendiente', 'Identificador Android', 'se derivará del dominio cuando exista urlWeb, o defínelo en distribucion.json');

if (existsSync(ARCHIVO_ASSETLINKS)) {
  const paquetes = JSON.parse(readFileSync(ARCHIVO_ASSETLINKS, 'utf8')).map((d) => d.target?.package_name);
  const coincide = !distribucion.packageId || paquetes.includes(distribucion.packageId);
  anotar(coincide ? 'ok' : 'pendiente', 'assetlinks.json local', coincide ? `declara ${paquetes.join(', ')}` : 'no declara el packageId actual; ejecuta npm.cmd run assetlinks');
} else anotar('pendiente', 'assetlinks.json local', 'se genera con npm.cmd run assetlinks después de crear la clave');

try {
  anotar('ok', 'Descarga de la APK', validarUrlPublica(distribucion.urlDescargaApk, { etiqueta: 'urlDescargaApk' }));
} catch (error) {
  anotar('pendiente', 'Descarga de la APK', `${error.message} Hace falta alojar la APK para generar su QR.`);
}

const adb = sdk && join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const dispositivos = adb && existsSync(adb)
  ? spawnSync(adb, ['devices'], { encoding: 'utf8' }).stdout.split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).length
  : 0;
anotar(dispositivos ? 'ok' : 'pendiente', 'Dispositivo Android (adb)', dispositivos ? `${dispositivos} conectado(s)` : 'ninguno; solo necesario para probar la instalación');

const ancho = Math.max(...filas.map((f) => f.tema.length));
for (const { estado, tema, detalle } of filas) console.log(`[${estado.padEnd(9)}] ${tema.padEnd(ancho)}  ${detalle}`);
const bloqueos = filas.filter((f) => f.estado === 'FALTA');
console.log(bloqueos.length ? `\nNo se puede compilar todavía: ${bloqueos.map((f) => f.tema).join(', ')}.` : '\nListo para npm.cmd run apk.');
if (bloqueos.length) process.exitCode = 1;
