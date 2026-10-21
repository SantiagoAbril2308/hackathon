import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** Título de pantalla con botón de volver opcional y una acción a la derecha. */
export default function Encabezado({ titulo, volver = true, accion = null }) {
  const navegar = useNavigate();
  return (
    <header className="encabezado">
      {volver ? (
        <button
          type="button"
          className="boton-icono"
          aria-label="Volver"
          onClick={() => (window.history.length > 1 ? navegar(-1) : navegar('/'))}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
      <h1>{titulo}</h1>
      {accion ?? <span />}
    </header>
  );
}
