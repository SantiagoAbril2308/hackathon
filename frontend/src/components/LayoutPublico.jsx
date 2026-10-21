import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BarraNavegacion from './BarraNavegacion.jsx';
import { AvisoCompacto } from './Aviso.jsx';

/** Estructura de todas las pantallas públicas: salto al contenido, aviso obligatorio y navegación. */
export default function LayoutPublico() {
  const { pathname } = useLocation();
  const principal = useRef(null);
  const primera = useRef(true);

  // Al cambiar de pantalla, el foco va al contenido (lectores de pantalla) y se vuelve arriba.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    window.scrollTo(0, 0);
    principal.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Ir al contenido
      </a>
      <main id="contenido" className="app__contenido" tabIndex={-1} ref={principal}>
        <Suspense fallback={<p className="vacio">Cargando…</p>}>
          <Outlet />
        </Suspense>
        <AvisoCompacto />
      </main>
      <BarraNavegacion />
    </div>
  );
}
