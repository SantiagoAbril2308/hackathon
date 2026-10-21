import { useId } from 'react';

/** Paisaje del amanecer con colinas y un camino (decorativo). */
export default function Ilustracion({ className, variante = 'completa' }) {
  const recortada = variante === 'esquina';
  const idCielo = `cielo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      className={className}
      viewBox={recortada ? '120 0 280 260' : '0 0 400 320'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={idCielo} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE7C2" />
          <stop offset="1" stopColor="#F8F6F0" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill={`url(#${idCielo})`} />
      <circle cx="268" cy="118" r="44" fill="#F2A93B" opacity="0.9" />
      <path d="M0 190 C 80 150 150 170 220 150 S 340 120 400 140 V 320 H 0 Z" fill="#7DB88F" />
      <path d="M0 230 C 90 200 170 220 250 196 S 360 180 400 196 V 320 H 0 Z" fill="#2E7D64" />
      <path d="M0 270 C 100 250 200 266 290 246 S 380 240 400 250 V 320 H 0 Z" fill="#164F3B" />
      <path
        d="M168 320 C 190 290 236 278 240 258 C 244 238 214 226 236 206 C 252 192 278 190 290 186"
        stroke="#F8F6F0"
        strokeWidth="16"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}
