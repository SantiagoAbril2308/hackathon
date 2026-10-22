import { Link, NavLink } from 'react-router-dom';
import { Phone } from 'lucide-react';
import Logo from './Logo.jsx';

const ENLACES = [
  { a: '/', texto: 'Inicio', fin: true },
  { a: '/directorio', texto: 'Directorio' },
  { a: '/mapa', texto: 'Mapa' },
  { a: '/asistente', texto: 'Asistente' },
  { a: '/actividades', texto: 'Actividades' },
  { a: '/ajustes', texto: 'Ajustes' },
];

/**
 * Cabecera para tablet y computador (≥ 768 px). En móvil se oculta y se usa la barra inferior.
 * El botón "Necesito apoyo ahora" queda siempre visible arriba.
 */
export default function CabeceraSitio() {
  return (
    <header className="sitio-cabecera">
      <div className="sitio-cabecera__interior">
        <Link to="/" className="sitio-cabecera__marca" aria-label="Ruta Serena, ir al inicio">
          <Logo tamano={46} lema={false} horizontal />
        </Link>
        <nav aria-label="Navegación principal" className="sitio-cabecera__nav">
          {ENLACES.map(({ a, texto, fin }) => (
            <NavLink key={a} to={a} end={fin}>
              {texto}
            </NavLink>
          ))}
        </nav>
        <Link to="/apoyo" className="boton boton--emergencia sitio-cabecera__apoyo">
          <Phone size={18} aria-hidden="true" /> Necesito apoyo ahora
        </Link>
      </div>
    </header>
  );
}
