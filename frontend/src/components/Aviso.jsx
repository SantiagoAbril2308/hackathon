import { Phone, TriangleAlert } from 'lucide-react';

export const TEXTO_AVISO =
  'Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.';

/** Aviso obligatorio en formato compacto: va al pie de TODAS las pantallas públicas. */
export function AvisoCompacto() {
  return (
    <aside className="aviso-compacto" aria-label="Aviso importante">
      <p style={{ margin: 0 }}>
        Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro,{' '}
        <a href="tel:123">llama al 123</a>.
      </p>
    </aside>
  );
}

/** Aviso destacado con botón de llamada (inicio y líneas de apoyo). */
export function Aviso123() {
  return (
    <section className="aviso-123" aria-label="Si estás en peligro">
      <p className="aviso-123__texto">
        <span className="aviso-123__icono">
          <TriangleAlert size={18} aria-hidden="true" />
        </span>
        <span>
          <strong>Ruta Serena no es un servicio de salud.</strong> Si tu vida o la de alguien está en peligro, llama al 123.
        </span>
      </p>
      <a className="boton boton--emergencia boton--bloque" href="tel:123">
        <Phone size={18} aria-hidden="true" /> Llamar al 123
      </a>
    </section>
  );
}
