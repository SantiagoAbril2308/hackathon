/**
 * Crea la clave de firma de la APK. Se ejecuta una sola vez: todas las versiones futuras
 * deben firmarse con esta misma clave para poder instalarse encima de la anterior.
 * Nunca sobrescribe una clave existente ni la guarda dentro del repositorio.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buscarJdk, contrasenaClave, ejecutable, leerDistribucion, rutaClave } from './lib/config.mjs';
import { VARIABLE_CONTRASENA, dentroDelRepositorio, huellaSha256 } from './lib/firma.mjs';

try {
  const clave = rutaClave();
  const { aliasClave } = leerDistribucion();
  if (existsSync(clave)) {
    throw new Error(`Ya existe una clave en ${clave}. No se sobrescribe: úsala para todas las versiones.`);
  }
  if (dentroDelRepositorio(clave)) {
    throw new Error('La clave no puede guardarse dentro del repositorio. Elige una ruta fuera de él con RUTA_SERENA_KEYSTORE.');
  }
  const jdk = buscarJdk();
  if (!jdk) throw new Error('No se encontró un JDK 17 o posterior. Ejecuta npm.cmd run requisitos.');

  const contrasena = await contrasenaClave({ confirmar: !process.env[VARIABLE_CONTRASENA] });
  if (contrasena.length < 8) throw new Error('Usa una contraseña de al menos 8 caracteres.');

  mkdirSync(dirname(clave), { recursive: true });
  const resultado = spawnSync(
    ejecutable(jdk.dir, 'keytool'),
    [
      '-genkeypair', '-storetype', 'PKCS12', '-keystore', clave, '-alias', aliasClave,
      '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
      '-dname', process.env.RUTA_SERENA_CLAVE_DNAME || 'CN=Ruta Serena, O=Ruta Serena, C=CO',
      '-storepass:env', VARIABLE_CONTRASENA, '-keypass:env', VARIABLE_CONTRASENA,
    ],
    { encoding: 'utf8', env: { ...process.env, [VARIABLE_CONTRASENA]: contrasena } },
  );
  if (resultado.status !== 0) throw new Error('keytool no pudo crear la clave.');

  console.log(`Clave creada en: ${clave}`);
  console.log(`Alias: ${aliasClave}`);
  console.log(`Huella SHA-256 (pública): ${huellaSha256({ jdk: jdk.dir, clave, alias: aliasClave, contrasena })}`);
  console.log('');
  console.log('Haz ahora una copia de seguridad de este archivo y guarda la contraseña en un gestor de contraseñas.');
  console.log('Si se pierde la clave o la contraseña, las personas tendrán que desinstalar la app para instalar versiones nuevas.');
} catch (error) {
  console.error(`No se creó la clave: ${error.message}`);
  process.exitCode = 1;
}
