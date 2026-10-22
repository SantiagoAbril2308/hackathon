import { useId } from 'react';

/** Amanecer, hojas y un camino en espacio negativo, sin símbolos clínicos. */
export function Simbolo({ tamano = 40, titulo }) {
  const mascara = `ruta-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      className="marca-simbolo"
      width={tamano}
      height={tamano}
      viewBox="0 0 100 108"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
      focusable="false"
    >
      <defs>
        <mask id={mascara}>
          <rect width="100" height="108" fill="white" />
          <path d="M38 101C35 88 63 79 58 69C55 63 49 62 53 56C56 51 65 47 75 44C61 52 58 57 61 62C66 69 70 74 64 82C58 91 50 94 48 101Z" fill="black" />
        </mask>
      </defs>
      <g fill="none" stroke="#f3b34c" strokeWidth="2.8" strokeLinecap="round">
        <path d="M50 4V11M27 11L31 17M72 11L68 17M11 28L18 31M89 28L82 31" />
      </g>
      <circle cx="50" cy="38" r="21" fill="#f3b34c" />
      <g mask={`url(#${mascara})`}>
        <path d="M48 100C22 96 8 76 10 46C35 46 50 63 51 86Z" fill="var(--marca-hoja, #1b5945)" />
        <path d="M48 100C77 97 94 73 90 44C64 43 45 62 48 100Z" fill="var(--marca-hoja-clara, #6aa58b)" />
      </g>
    </svg>
  );
}

export default function Logo({ tamano = 72, lema = true, horizontal = false }) {
  return (
    <div className={`logo${horizontal ? ' logo--horizontal' : ''}`}>
      <Simbolo tamano={tamano} />
      <span className="logo__nombre" style={{ fontSize: tamano * (horizontal ? 0.5 : 0.42) }}>
        Ruta
        <br />
        Serena
      </span>
      {lema && <span className="texto-suave" style={{ fontSize: '0.75rem' }}>Claridad que acompaña</span>}
    </div>
  );
}
