import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Map, Search } from 'lucide-react';
import Encabezado from '../components/Encabezado.jsx';
import TarjetaServicio from '../components/TarjetaServicio.jsx';
import EstadoConexion from '../components/EstadoConexion.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';
import { ETIQUETAS, normalizar } from '../services/formato.js';

const TEMAS = ['ansiedad', 'depresion', 'duelo', 'consumo_sustancias', 'violencias', 'general'];

/** Filtra la copia del directorio (funciona también sin conexión). */
export function filtrarServicios(servicios, { tema, publico, modalidad, q }) {
  const consulta = normalizar(q).trim();
  return servicios.filter(
    (s) =>
      (!tema || s.temas.includes(tema)) &&
      (!publico || s.publico.includes(publico)) &&
      (!modalidad || s.modalidad.includes(modalidad)) &&
      (!consulta || normalizar([s.nombre, s.descripcion, s.cobertura, s.direccion].join(' ')).includes(consulta)),
  );
}

export default function Directorio() {
  const { datos, guardadoEn, cargando, error } = useDirectorio();
  const [params, setParams] = useSearchParams();
  const filtros = {
    tema: params.get('tema') ?? '',
    publico: params.get('publico') ?? '',
    modalidad: params.get('modalidad') ?? '',
    q: params.get('q') ?? '',
  };

  const cambiar = (clave, valor) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    setParams(nuevos, { replace: true });
  };

  const lista = useMemo(
    () => filtrarServicios(datos?.servicios ?? [], filtros),
    [datos, filtros.tema, filtros.publico, filtros.modalidad, filtros.q],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Encabezado
        titulo="Directorio"
        accion={
          <Link to="/mapa" className="boton-icono" aria-label="Ver servicios en el mapa">
            <Map size={22} aria-hidden="true" />
          </Link>
        }
      />

      <div className="barra-filtros">
        <div role="search" className="buscador">
          <label htmlFor="busqueda" className="solo-lectores">
            Buscar servicio, tema o lugar
          </label>
          <Search size={18} aria-hidden="true" />
          <input
            id="busqueda"
            className="entrada"
            type="search"
            placeholder="Buscar servicio, tema o lugar…"
            value={filtros.q}
            maxLength={100}
            onChange={(e) => cambiar('q', e.target.value)}
          />
        </div>

        <div className="chips" role="group" aria-label="Tema">
          <button type="button" className="chip" aria-pressed={!filtros.tema} onClick={() => cambiar('tema', '')}>
            Todos
          </button>
          {TEMAS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={filtros.tema === t}
              onClick={() => cambiar('tema', filtros.tema === t ? '' : t)}
            >
              {ETIQUETAS.temas[t]}
            </button>
          ))}
        </div>

        <div className="filtros">
          <label>
            <span className="solo-lectores">Para quién</span>
            <select className="selector" value={filtros.publico} onChange={(e) => cambiar('publico', e.target.value)}>
              <option value="">Para todos</option>
              {Object.entries(ETIQUETAS.publico).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="solo-lectores">Cómo</span>
            <select className="selector" value={filtros.modalidad} onChange={(e) => cambiar('modalidad', e.target.value)}>
              <option value="">Cualquier forma</option>
              {Object.entries(ETIQUETAS.modalidad).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="pequeno texto-suave" role="status" aria-live="polite">
        {datos ? `${lista.length} ${lista.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}` : ''}
      </p>

      <div className="lista-servicios">
        {lista.map((s) => (
          <TarjetaServicio key={s.id} servicio={s} nivel={2} />
        ))}
      </div>

      {datos && lista.length === 0 && (
        <div className="vacio">
          <p>No encontramos servicios con esos filtros.</p>
          <Link to="/apoyo">Ver líneas de apoyo generales</Link>
        </div>
      )}
      {!datos && cargando && <p className="vacio">Cargando servicios…</p>}
      {!datos && error && (
        <p className="mensaje-estado mensaje-estado--error" role="alert">
          No pudimos cargar el directorio: {error}
        </p>
      )}

      <EstadoConexion guardadoEn={guardadoEn} />
    </>
  );
}
