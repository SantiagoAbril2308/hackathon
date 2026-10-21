import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { manifest } from './manifest.js';
import { abrirApoyo } from '../sw/notificaciones.js';

// Vitest se ejecuta desde la carpeta frontend/.
const publico = (ruta) => resolve(process.cwd(), `public${ruta}`);

describe('PWA-03 manifest', () => {
  it('tiene name, short_name, start_url, display standalone e idioma', () => {
    expect(manifest).toMatchObject({ name: 'Ruta Serena', short_name: 'Ruta Serena', start_url: '/', display: 'standalone', lang: 'es-CO' });
  });

  it('declara iconos de 192 y 512 (y maskable) que existen en public/icons', () => {
    const tamanos = manifest.icons.map((i) => i.sizes);
    expect(tamanos).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icono of manifest.icons) expect(existsSync(publico(icono.src)), icono.src).toBe(true);
  });

  it('tiene un atajo a /apoyo', () => {
    expect(manifest.shortcuts).toEqual([expect.objectContaining({ url: '/apoyo' })]);
    expect(existsSync(publico(manifest.shortcuts[0].icons[0].src))).toBe(true);
  });
});

describe('PWA-04 iconos', () => {
  it('existen en SVG y PNG, más el badge monocromático', () => {
    for (const archivo of ['/icons/icono.svg', '/icons/badge.svg', '/icons/badge-96.png', '/icons/icon-192.png', '/icons/icon-512.png']) {
      expect(existsSync(publico(archivo)), archivo).toBe(true);
    }
    const badge = readFileSync(publico('/icons/badge.svg'), 'utf8');
    const colores = new Set(badge.match(/fill="(#[0-9a-fA-F]{3,6})"/g));
    expect([...colores]).toEqual(['fill="#fff"']); // un solo color: blanco
  });
});

describe('PWA-02 service worker', () => {
  const sw = readFileSync(resolve(process.cwd(), 'src/sw.js'), 'utf8');

  it('precarga el build, sirve las rutas sin conexión y guarda /api/directorio.json', () => {
    expect(sw).toContain('precacheAndRoute(self.__WB_MANIFEST)');
    expect(sw).toContain("createHandlerBoundToURL('/index.html')");
    expect(sw).toMatch(/directorio\.json/);
    expect(sw).toContain('NetworkFirst');
  });

  it('maneja notificationclick', () => {
    expect(sw).toContain("addEventListener('notificationclick'");
  });
});

describe('PWA-07 notificationclick abre o enfoca /apoyo', () => {
  const ORIGEN = 'https://ruta-serena.example';

  it('enfoca una ventana abierta y la lleva a /apoyo', async () => {
    const ventana = { url: `${ORIGEN}/directorio`, focus: vi.fn(), navigate: vi.fn() };
    ventana.focus.mockResolvedValue(ventana);
    const clientes = { matchAll: vi.fn().mockResolvedValue([ventana]), openWindow: vi.fn() };
    await abrirApoyo(clientes, ORIGEN);
    expect(ventana.focus).toHaveBeenCalled();
    expect(ventana.navigate).toHaveBeenCalledWith(`${ORIGEN}/apoyo`);
    expect(clientes.openWindow).not.toHaveBeenCalled();
  });

  it('si ya está en /apoyo solo la enfoca', async () => {
    const ventana = { url: `${ORIGEN}/apoyo`, focus: vi.fn(), navigate: vi.fn() };
    ventana.focus.mockResolvedValue(ventana);
    await abrirApoyo({ matchAll: vi.fn().mockResolvedValue([ventana]), openWindow: vi.fn() }, ORIGEN);
    expect(ventana.navigate).not.toHaveBeenCalled();
  });

  it('si no hay ventana abierta, abre /apoyo', async () => {
    const clientes = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn() };
    await abrirApoyo(clientes, ORIGEN);
    expect(clientes.openWindow).toHaveBeenCalledWith(`${ORIGEN}/apoyo`);
  });
});
