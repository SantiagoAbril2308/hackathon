import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

/** Impide publicar un frontend que apunte al computador local o incluya secretos en la URL. */
export function validarApiPublica(valor) {
  if (!valor?.trim()) throw new Error('Configura VITE_API_URL con el origen HTTPS de la API publicada.');
  let url;
  try {
    url = new URL(valor.trim());
  } catch {
    throw new Error('VITE_API_URL debe ser una dirección HTTPS absoluta.');
  }
  if (url.protocol !== 'https:') throw new Error('La API publicada debe usar HTTPS.');
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_API_URL no debe contener credenciales, parámetros ni fragmentos.');
  }
  const host = url.hostname;
  const local = /^(localhost|0\.0\.0\.0|127\..*|10\..*|192\.168\..*|172\.(1[6-9]|2\d|3[01])\..*|\[::1\])$/.test(host)
    || /\.(localhost|local|internal|example|invalid|test)$/.test(host);
  const ejemplo = ['example.com', 'example.net', 'example.org'].some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
  if (local || ejemplo) throw new Error('La API debe tener un dominio público real, no localhost ni una dirección de ejemplo.');
  if (url.pathname !== '/') throw new Error('VITE_API_URL debe contener solo el origen de la API, sin añadir /api ni otra ruta.');
  return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const variables = loadEnv('production', process.cwd(), 'VITE_');
    validarApiPublica(variables.VITE_API_URL);
    console.log('Configuración de despliegue válida. Comprueba la disponibilidad de la API después de publicarla.');
  } catch (error) {
    console.error(`No se puede preparar la publicación: ${error.message}`);
    process.exitCode = 1;
  }
}
