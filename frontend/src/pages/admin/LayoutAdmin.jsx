import { Suspense } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { Inbox, Database, ListChecks, Flag, CalendarDays, Globe, House, LogOut } from 'lucide-react';
import { Simbolo } from '../../components/Logo.jsx';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';

const ENLACES = [
  { a: '/admin/cambios', texto: 'Cambios pendientes', Icono: Inbox },
  { a: '/admin/servicios', texto: 'Servicios', Icono: Database },
  { a: '/admin/verificar', texto: 'Verificar', Icono: ListChecks },
  { a: '/admin/reportes', texto: 'Reportes ciudadanos', Icono: Flag },
  { a: '/admin/actividades', texto: 'Actividades', Icono: CalendarDays },
  { a: '/admin/fuentes', texto: 'Fuentes oficiales', Icono: Globe },
];

export default function LayoutAdmin() {
  const { sesion, cerrar } = useSesionAdmin();
  if (!sesion) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin">
      <a className="saltar" href="#contenido-admin">
        Ir al contenido
      </a>
      <nav className="admin__lateral" aria-label="Administración">
        <div className="admin__marca">
          <Simbolo tamano={30} /> Ruta Serena
        </div>
        {ENLACES.map(({ a, texto, Icono }) => (
          <NavLink key={a} to={a}>
            <Icono size={18} aria-hidden="true" /> {texto}
          </NavLink>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer">
          <House size={18} aria-hidden="true" /> Ver sitio público{' '}<span className="solo-lectores">(se abre en otra pestaña)</span>
        </a>
        <button type="button" onClick={cerrar}>
          <LogOut size={18} aria-hidden="true" /> Cerrar sesión
        </button>
        <div className="admin__usuario">
          <strong style={{ color: '#fff', display: 'block' }}>{sesion.admin.nombre}</strong>
          {sesion.admin.email}
        </div>
      </nav>
      <main id="contenido-admin" className="admin__principal" tabIndex={-1}>
        <Suspense fallback={<p>Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
