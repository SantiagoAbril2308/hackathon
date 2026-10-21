import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LayoutPublico from './components/LayoutPublico.jsx';
import Inicio from './pages/Inicio.jsx';
import Apoyo from './pages/Apoyo.jsx';
import { ProveedorSesionAdmin } from './hooks/useSesionAdmin.jsx';
import { restaurarAlIniciar } from './services/accesoRapido.js';

// /apoyo e inicio van en el paquete principal; el resto se descarga solo cuando se visita.
const Bienvenida = lazy(() => import('./pages/Bienvenida.jsx'));
const Directorio = lazy(() => import('./pages/Directorio.jsx'));
const DetalleServicio = lazy(() => import('./pages/DetalleServicio.jsx'));
const Mapa = lazy(() => import('./pages/Mapa.jsx'));
const Asistente = lazy(() => import('./pages/Asistente.jsx'));
const Actividades = lazy(() => import('./pages/Actividades.jsx'));
const Ajustes = lazy(() => import('./pages/Ajustes.jsx'));
const Acerca = lazy(() => import('./pages/Acerca.jsx'));
const NoEncontrado = lazy(() => import('./pages/NoEncontrado.jsx'));

const LayoutAdmin = lazy(() => import('./pages/admin/LayoutAdmin.jsx'));
const Login = lazy(() => import('./pages/admin/Login.jsx'));
const Cambios = lazy(() => import('./pages/admin/Cambios.jsx'));
const ServiciosAdmin = lazy(() => import('./pages/admin/Servicios.jsx'));
const Verificar = lazy(() => import('./pages/admin/Verificar.jsx'));
const Reportes = lazy(() => import('./pages/admin/Reportes.jsx'));
const ActividadesAdmin = lazy(() => import('./pages/admin/ActividadesAdmin.jsx'));
const Fuentes = lazy(() => import('./pages/admin/Fuentes.jsx'));

export default function App() {
  // PWA-08: si el acceso rápido está activo, la notificación vuelve a mostrarse al abrir la app.
  useEffect(() => {
    restaurarAlIniciar().catch(() => {});
  }, []);

  return (
    <ProveedorSesionAdmin>
      <Suspense fallback={<p className="vacio">Cargando…</p>}>
        <Routes>
          <Route path="/bienvenida" element={<Bienvenida />} />
          <Route element={<LayoutPublico />}>
            <Route index element={<Inicio />} />
            <Route path="apoyo" element={<Apoyo />} />
            <Route path="directorio" element={<Directorio />} />
            <Route path="directorio/:id" element={<DetalleServicio />} />
            <Route path="mapa" element={<Mapa />} />
            <Route path="asistente" element={<Asistente />} />
            <Route path="actividades" element={<Actividades />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="acerca" element={<Acerca />} />
            <Route path="*" element={<NoEncontrado />} />
          </Route>

          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<LayoutAdmin />}>
            <Route index element={<Navigate to="cambios" replace />} />
            <Route path="cambios" element={<Cambios />} />
            <Route path="servicios" element={<ServiciosAdmin />} />
            <Route path="verificar" element={<Verificar />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="actividades" element={<ActividadesAdmin />} />
            <Route path="fuentes" element={<Fuentes />} />
          </Route>
        </Routes>
      </Suspense>
    </ProveedorSesionAdmin>
  );
}
