import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import Ilustracion from '../components/Ilustracion.jsx';
import { AvisoCompacto } from '../components/Aviso.jsx';
import { marcarBienvenidaVista } from '../services/bienvenida.js';

const PASOS = [
  {
    titulo: 'Un camino hacia más claridad',
    texto: 'Encuentra líneas y servicios de apoyo en Villavicencio y el Meta.',
  },
  {
    titulo: 'Información que puedes revisar',
    texto: 'Cada servicio muestra su fuente oficial y la fecha en que se verificó.',
  },
  {
    titulo: 'Siempre a la mano',
    texto: 'Las líneas de apoyo funcionan incluso sin conexión. Si tu vida o la de alguien está en peligro, llama al 123.',
  },
];

export default function Bienvenida() {
  const [paso, setPaso] = useState(0);
  const navegar = useNavigate();
  const ultimo = paso === PASOS.length - 1;

  function terminar() {
    marcarBienvenidaVista();
    navegar('/', { replace: true });
  }

  return (
    <main className="bienvenida" id="contenido">
      <div className="bienvenida__barra">
        <Link to="/apoyo" className="boton boton--texto boton--pequeno" onClick={marcarBienvenidaVista}>
          <LifeBuoy size={16} aria-hidden="true" /> Necesito apoyo ahora
        </Link>
        <button type="button" className="boton boton--texto boton--pequeno" onClick={terminar}>
          Omitir
        </button>
      </div>

      <div className="bienvenida__cuerpo">
        <div className="bienvenida__logo">
          <Logo tamano={64} />
        </div>
        <div className="bienvenida__ilustracion">
          <Ilustracion />
        </div>

        <div className="bienvenida__panel">
          <section aria-live="polite">
            <h1>{PASOS[paso].titulo}</h1>
            <p className="texto-suave">{PASOS[paso].texto}</p>
          </section>

          <div className="bienvenida__puntos" aria-label={`Paso ${paso + 1} de ${PASOS.length}`} role="img">
            {PASOS.map((p, i) => (
              <span key={p.titulo} aria-current={i === paso ? 'step' : undefined} />
            ))}
          </div>

          <button type="button" className="boton boton--bloque" onClick={() => (ultimo ? terminar() : setPaso(paso + 1))}>
            {ultimo ? 'Empezar' : 'Siguiente'} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <AvisoCompacto />
    </main>
  );
}
