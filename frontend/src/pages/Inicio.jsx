import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Phone, BookOpen, MessageCircle, Map, CalendarDays, ChevronRight, Search, Info, Sun } from 'lucide-react';
import { Simbolo } from '../components/Logo.jsx';
import Ilustracion from '../components/Ilustracion.jsx';
import EstadoConexion from '../components/EstadoConexion.jsx';
import { Aviso123 } from '../components/Aviso.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';
import { saludo } from '../services/formato.js';
import { bienvenidaVista } from '../services/bienvenida.js';

const ACCESOS = [
  { a: '/directorio', titulo: 'Directorio', texto: 'Explora servicios', Icono: BookOpen },
  { a: '/asistente', titulo: 'Asistente', texto: 'Busca información', Icono: MessageCircle },
  { a: '/mapa', titulo: 'Mapa', texto: 'Servicios cerca', Icono: Map },
  { a: '/actividades', titulo: 'Actividades', texto: 'Encuentros en la ciudad', Icono: CalendarDays },
];

export default function Inicio() {
  const { guardadoEn } = useDirectorio();
  const [busqueda, setBusqueda] = useState('');
  const navegar = useNavigate();

  if (!bienvenidaVista()) return <Navigate to="/bienvenida" replace />;

  function buscar(evento) {
    evento.preventDefault();
    const q = busqueda.trim();
    navegar(q ? `/directorio?q=${encodeURIComponent(q)}` : '/directorio');
  }

  return (
    <>
      <header className="encabezado encabezado--izquierda" style={{ gridTemplateColumns: '1fr auto' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Simbolo tamano={30} />
          <span style={{ fontFamily: 'var(--fuente-titulo)', fontWeight: 600, fontSize: '1.1rem' }}>Ruta Serena</span>
        </span>
        <Link to="/acerca" className="boton-icono" aria-label="Acerca de Ruta Serena">
          <Info size={22} aria-hidden="true" />
        </Link>
      </header>

      <section className="inicio__hero">
        <Ilustracion className="inicio__ilustracion" variante="esquina" />
        <p className="saludo">
          {saludo()} <Sun size={16} color="#F2A93B" aria-hidden="true" style={{ verticalAlign: '-2px' }} />
        </p>
        <h1>Aquí para tu bienestar</h1>
        <p className="texto-suave">
          Líneas y servicios de apoyo oficiales, claros y confiables.
        </p>
      </section>

      <Link to="/apoyo" className="cta-apoyo">
        <span className="cta-apoyo__icono">
          <Phone size={22} aria-hidden="true" />
        </span>
        <span>
          Necesito apoyo ahora
          <br />
          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>Líneas para hablar con alguien</span>
        </span>
        <span>
          <ChevronRight size={22} aria-hidden="true" />
        </span>
      </Link>

      <form role="search" onSubmit={buscar} className="buscador" style={{ marginBottom: '1rem' }}>
        <label htmlFor="busqueda-inicio" className="solo-lectores">
          Buscar servicio, tema o lugar
        </label>
        <Search size={18} aria-hidden="true" />
        <input
          id="busqueda-inicio"
          className="entrada"
          type="search"
          placeholder="Buscar servicio, tema o lugar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          maxLength={100}
        />
      </form>

      <nav aria-label="Secciones">
        <ul className="cuadricula" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ACCESOS.map(({ a, titulo, texto, Icono }) => (
            <li key={a}>
              <Link to={a} className="acceso">
                <span className="acceso__icono">
                  <Icono size={22} aria-hidden="true" />
                </span>
                <strong>{titulo}</strong>
                <span>{texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <EstadoConexion guardadoEn={guardadoEn} />
      <Aviso123 />
    </>
  );
}
