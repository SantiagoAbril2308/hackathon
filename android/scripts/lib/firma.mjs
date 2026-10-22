import { spawnSync } from 'node:child_process';
import { relative, isAbsolute } from 'node:path';
import { DIR_REPO, ejecutable } from './config.mjs';

/** Las contraseñas se pasan a keytool y apksigner por variables de entorno, nunca en la línea de comandos. */
export const VARIABLE_CONTRASENA = 'RUTA_SERENA_CLAVE_PASSWORD';

export function dentroDelRepositorio(ruta) {
  const rel = relative(DIR_REPO, ruta);
  return !rel.startsWith('..') && !isAbsolute(rel);
}

/** Huella SHA-256 pública del certificado de firma, en el formato AA:BB:... que usa assetlinks.json. */
export function huellaSha256({ jdk, clave, alias, contrasena }) {
  const resultado = spawnSync(
    ejecutable(jdk, 'keytool'),
    ['-list', '-v', '-keystore', clave, '-alias', alias, `-storepass:env`, VARIABLE_CONTRASENA],
    { encoding: 'utf8', env: { ...process.env, [VARIABLE_CONTRASENA]: contrasena } },
  );
  if (resultado.status !== 0) {
    throw new Error('keytool no pudo leer la clave. Revisa la ruta, el alias y la contraseña.');
  }
  const huella = /SHA-?256:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i.exec(resultado.stdout)?.[1];
  if (!huella) throw new Error('No se encontró la huella SHA-256 en la salida de keytool.');
  return huella.toUpperCase();
}

/** Contenido de Digital Asset Links para una o más huellas (por ejemplo, durante una rotación de clave). */
export function generarAssetLinks(packageId, huellas) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageId, sha256_cert_fingerprints: huellas },
    },
  ];
}
