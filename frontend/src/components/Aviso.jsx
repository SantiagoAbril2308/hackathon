export const TEXTO_AVISO =
  'Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.';

export default function Aviso() {
  return (
    <aside className="aviso" role="note" aria-label="Aviso importante">
      <p>
        Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro,{' '}
        <a href="tel:123">llama al 123</a>.
      </p>
    </aside>
  );
}
