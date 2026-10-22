import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIR_REPO, validarUrlPublica } from './lib/config.mjs';
import { dentroDelRepositorio, generarAssetLinks } from './lib/firma.mjs';
import { join } from 'node:path';
import { homedir } from 'node:os';

test('rechaza enlaces que un teléfono no puede abrir o que no son estables', () => {
  for (const url of [
    '', null, 'ruta-serena.vercel.app', 'http://ruta-serena.vercel.app', 'https://localhost:5173', 'https://127.0.0.1',
    'https://192.168.1.20:4173', 'https://10.0.0.5', 'https://mi-pc.local', 'https://ruta.example.com', 'https://servidor',
    'https://abc123.ngrok-free.app', 'https://algo.trycloudflare.com', 'https://bonito.loca.lt',
    'https://ruta-serena-git-feat-redesign-equipo.vercel.app', 'https://ruta-serena-a1b2c3d4e-equipo.vercel.app',
    'https://usuario:clave@ruta-serena.vercel.app',
  ]) {
    assert.throws(() => validarUrlPublica(url), undefined, String(url));
  }
});

test('acepta el origen HTTPS de producción y exige origen sin ruta para la web', () => {
  assert.equal(validarUrlPublica('https://ruta-serena.vercel.app/', { soloOrigen: true }), 'https://ruta-serena.vercel.app');
  assert.throws(() => validarUrlPublica('https://ruta-serena.vercel.app/apoyo', { soloOrigen: true }));
  assert.equal(
    validarUrlPublica('https://github.com/equipo/repo/releases/latest/download/ruta-serena.apk'),
    'https://github.com/equipo/repo/releases/latest/download/ruta-serena.apk',
  );
});

test('assetlinks.json declara la relación de TWA con el paquete y la huella', () => {
  const huella = Array(32).fill('AB').join(':');
  assert.deepEqual(generarAssetLinks('app.ejemplo.twa', [huella]), [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'app.ejemplo.twa', sha256_cert_fingerprints: [huella] },
  }]);
});

test('detecta una clave que quedaría dentro del repositorio', () => {
  assert.equal(dentroDelRepositorio(join(DIR_REPO, 'android', 'clave.jks')), true);
  assert.equal(dentroDelRepositorio(join(homedir(), '.ruta-serena', 'ruta-serena-release.jks')), false);
});
