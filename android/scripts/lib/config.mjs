import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR_ANDROID = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR_REPO = resolve(DIR_ANDROID, '..');
export const ARCHIVO_DISTRIBUCION = join(DIR_ANDROID, 'distribucion.json');
/** Proyecto Android generado por Bubblewrap. Se regenera en cada compilación y no se versiona. */
export const DIR_PROYECTO = join(DIR_ANDROID, 'proyecto');
/** APK firmadas y QR. No se versionan. */
export const DIR_SALIDA = join(DIR_ANDROID, 'salida');
export const ARCHIVO_ASSETLINKS = join(DIR_REPO, 'frontend', 'public', '.well-known', 'assetlinks.json');

const TUNELES = [
  'ngrok.io', 'ngrok.app', 'ngrok-free.app', 'ngrok-free.dev', 'trycloudflare.com', 'loca.lt', 'localtunnel.me',
  'serveo.net', 'localhost.run', 'lhr.life', 'pinggy.io', 'pinggy.link', 'devtunnels.ms', 'app.github.dev',
];

function esHost(host, dominio) {
  return host === dominio || host.endsWith(`.${dominio}`);
}

/**
 * Acepta solo un enlace HTTPS público y estable. Rechaza localhost, redes privadas, dominios de ejemplo,
 * túneles temporales y URL de Preview de Vercel, que cambian con cada despliegue.
 * Es una validación sintáctica: no comprueba que el servidor responda.
 */
export function validarUrlPublica(valor, { etiqueta = 'La URL', soloOrigen = false } = {}) {
  if (typeof valor !== 'string' || !valor.trim()) throw new Error(`${etiqueta} no está configurada.`);
  let url;
  try {
    url = new URL(valor.trim());
  } catch {
    throw new Error(`${etiqueta} debe ser una dirección HTTPS absoluta.`);
  }
  if (url.protocol !== 'https:') throw new Error(`${etiqueta} debe usar HTTPS.`);
  if (url.username || url.password || url.hash) throw new Error(`${etiqueta} no debe contener credenciales ni fragmentos.`);
  const host = url.hostname.toLowerCase();
  const local = /^(localhost|0\.0\.0\.0|127\..*|10\..*|192\.168\..*|169\.254\..*|172\.(1[6-9]|2\d|3[01])\..*|\[.*\])$/.test(host)
    || /\.(localhost|local|lan|home|internal|example|invalid|test)$/.test(host)
    || !host.includes('.');
  const ejemplo = ['example.com', 'example.net', 'example.org'].some((d) => esHost(host, d));
  if (local || ejemplo) throw new Error(`${etiqueta} debe usar un dominio público real, no localhost, una red local ni un dominio de ejemplo.`);
  if (TUNELES.some((d) => esHost(host, d))) throw new Error(`${etiqueta} es un túnel temporal; usa el dominio definitivo.`);
  if (host.endsWith('.vercel.app') && (/-git-/.test(host) || /-[a-z0-9]{9}-[a-z0-9-]+\.vercel\.app$/.test(host))) {
    throw new Error(`${etiqueta} parece una URL de Preview de Vercel, que cambia con cada despliegue; usa el dominio de producción.`);
  }
  if (soloOrigen) {
    if (url.pathname !== '/' || url.search) throw new Error(`${etiqueta} debe ser solo el origen (https://dominio), sin rutas ni parámetros.`);
    return url.origin;
  }
  return url.toString();
}

export function leerDistribucion() {
  const archivo = JSON.parse(readFileSync(ARCHIVO_DISTRIBUCION, 'utf8'));
  return {
    ...archivo,
    // Permiten probar otro valor sin editar el archivo versionado.
    urlWeb: process.env.RUTA_SERENA_URL_WEB || archivo.urlWeb,
    urlDescargaApk: process.env.RUTA_SERENA_URL_APK || archivo.urlDescargaApk,
  };
}

