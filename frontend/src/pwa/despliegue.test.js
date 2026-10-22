import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarApiPublica } from '../../scripts/validar-despliegue.mjs';

describe('API del frontend publicado', () => {
  it.each([
    '',
    '/api',
    'http://api.rutaserena.co',
    'https://localhost:3000',
    'https://127.0.0.1',
    'https://[::1]',
    'https://192.168.1.25',
    'https://10.0.0.3',
    'https://api.example.com',
    'https://api.ruta-serena.example',
    'https://usuario:secreto@api.rutaserena.co',
    'https://api.rutaserena.co?token=secreto',
    'https://api.rutaserena.co#secreto',
    'https://api.rutaserena.co/api',
  ])('bloquea una dirección local, insegura o mal configurada: %s', (valor) => {
    expect(() => validarApiPublica(valor)).toThrow();
  });

  it('acepta un origen público HTTPS sin contactar al servidor', () => {
    expect(validarApiPublica('https://ruta-serena-api.onrender.com/')).toBe('https://ruta-serena-api.onrender.com');
  });

  it('mantiene /api fuera del fallback HTML de las rutas públicas', () => {
    const configuracion = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));
    const regla = new RegExp(`^${configuracion.rewrites[0].source}$`);
    expect(regla.test('/bienvenida')).toBe(true);
    expect(regla.test('/directorio/7')).toBe(true);
    expect(regla.test('/api')).toBe(false);
    expect(regla.test('/api/directorio.json')).toBe(false);
  });

  it('sirve Digital Asset Links como JSON real, sin el fallback HTML', () => {
    const configuracion = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));
    const regla = new RegExp(`^${configuracion.rewrites[0].source}$`);
    expect(regla.test('/.well-known/assetlinks.json')).toBe(false);
    expect(regla.test('/well-known')).toBe(true);
    const cabeceras = configuracion.headers.find((h) => h.source === '/.well-known/assetlinks.json')?.headers ?? [];
    expect(cabeceras).toContainEqual({ key: 'Content-Type', value: 'application/json' });
  });
});
