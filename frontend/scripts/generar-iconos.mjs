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
const SECUNDARIO = '#2E7D64';
const HOJA_CLARA = '#7DB88F';
const ACENTO = '#F2A93B';

/** Sol + rayos + dos hojas, dibujado en una caja de 512 centrada en (256, 256) con escala `s`. */
function simbolo({ s = 1, sol = ACENTO, rayos = ACENTO, hojaIzq = SECUNDARIO, hojaDer = HOJA_CLARA, vena = true } = {}) {
  const t = (256 * (1 - s)).toFixed(2);
  const rayo = (ang) => `<rect x="250" y="70" width="12" height="40" rx="6" fill="${rayos}" transform="rotate(${ang} 256 196)"/>`;
  return `<g transform="translate(${t} ${t}) scale(${s})">
    ${[-60, -30, 0, 30, 60].map(rayo).join('')}
    <circle cx="256" cy="196" r="70" fill="${sol}"/>
    <path d="M256 404 C 166 398 104 330 112 236 C 196 236 252 296 256 404 Z" fill="${hojaIzq}"/>
    <path d="M256 404 C 346 398 408 330 400 236 C 316 236 260 296 256 404 Z" fill="${hojaDer}"/>
    ${vena ? `<path d="M256 404 C 250 340 232 300 196 270" stroke="${PRIMARIO}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".35"/>` : ''}
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
  'badge.svg': svg(simbolo({ s: 0.95, sol: '#fff', rayos: '#fff', hojaIzq: '#fff', hojaDer: '#fff', vena: false })),
  // Logo sin fondo para la interfaz
  'logo.svg': svg(simbolo()),
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
