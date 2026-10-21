import { NavLink } from 'react-router-dom';
import { House, BookOpen, MessageCircle, Settings } from 'lucide-react';

const ENLACES = [
  { a: '/', texto: 'Inicio', Icono: House, fin: true },
  { a: '/directorio', texto: 'Directorio', Icono: BookOpen },
  { a: '/asistente', texto: 'Asistente', Icono: MessageCircle },
  { a: '/ajustes', texto: 'Ajustes', Icono: Settings },
];

export default function BarraNavegacion() {
  return (
    <nav className="barra-nav" aria-label="Navegación principal">
      {ENLACES.map(({ a, texto, Icono, fin }) => (
        <NavLink key={a} to={a} end={fin}>
          <Icono size={22} aria-hidden="true" />
          {texto}
        </NavLink>
      ))}
    </nav>
  );
}
