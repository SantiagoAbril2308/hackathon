/** Símbolo de Ruta Serena: sol del amanecer y dos hojas (sin símbolos clínicos). */
export function Simbolo({ tamano = 40, titulo }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="96 60 320 360"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
      focusable="false"
    >
      {[-60, -30, 0, 30, 60].map((angulo) => (
        <rect key={angulo} x="250" y="70" width="12" height="40" rx="6" fill="#F2A93B" transform={`rotate(${angulo} 256 196)`} />
      ))}
      <circle cx="256" cy="196" r="70" fill="#F2A93B" />
      <path d="M256 404 C 166 398 104 330 112 236 C 196 236 252 296 256 404 Z" fill="#2E7D64" />
      <path d="M256 404 C 346 398 408 330 400 236 C 316 236 260 296 256 404 Z" fill="#7DB88F" />
    </svg>
  );
}

export default function Logo({ tamano = 72, lema = true }) {
  return (
    <div className="logo">
      <Simbolo tamano={tamano} />
      <span style={{ fontFamily: 'var(--fuente-titulo)', fontSize: tamano * 0.42, fontWeight: 600, lineHeight: 1 }}>
        Ruta
        <br />
        Serena
      </span>
      {lema && <span className="texto-suave" style={{ fontSize: '0.75rem' }}>Claridad que acompaña</span>}
    </div>
  );
}
