import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Hourglass, Ban } from 'lucide-react';

/** Carga datos con la función dada y permite recargar. */
export function useCarga(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const recargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true }));
    try {
      setEstado({ datos: await cargar(), error: null, cargando: false });
    } catch (err) {
      setEstado({ datos: null, error: err.message, cargando: false });
    }
  }, dependencias); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    recargar();
  }, [recargar]);
  return { ...estado, recargar };
}

export function EstadoServicio({ servicio }) {
  if (servicio.estado === 'retirado') {
    return (
      <span className="insignia insignia--sintetico">
        <Ban size={13} aria-hidden="true" /> Retirado
      </span>
    );
  }
  if (servicio.estado_publico === 'vigente') {
    return (
      <span className="insignia insignia--verificado">
        <CircleCheck size={13} aria-hidden="true" /> Vigente
      </span>
    );
  }
  return (
    <span className="insignia insignia--revision">
      <Hourglass size={13} aria-hidden="true" /> {servicio.vencido ? 'Vencido' : 'En revisión'}
    </span>
  );
}

export function Mensaje({ mensaje }) {
  if (!mensaje) return null;
  return (
    <p className={`mensaje-estado ${mensaje.tipo === 'error' ? 'mensaje-estado--error' : ''}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{ marginBottom: '1rem' }}>
      {mensaje.texto}
    </p>
  );
}

export function TituloAdmin({ titulo, descripcion, children }) {
  return (
    <header className="admin__titulo">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p className="texto-suave">{descripcion}</p>}
      </div>
      {children}
    </header>
  );
}
