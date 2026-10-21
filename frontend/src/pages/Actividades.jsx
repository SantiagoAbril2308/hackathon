import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import Encabezado from '../components/Encabezado.jsx';
import { api } from '../services/api.js';
import { fechaHora } from '../services/formato.js';

export default function Actividades() {
  const [estado, setEstado] = useState({ cargando: true, lista: [], error: null });

  useEffect(() => {
    let vigente = true;
    api
      .actividades()
      .then((r) => vigente && setEstado({ cargando: false, lista: r.actividades, error: null }))
      .catch((err) => vigente && setEstado({ cargando: false, lista: [], error: err.message }));
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <>
      <Encabezado titulo="Actividades" />
      <p className="texto-suave">Encuentros comunitarios revisados por el equipo de Ruta Serena.</p>

      {estado.cargando && <p className="vacio">Cargando actividades…</p>}
      {estado.error && (
        <p className="mensaje-estado mensaje-estado--error" role="alert">
          No pudimos cargar las actividades: {estado.error}
        </p>
      )}
      {!estado.cargando && !estado.error && estado.lista.length === 0 && <p className="vacio">No hay actividades próximas.</p>}

      <div className="lista-servicios">
        {estado.lista.map((a) => (
          <article key={a.id} className="tarjeta" aria-labelledby={`actividad-${a.id}`}>
            <h2 id={`actividad-${a.id}`} className="tarjeta__titulo">
              {a.titulo}
            </h2>
            <ul className="tarjeta__datos" style={{ marginTop: '0.5rem' }}>
              <li>
                <CalendarDays size={15} aria-hidden="true" />
                <time dateTime={a.fecha}>{fechaHora(a.fecha)}</time>
              </li>
              {a.lugar && (
                <li>
                  <MapPin size={15} aria-hidden="true" />
                  {a.lugar}
                </li>
              )}
              <li>
                <Users size={15} aria-hidden="true" />
                {a.organizador}
              </li>
            </ul>
            {a.descripcion && <p className="pequeno">{a.descripcion}</p>}
            {a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="pequeno">
                Más información <span className="solo-lectores">(se abre en otra pestaña)</span>
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
