/**
 * Genera los iconos de la PWA (PWA-04) en public/icons: SVG + PNG + badge monocromático.
 * Uso: npm run icons   (requiere sharp, dependencia de desarrollo)
 * Diseño neutro: sol del amanecer y dos hojas. Sin símbolos clínicos ni estigmatizantes.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DESTINO = fileURLToPath(new URL('../public/icons/', import.meta.url));
const PRIMARIO = '#164F3B';
const SECUNDARIO = '#4e9376';
const HOJA_CLARA = '#91c4a7';
const ACENTO = '#f3b34c';

/** La misma silueta de Logo.jsx, centrada y con camino transparente. */
function simbolo({ s = 1, sol = ACENTO, rayos = ACENTO, hojaIzq = SECUNDARIO, hojaDer = HOJA_CLARA } = {}) {
  const t = (256 * (1 - s)).toFixed(2);
  return `<g transform="translate(${t} ${t}) scale(${s})">
    <g transform="translate(56 40) scale(4)">
      <defs><mask id="ruta-camino"><rect width="100" height="108" fill="white"/>
        <path d="M38 101C35 88 63 79 58 69C55 63 49 62 53 56C56 51 65 47 75 44C61 52 58 57 61 62C66 69 70 74 64 82C58 91 50 94 48 101Z" fill="black"/>
      </mask></defs>
      <path d="M50 4V11M27 11L31 17M72 11L68 17M11 28L18 31M89 28L82 31" fill="none" stroke="${rayos}" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="50" cy="38" r="21" fill="${sol}"/>
      <g mask="url(#ruta-camino)">
        <path d="M48 100C22 96 8 76 10 46C35 46 50 63 51 86Z" fill="${hojaIzq}"/>
        <path d="M48 100C77 97 94 73 90 44C64 43 45 62 48 100Z" fill="${hojaDer}"/>
      </g>
    </g>
  </g>`;
}

const svg = (contenido, { fondo, rx = 0, tam = 512 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${tam}" height="${tam}">${
    fondo ? `<rect width="512" height="512" rx="${rx}" fill="${fondo}"/>` : ''
  }${contenido}</svg>`;

const ARCHIVOS = {
  // Icono principal (esquinas redondeadas) y favicon
  'icono.svg': svg(simbolo({ s: 0.86 }), { fondo: PRIMARIO, rx: 112 }),
  // Maskable: fondo a sangre y símbolo dentro de la zona segura (80 %)
  'icono-maskable.svg': svg(simbolo({ s: 0.62 }), { fondo: PRIMARIO }),
  // Badge monocromático: Android usa solo el canal alfa (silueta blanca sobre transparente)
  'badge.svg': svg(simbolo({ s: 0.95, sol: '#fff', rayos: '#fff', hojaIzq: '#fff', hojaDer: '#fff' })),
  // Logo sin fondo para la interfaz
  'logo.svg': svg(simbolo({ hojaIzq: '#1b5945', hojaDer: '#6aa58b' })),
};

const PNG = [
  ['icono.svg', 'icon-192.png', 192],
  ['icono.svg', 'icon-512.png', 512],
  ['icono-maskable.svg', 'maskable-512.png', 512],
  ['icono-maskable.svg', 'apple-touch-icon.png', 180],
  ['badge.svg', 'badge-96.png', 96],
  ['icono.svg', 'atajo-apoyo-96.png', 96],
];

await mkdir(DESTINO, { recursive: true });
for (const [nombre, contenido] of Object.entries(ARCHIVOS)) {
  await writeFile(`${DESTINO}${nombre}`, contenido, 'utf8');
}
for (const [origen, destino, tam] of PNG) {
  await sharp(Buffer.from(ARCHIVOS[origen]), { density: 300 }).resize(tam, tam).png().toFile(`${DESTINO}${destino}`);
}
console.log(`Iconos generados en public/icons: ${[...Object.keys(ARCHIVOS), ...PNG.map((p) => p[1])].join(', ')}`);
