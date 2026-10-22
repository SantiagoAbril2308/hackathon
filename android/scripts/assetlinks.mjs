/**
 * Genera frontend/public/.well-known/assetlinks.json con el identificador Android y la huella SHA-256
 * de la clave de firma. Vercel lo publica con la web; así Android verifica que la APK y el dominio
 * pertenecen al mismo propietario y abre la app sin la barra del navegador.
 * Uso: npm.cmd run assetlinks [-- --reemplazar]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { ARCHIVO_ASSETLINKS, DIR_REPO, buscarJdk, contrasenaClave, leerDistribucion, rutaClave } from './lib/config.mjs';
import { generarAssetLinks, huellaSha256 } from './lib/firma.mjs';
import { resolverPackageId } from './lib/identificador.mjs';

try {
  const distribucion = leerDistribucion();
  const clave = rutaClave();
  if (!existsSync(clave)) throw new Error(`No existe la clave de firma en ${clave}. Créala con npm.cmd run clave:crear.`);
  const jdk = buscarJdk();
  if (!jdk) throw new Error('No se encontró un JDK 17 o posterior.');

  const { packageId, derivado } = resolverPackageId(distribucion, { fijar: true });
  const huella = huellaSha256({ jdk: jdk.dir, clave, alias: distribucion.aliasClave, contrasena: await contrasenaClave() });
  const contenido = `${JSON.stringify(generarAssetLinks(packageId, [huella]), null, 2)}\n`;
  const ruta = relative(DIR_REPO, ARCHIVO_ASSETLINKS);

  if (existsSync(ARCHIVO_ASSETLINKS)) {
    const actual = readFileSync(ARCHIVO_ASSETLINKS, 'utf8');
    if (actual === contenido) {
      console.log(`${ruta} ya está al día.`);
      process.exit(0);
    }
    if (!process.argv.includes('--reemplazar')) {
      throw new Error(`${ruta} ya existe con otro contenido. Revísalo; si debe cambiar, repite con: npm.cmd run assetlinks -- --reemplazar`);
    }
  }
  mkdirSync(dirname(ARCHIVO_ASSETLINKS), { recursive: true });
  writeFileSync(ARCHIVO_ASSETLINKS, contenido);
  if (derivado) console.log(`Identificador Android fijado en distribucion.json: ${packageId}. No lo cambies después de distribuir la APK.`);
  console.log(`Escrito ${ruta}`);
  console.log(`  package_name: ${packageId}`);
  console.log(`  sha256_cert_fingerprints: ${huella}`);
  console.log('Publica la web para que el archivo esté disponible y comprueba con npm.cmd run assetlinks:verificar.');
} catch (error) {
  console.error(`No se generó assetlinks.json: ${error.message}`);
  process.exitCode = 1;
}