/** Guarda un campo en distribucion.json sin tocar el resto. */
export function guardarEnDistribucion(campo, valor) {
  const archivo = JSON.parse(readFileSync(ARCHIVO_DISTRIBUCION, 'utf8'));
  archivo[campo] = valor;
  writeFileSync(ARCHIVO_DISTRIBUCION, `${JSON.stringify(archivo, null, 2)}\n`);
}

/** La clave vive fuera del repositorio y de la carpeta sincronizada del proyecto. */
export function rutaClave() {
  return resolve(process.env.RUTA_SERENA_KEYSTORE || join(homedir(), '.ruta-serena', 'ruta-serena-release.jks'));
}

function versionJdk(dir) {
  try {
    const release = readFileSync(join(dir, 'release'), 'utf8');
    const version = /JAVA_VERSION="(\d+)/.exec(release)?.[1];
    return version ? Number(version) : null;
  } catch {
    return null;
  }
}

/** Busca un JDK 17 o posterior: JAVA_HOME, el JDK de Android Studio o C:\Program Files\Java. */
export function buscarJdk() {
  const candidatos = [];
  if (process.env.JAVA_HOME) candidatos.push(process.env.JAVA_HOME);
  if (process.platform === 'win32') {
    const programas = process.env.ProgramFiles || 'C:\\Program Files';
    candidatos.push(join(programas, 'Android', 'Android Studio', 'jbr'));
    const java = join(programas, 'Java');
    if (existsSync(java)) {
      for (const nombre of readdirSync(java).filter((n) => n.startsWith('jdk')).sort().reverse()) candidatos.push(join(java, nombre));
    }
  }
  for (const dir of candidatos) {
    const version = versionJdk(dir);
    const ejecutable = join(dir, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
    if (version && version >= 17 && existsSync(ejecutable)) return { dir, version };
  }
  return null;
}

export function buscarSdkAndroid() {
  const candidatos = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
  if (process.env.LOCALAPPDATA) candidatos.push(join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
  return candidatos.find((dir) => dir && existsSync(join(dir, 'platform-tools'))) || null;
}

/** Elige la versión más reciente instalada de build-tools que tenga zipalign y apksigner. */
export function buscarBuildTools(sdk) {
  const dir = join(sdk, 'build-tools');
  if (!existsSync(dir)) return null;
  const extension = process.platform === 'win32' ? '.exe' : '';
  const versiones = readdirSync(dir)
    .filter((v) => existsSync(join(dir, v, `zipalign${extension}`)) && existsSync(join(dir, v, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner')))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return versiones.length ? { version: versiones[0], dir: join(dir, versiones[0]) } : null;
}

export function ejecutable(dirJdk, nombre) {
  return join(dirJdk, 'bin', process.platform === 'win32' ? `${nombre}.exe` : nombre);
}

/** Pide un dato sin mostrarlo en la terminal. Solo funciona en una terminal interactiva. */
export async function pedirSecreto(pregunta) {
  if (!process.stdin.isTTY) throw new Error('No hay una terminal interactiva para escribir la contraseña. Usa la variable RUTA_SERENA_CLAVE_PASSWORD.');
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let silencio = false;
  rl._writeToOutput = (texto) => {
    if (!silencio) process.stdout.write(texto);
  };
  return new Promise((resolver) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      process.stdout.write('\n');
      resolver(respuesta);
    });
    silencio = true;
  });
}

export async function contrasenaClave({ confirmar = false } = {}) {
  if (process.env.RUTA_SERENA_CLAVE_PASSWORD) return process.env.RUTA_SERENA_CLAVE_PASSWORD;
  const valor = await pedirSecreto('Contraseña de la clave de firma (no se mostrará): ');
  if (confirmar && valor !== (await pedirSecreto('Repite la contraseña: '))) throw new Error('Las contraseñas no coinciden.');
  return valor;
}
