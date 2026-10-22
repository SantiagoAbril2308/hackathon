import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Phone, BookOpen, MessageCircle, Map, CalendarDays, ChevronRight, Search, Info, Sun } from 'lucide-react';
import Logo from '../components/Logo.jsx';
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
    <div className="inicio">
      {/* Marca y "Acerca de" solo en móvil: en pantallas grandes están en la cabecera del sitio. */}
      <header className="encabezado encabezado--izquierda inicio__marca">
        <Logo tamano={42} lema={false} horizontal />
        <Link to="/acerca" className="boton-icono" aria-label="Acerca de Ruta Serena">
          <Info size={22} aria-hidden="true" />
        </Link>
      </header>

      <section className="inicio__hero" aria-labelledby="titulo-inicio">
        <div className="inicio__texto">
          <p className="saludo">
            <Sun size={16} aria-hidden="true" /> {saludo()}
          </p>
          <h1 id="titulo-inicio">
            Aquí para tu <span>bienestar</span>
          </h1>
          <p className="texto-suave inicio__lema">Líneas y servicios de apoyo oficiales, claros y confiables.</p>
        </div>

        <div className="inicio__paisaje" aria-hidden="true">
          <Ilustracion className="inicio__ilustracion" variante="horizonte" />
        </div>

        <div className="inicio__acciones">
          <Link to="/apoyo" className="cta-apoyo">
            <span className="cta-apoyo__icono">
              <Phone size={22} aria-hidden="true" />
            </span>
            <span className="cta-apoyo__texto">
              Necesito apoyo ahora
              <span className="cta-apoyo__detalle">Líneas para hablar con alguien</span>
            </span>
            <span className="cta-apoyo__flecha">
              <ChevronRight size={22} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      <form role="search" onSubmit={buscar} className="inicio__busqueda">
        <label htmlFor="busqueda-inicio" className="solo-lectores">
          Buscar servicio, tema o lugar
        </label>
        <div className="buscador">
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
          <button type="submit" className="boton-icono inicio__buscar-boton" aria-label="Buscar">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </form>

      <nav aria-label="Secciones" className="inicio__accesos">
        <div className="inicio__secciones-titulo">
          <h2>Encuentra lo que necesitas</h2>
          <p>Explora a tu ritmo</p>
        </div>
        <ul className="cuadricula">
          {ACCESOS.map(({ a, titulo, texto, Icono }) => (
            <li key={a}>
              <Link to={a} className="acceso">
                <span className="acceso__cabecera">
                  <span className="acceso__icono">
                    <Icono size={22} aria-hidden="true" />
                  </span>
                  <ChevronRight size={19} aria-hidden="true" className="acceso__flecha" />
                </span>
                <strong>{titulo}</strong>
                <span className="acceso__descripcion">{texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="inicio__pie">
        <EstadoConexion guardadoEn={guardadoEn} />
        <Aviso123 />
      </div>
    </div>
  );
}
