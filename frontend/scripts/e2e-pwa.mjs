/**
 * npm run e2e:pwa — verificación de punta a punta de la PWA en un navegador real (Chrome/Edge sin interfaz).
 *
 * Requisitos: backend en http://localhost:3000 con datos sintéticos y frontend compilado con
 *   VITE_API_URL=http://localhost:3000 npm run build
 * El script sirve dist/ en el puerto 5173 (origen permitido por CORS) y lo APAGA a mitad de la prueba
 * para comprobar el modo sin conexión de verdad. Navegador: E2E_NAVEGADOR o Chrome/Edge instalado.
 * Escribe el resultado en docs/e2e-pwa.md.
 * En Windows ejecútalo desde PowerShell o CMD: lanzado desde Git Bash, Edge termina al iniciar.
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(RAIZ, 'dist');
const PUERTO = 5173;
const BASE = `http://localhost:${PUERTO}`;
const API = process.env.E2E_API ?? 'http://localhost:3000';
const RUTAS_A11Y = ['/', '/bienvenida', '/apoyo', '/directorio', '/directorio/7', '/mapa', '/asistente', '/actividades', '/ajustes', '/acerca'];
const NAVEGADORES = [
  process.env.E2E_NAVEGADOR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

// ------------------------------------------------------------------ servidor estático de dist/
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

function servirDist() {
  const servidor = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, BASE).pathname);
    let archivo = normalize(join(DIST, ruta));
    if (!archivo.startsWith(DIST) || !existsSync(archivo) || ruta.endsWith('/')) archivo = join(DIST, 'index.html');
    try {
      const contenido = await readFile(archivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(contenido);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok, falla) => {
    servidor.once('error', falla);
    servidor.listen(PUERTO, 'localhost', () => ok(servidor));
  });
}

/** Apaga el servidor de verdad: cierra también las conexiones keep-alive del navegador. */
function apagar(servidor) {
  return new Promise((ok) => {
    servidor.close(() => ok());
    servidor.closeAllConnections();
  });
}

// ------------------------------------------------------------------ utilidades de prueba
const resultados = [];
const afirmar = (condicion, mensaje) => {
  if (!condicion) throw new Error(mensaje);
};

