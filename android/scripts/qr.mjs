/**
 * Muestra en la terminal y guarda como imagen (PNG y SVG) los QR de Ruta Serena.
 *   web: abre la versión web publicada; desde el navegador puede instalarse como PWA.
 *   apk: descarga el archivo APK para instalarlo en Android fuera de Play Store.
 * Uso: npm.cmd run qr | npm.cmd run qr:web | npm.cmd run qr:apk
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { DIR_SALIDA, leerDistribucion, validarUrlPublica } from './lib/config.mjs';

const DIR_QR = join(DIR_SALIDA, 'qr');

const TIPOS = {
  web: {
    titulo: 'QR para ABRIR o INSTALAR la PWA desde el navegador',
    archivo: 'qr-web-pwa',
    campo: 'urlWeb',
    validar: (url) => validarUrlPublica(url, { etiqueta: 'urlWeb', soloOrigen: true }),
    falta: [
      'Falta urlWeb en android/distribucion.json: el origen HTTPS definitivo de la web publicada (Vercel).',
      'localhost no sirve para un teléfono: no se genera QR con él.',
    ],
  },
  apk: {
    titulo: 'QR para DESCARGAR la APK Android (instalación fuera de Play Store)',
    archivo: 'qr-descarga-apk',
    campo: 'urlDescargaApk',
    validar: (url) => validarUrlPublica(url, { etiqueta: 'urlDescargaApk' }),
    falta: [
      'Falta urlDescargaApk en android/distribucion.json.',
      'Un archivo APK local no tiene una URL pública. Súbelo primero a un alojamiento HTTPS estable',
      '(por ejemplo, un release de GitHub) y escribe aquí su enlace de descarga directa.',
    ],
  },
};

async function mostrar(tipo) {
  const config = TIPOS[tipo];
  const valor = leerDistribucion()[config.campo];
  console.log(`\n=== ${config.titulo} ===`);
  if (!valor) {
    config.falta.forEach((linea) => console.log(linea));
    return false;
  }
  const url = config.validar(valor);
  if (tipo === 'apk' && !new URL(url).pathname.toLowerCase().endsWith('.apk')) {
    console.warn('Aviso: el enlace no termina en .apk. Comprueba que descargue el archivo directamente y no una página intermedia.');
  }
  console.log(url);
  console.log(await QRCode.toString(url, { type: 'terminal', small: true, errorCorrectionLevel: 'M' }));
  mkdirSync(DIR_QR, { recursive: true });
  const png = join(DIR_QR, `${config.archivo}.png`);
  const svg = join(DIR_QR, `${config.archivo}.svg`);
  const opciones = { errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#FFFFFF' } };
  await QRCode.toFile(png, url, { ...opciones, width: 768 });
  await QRCode.toFile(svg, url, { ...opciones, type: 'svg' });
  console.log(`Guardado: ${png}`);
  console.log(`Guardado: ${svg}`);
  return true;
}

const modo = process.argv[2] ?? 'todos';
try {
  if (!['web', 'apk', 'todos'].includes(modo)) throw new Error('Usa web, apk o todos.');
  const tipos = modo === 'todos' ? ['web', 'apk'] : [modo];
  const resultados = [];
  for (const tipo of tipos) resultados.push(await mostrar(tipo));
  // En "todos" basta con que exista algún enlace; un modo concreto sin enlace es un fallo.
  if (modo === 'todos' ? !resultados.some(Boolean) : !resultados[0]) process.exitCode = 1;
} catch (error) {
  console.error(`No se generó el QR: ${error.message}`);
  process.exitCode = 1;
}
