import { useState } from 'react';
import { Phone } from 'lucide-react';
import Encabezado from '../components/Encabezado.jsx';
import TarjetaServicio from '../components/TarjetaServicio.jsx';
import EstadoConexion from '../components/EstadoConexion.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';

/**
 * /apoyo — vista ligera y prioritaria. El 123 se pinta de inmediato (no depende de datos);
 * luego las líneas de emergencia y de apoyo desde la copia local, y después desde la red.
 * Funciona sin conexión (service worker + IndexedDB).
 */
const PESTANAS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'nacionales', texto: 'Nacionales' },
  { valor: 'meta', texto: 'Meta' },
];
const NACIONAL = ['linea_nacional'];
const META = ['linea_departamental', 'linea_municipal'];
const ES_LINEA = (s) => s.tipo !== 'presencial';

export default function Apoyo() {
  const { datos, guardadoEn, cargando, error } = useDirectorio();
  const [pestana, setPestana] = useState('todas');

  const emergencia = datos?.emergencia ?? [];
  const idsEmergencia = new Set(emergencia.map((s) => s.id));
  const lineas = (datos?.servicios ?? []).filter((s) => ES_LINEA(s) && !idsEmergencia.has(s.id));
  const nacionales = lineas.filter((s) => NACIONAL.includes(s.tipo) || s.tipo === 'chat');
  const delMeta = lineas.filter((s) => META.includes(s.tipo));

  return (
    <>
      <Encabezado titulo="Líneas de apoyo" />

      <div className="chips" role="group" aria-label="Filtrar líneas">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            className="chip"
            aria-pressed={pestana === p.valor}
            onClick={() => setPestana(p.valor)}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <section className="tarjeta tarjeta--emergencia" aria-labelledby="titulo-123">
        <h2 id="titulo-123" style={{ fontFamily: 'var(--fuente-ui)', fontSize: '1rem', fontWeight: 700 }}>
          Emergencias
        </h2>
        <p className="linea-123" aria-label="Línea 123">
          123
        </p>
        <p className="pequeno" style={{ marginBottom: '0.75rem' }}>
          Atención inmediata en Colombia · Disponible 24 horas · Gratis
        </p>
        <a className="boton boton--emergencia boton--bloque" href="tel:123">
          <Phone size={18} aria-hidden="true" /> Llamar al 123
        </a>
      </section>

      {emergencia.length > 0 && (
        <section className="seccion" aria-labelledby="titulo-emergencia">
          <h2 id="titulo-emergencia">Líneas para hablar ahora</h2>
          {emergencia.map((s) => (
            <TarjetaServicio key={s.id} servicio={s} />
          ))}
        </section>
      )}

      {pestana !== 'meta' && nacionales.length > 0 && (
        <section className="seccion" aria-labelledby="titulo-nacionales">
          <h2 id="titulo-nacionales">Líneas nacionales</h2>
          {nacionales.map((s) => (
            <TarjetaServicio key={s.id} servicio={s} />
          ))}
        </section>
      )}

      {pestana !== 'nacionales' && delMeta.length > 0 && (
        <section className="seccion" aria-labelledby="titulo-meta">
          <h2 id="titulo-meta">Líneas del Meta</h2>
          {delMeta.map((s) => (
            <TarjetaServicio key={s.id} servicio={s} />
          ))}
        </section>
      )}

      {!datos && cargando && <p className="vacio">Cargando líneas de apoyo…</p>}
      {!datos && error && (
        <p className="mensaje-estado mensaje-estado--error" role="alert">
          No pudimos cargar las demás líneas ({error}). El 123 siempre está disponible.
        </p>
      )}

      <EstadoConexion guardadoEn={guardadoEn} />
    </>
  );
}
