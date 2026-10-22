/**
 * Comprueba en el dominio publicado que /.well-known/assetlinks.json:
 *  - responde 200 sin redirecciones y como application/json (no como index.html de la SPA);
 *  - coincide con el archivo local generado a partir de la clave de firma;
 * y consulta la API pública de Digital Asset Links de Google para la relación con la app.
 * Solo lee información pública; no publica nada.
 */
import { existsSync, readFileSync } from 'node:fs';
import { ARCHIVO_ASSETLINKS, leerDistribucion, validarUrlPublica } from './lib/config.mjs';

function declaraciones(lista) {
  return lista
    .filter((d) => d?.target?.namespace === 'android_app' && d.relation?.includes('delegate_permission/common.handle_all_urls'))
    .flatMap((d) => (d.target.sha256_cert_fingerprints ?? []).map((h) => `${d.target.package_name} ${h.toUpperCase()}`));
}

try {
  const distribucion = leerDistribucion();
  const origen = validarUrlPublica(distribucion.urlWeb, { etiqueta: 'urlWeb', soloOrigen: true });
  if (!existsSync(ARCHIVO_ASSETLINKS)) throw new Error('No existe el assetlinks.json local. Genera primero con npm.cmd run assetlinks.');
  const esperadas = declaraciones(JSON.parse(readFileSync(ARCHIVO_ASSETLINKS, 'utf8')));

  const url = new URL('/.well-known/assetlinks.json', origen);
  const respuesta = await fetch(url, { redirect: 'manual', headers: { Accept: 'application/json' } });
  const tipo = respuesta.headers.get('content-type') ?? '';
  console.log(`${url} → HTTP ${respuesta.status}, ${tipo || 'sin Content-Type'}`);
  if (respuesta.status !== 200) throw new Error('Debe responder 200 directamente, sin redirecciones.');
  if (!tipo.includes('application/json')) throw new Error('Se sirve con otro tipo de contenido; probablemente la regla SPA lo convierte en index.html.');
  let publicado;
  try {
    publicado = await respuesta.json();
  } catch {
    throw new Error('El contenido publicado no es JSON válido.');
  }
  const publicadas = declaraciones(publicado);
  const faltan = esperadas.filter((d) => !publicadas.includes(d));
  if (faltan.length) throw new Error(`El archivo publicado no incluye: ${faltan.join(', ')}. Publica la versión actual de la web.`);
  console.log('Archivo publicado correcto y coincidente con la firma local.');

  const [packageId] = esperadas[0].split(' ');
  const api = new URL('https://digitalassetlinks.googleapis.com/v1/statements:list');
  api.searchParams.set('source.web.site', origen);
  api.searchParams.set('relation', 'delegate_permission/common.handle_all_urls');
  const google = await (await fetch(api)).json();
  const vinculada = (google.statements ?? []).some((s) => s.target?.androidApp?.packageName === packageId);
  console.log(vinculada
    ? `API de Google: el dominio declara la app ${packageId}.`
    : 'API de Google: todavía no ve la declaración (puede tardar por caché). La comprobación final es abrir la APK sin barra de navegador.');
} catch (error) {
  console.error(`Digital Asset Links sin verificar: ${error.message}`);
  process.exitCode = 1;
}