async function caso(id, nombre, prueba) {
  const inicio = performance.now();
  try {
    const detalle = await prueba();
    resultados.push({ id, nombre, ok: true, detalle: detalle ?? '', ms: Math.round(performance.now() - inicio) });
    console.log(`  ✅ ${id} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  } catch (err) {
    resultados.push({ id, nombre, ok: false, detalle: err.message, ms: Math.round(performance.now() - inicio) });
    console.log(`  ❌ ${id} ${nombre} — ${err.message}`);
  }
}

async function nuevaPagina(navegador, { oscuro = false } = {}) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await pagina.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: oscuro ? 'dark' : 'light' }]);
  await pagina.evaluateOnNewDocument(() => localStorage.setItem('rs-bienvenida-vista', '1'));
  return pagina;
}

const textoVisible = (pagina, texto, tiempo = 8000) =>
  pagina.waitForFunction((t) => document.body.innerText.includes(t), { timeout: tiempo }, texto);

// ------------------------------------------------------------------ pruebas
async function main() {
  afirmar(existsSync(join(DIST, 'sw.js')), 'No existe dist/sw.js: ejecuta primero VITE_API_URL=http://localhost:3000 npm run build');
  const salud = await fetch(`${API}/api/salud`).then((r) => r.json()).catch(() => null);
  afirmar(salud?.ok, `El backend no responde en ${API}. Inícialo con: cd backend && npm run dev`);
  const ejecutable = NAVEGADORES.find((n) => existsSync(n));
  afirmar(ejecutable, 'No se encontró Chrome ni Edge. Indica la ruta con E2E_NAVEGADOR.');

  const axe = await readFile(join(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const perfil = await mkdtemp(join(tmpdir(), 'ruta-serena-e2e-'));
  let servidor = await servirDist();
  const navegador = await puppeteer.launch({ executablePath: ejecutable, headless: true, userDataDir: perfil, args: ['--no-first-run', '--no-default-browser-check'] });
  console.log(`Navegador: ${await navegador.version()} · App: ${BASE} · API: ${API}\n`);

  try {
    await navegador.defaultBrowserContext().overridePermissions(BASE, ['notifications']);
    const pagina = await nuevaPagina(navegador);

    await caso('PWA-02', 'Service worker propio instalado y controlando la app', async () => {
      await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
      await pagina.evaluate(() => navigator.serviceWorker.ready);
      await pagina.reload({ waitUntil: 'networkidle0' });
      const info = await pagina.evaluate(async () => {
        const claves = await caches.keys();
        const pre = claves.find((k) => k.includes('precache'));
        const urls = pre ? (await (await caches.open(pre)).keys()).map((r) => new URL(r.url).pathname) : [];
        return { controla: !!navigator.serviceWorker.controller, total: urls.length, index: urls.some((u) => u.startsWith('/index.html')) };
      });
      afirmar(info.controla, 'el service worker no controla la página');
      afirmar(info.total > 20 && info.index, `precarga incompleta (${info.total} archivos)`);
      return `${info.total} archivos precargados (incluye index.html, JS, CSS, fuentes e iconos)`;
    });

    await caso('PWA-03', 'Manifest con nombre, standalone, iconos 192/512 y atajo a /apoyo', async () => {
      const m = await pagina.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
      afirmar(m.display === 'standalone' && m.start_url === '/' && m.name && m.short_name, 'faltan campos básicos');
      const tamanos = m.icons.map((i) => i.sizes);
      afirmar(tamanos.includes('192x192') && tamanos.includes('512x512'), 'faltan iconos 192/512');
      afirmar(m.shortcuts?.some((s) => s.url === '/apoyo'), 'falta el atajo a /apoyo');
      for (const icono of [...m.icons, ...m.shortcuts[0].icons]) {
        const estado = await pagina.evaluate(async (src) => (await fetch(src)).status, icono.src);
        afirmar(estado === 200, `icono no disponible: ${icono.src}`);
      }
      return `${m.icons.length} iconos + atajo "${m.shortcuts[0].name}"`;
    });

    await caso('CP-01', 'Directorio con fuente y fecha de verificación en cada tarjeta', async () => {
      await pagina.goto(`${BASE}/directorio`, { waitUntil: 'networkidle0' });
      await textoVisible(pagina, 'servicios encontrados');
      const tarjetas = await pagina.$$eval('article.tarjeta', (ts) =>
        ts.map((t) => ({ fuente: !!t.querySelector('.tarjeta__fuente a[href^="https://"]'), fecha: !!t.querySelector('.tarjeta__fuente time[datetime]') })),
      );
      afirmar(tarjetas.length > 0, 'no hay tarjetas');
      afirmar(tarjetas.every((t) => t.fuente && t.fecha), 'alguna tarjeta no muestra fuente o fecha');
      return `${tarjetas.length} tarjetas, todas con fuente enlazada y fecha`;
    });

    await caso('PWA-02', '/api/directorio.json queda en caché y en IndexedDB', async () => {
      await pagina.goto(`${BASE}/apoyo`, { waitUntil: 'networkidle0' });
      await textoVisible(pagina, 'Última actualización');
      const info = await pagina.evaluate(async () => {
        const cache = await caches.open('ruta-serena-directorio');
        const enCache = (await cache.keys()).length;
        const copia = await new Promise((ok) => {
          const s = indexedDB.open('ruta-serena', 1);
          s.onsuccess = () => {
            const g = s.result.transaction('kv').objectStore('kv').get('directorio');
            g.onsuccess = () => ok(g.result);
          };
        });
        return { enCache, servicios: copia?.datos?.servicios?.length ?? 0, guardado: copia?.guardado_en };
      });
      afirmar(info.enCache >= 1, 'directorio.json no está en la caché del service worker');
      afirmar(info.servicios > 0, 'no hay copia en IndexedDB');
      return `caché SW: ${info.enCache} · IndexedDB: ${info.servicios} servicios (guardado ${info.guardado})`;
    });

    await caso('PWA-05/06', 'Activar "Acceso rápido" muestra la notificación con showNotification()', async () => {
      await pagina.goto(`${BASE}/ajustes`, { waitUntil: 'networkidle0' });
      await pagina.waitForSelector('button[role=switch]');
      await pagina.click('button[role=switch]');
      await pagina.waitForSelector('button[role=switch][aria-checked=true]', { timeout: 8000 });
      const notis = await pagina.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        return (await reg.getNotifications()).map((n) => ({ titulo: n.title, cuerpo: n.body, silenciosa: n.silent, url: n.data?.url, tag: n.tag }));
      });
      afirmar(notis.length === 1, `se esperaba 1 notificación y hay ${notis.length}`);
      const [n] = notis;
      afirmar(n.titulo === 'Ruta Serena' && n.cuerpo === 'Toca para ver líneas de apoyo' && n.silenciosa && n.url === '/apoyo', JSON.stringify(n));
      return `"${n.titulo}: ${n.cuerpo}" · silenciosa · abre ${n.url}`;
    });

    await caso('PWA-08', 'La preferencia se guarda en IndexedDB y la notificación vuelve a mostrarse al abrir la app', async () => {
      await pagina.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).forEach((n) => n.close()));
      const otra = await nuevaPagina(navegador);
      await otra.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
      await otra.waitForFunction(async () => (await (await navigator.serviceWorker.ready).getNotifications()).length === 1, { timeout: 8000 });
      await otra.close();
      return 'notificación cerrada → al abrir la app se mostró de nuevo';
    });

    await caso('CP-04', 'Abrir /apoyo (destino de la notificación) muestra el 123 en menos de 2 s', async () => {
      const tiempos = [];
      for (let i = 0; i < 3; i += 1) {
        const p = await nuevaPagina(navegador);
        const inicio = performance.now();
        await p.goto(`${BASE}/apoyo`);
        await p.waitForSelector('a[href="tel:123"]');
        tiempos.push(Math.round(performance.now() - inicio));
        await p.close();
      }
      const peor = Math.max(...tiempos);
      afirmar(peor < 2000, `tardó ${peor} ms`);
      return `${tiempos.join(' / ')} ms (máx. ${peor} ms)`;
    });

    // ---------------------------------------------------------------- modo avión
    await caso('CP-05', '/apoyo funciona sin conexión (servidor apagado y red cortada)', async () => {
      await apagar(servidor);
      servidor = null;
      const objetivoSw = await navegador.waitForTarget((t) => t.type() === 'service_worker');
      const cdpSw = await objetivoSw.createCDPSession();
      await cdpSw.send('Network.enable');
      await cdpSw.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      const p = await nuevaPagina(navegador);
      await p.setOfflineMode(true);
      const inicio = performance.now();
      await p.goto(`${BASE}/apoyo`);
      await p.waitForSelector('a[href="tel:123"]');
      const ms = Math.round(performance.now() - inicio);
      await textoVisible(p, 'Sin conexión: usando la copia guardada');
      await textoVisible(p, 'Línea Serena Nacional');
      const lineas = await p.$$eval('article.tarjeta', (ts) => ts.length);
      await p.goto(`${BASE}/directorio`);
      await textoVisible(p, 'servicios encontrados');
      await p.close();
      await cdpSw.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      return `123 visible en ${ms} ms sin servidor ni red · ${lineas} líneas desde la copia · el directorio también abre`;
    });

    servidor = await servirDist();

    // ---------------------------------------------------------------- accesibilidad
    for (const oscuro of [false, true]) {
      await caso('CP-12', `WCAG 2.1 AA con axe-core (modo ${oscuro ? 'oscuro' : 'claro'}) en ${RUTAS_A11Y.length} pantallas`, async () => {
        const fallas = [];
        const p = await nuevaPagina(navegador, { oscuro });
        if (oscuro) await p.evaluateOnNewDocument(() => localStorage.setItem('rs-apariencia', 'oscuro'));
        for (const ruta of RUTAS_A11Y) {
          if (ruta === '/bienvenida') await p.evaluateOnNewDocument(() => localStorage.removeItem('rs-bienvenida-vista'));
          await p.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle0' });
          await new Promise((r) => setTimeout(r, 400));
          await p.addScriptTag({ content: axe });
          const r = await p.evaluate(() =>
            window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
          );
          for (const v of r.violations) fallas.push(`${ruta}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target?.join(' ')}`);
          if (ruta === '/bienvenida') await p.evaluateOnNewDocument(() => localStorage.setItem('rs-bienvenida-vista', '1'));
        }
        await p.close();
        afirmar(fallas.length === 0, fallas.join(' | '));
        return 'sin violaciones';
      });
    }

    await caso('A11Y', 'Botones y controles de al menos 48 px', async () => {
      const p = await nuevaPagina(navegador);
      const pequenos = [];
      for (const ruta of ['/', '/apoyo', '/directorio', '/asistente', '/ajustes']) {
        await p.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle0' });
        const lista = await p.$$eval('button, a.boton, a.boton-icono, select, input, .barra-nav a, .chip, .cta-apoyo', (els) =>
          els
            .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
            .map((e) => {
              const r = e.getBoundingClientRect();
              const extra = getComputedStyle(e, '::before').content !== 'none' ? 16 : 0; // área táctil ampliada
              return { texto: (e.innerText || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), alto: Math.round(r.height) + extra };
            })
            .filter((e) => e.alto < 48),
        );
        pequenos.push(...lista.map((e) => `${ruta}: "${e.texto}" ${e.alto}px`));
      }
      await p.close();
      afirmar(pequenos.length === 0, pequenos.join(' | '));
      return 'todos ≥ 48 px';
    });
  } finally {
    await navegador.close();
    if (servidor) await apagar(servidor);
    await rm(perfil, { recursive: true, force: true }).catch(() => {});
  }

  const ok = resultados.filter((r) => r.ok).length;
  console.log(`\n${ok}/${resultados.length} verificaciones correctas.`);
  const md = [
    '# Verificación de punta a punta de la PWA — Ruta Serena',
    '',
    `Fecha: ${new Date().toISOString()} · Navegador: ${ejecutable.split(/[\\/]/).pop()} sin interfaz (móvil 390×844) · Datos sintéticos · Comando: \`npm run e2e:pwa\``,
    '',
    '| Caso | Verificación | Resultado | Detalle |',
    '| --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.nombre} | ${r.ok ? '✅' : '❌'} | ${r.detalle.replace(/\|/g, '/')} |`),
    '',
    'Limitaciones: el toque físico sobre la notificación (PWA-07) no se puede automatizar sin interfaz; su lógica tiene prueba unitaria',
    '(`src/pwa/pwa.test.js`) y se valida a mano en Android. CP-04 mide la apertura de /apoyo, que es lo que hace notificationclick.',
    '',
  ].join('\n');
  await writeFile(resolve(RAIZ, '../docs/e2e-pwa.md'), md, 'utf8');
  console.log('Reporte: docs/e2e-pwa.md');
  if (ok !== resultados.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
});
