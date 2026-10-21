import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

const MOTIVOS = [
  { valor: 'no_contesta', texto: 'No contestan' },
  { valor: 'numero_errado', texto: 'El número está equivocado' },
  { valor: 'enlace_caido', texto: 'El enlace no funciona' },
  { valor: 'otro', texto: 'Otro problema' },
];

/**
 * "Este número no funciona": envía un reporte anónimo (sin datos de la persona).
 * El backend sube la prioridad del servicio para que el equipo lo revise.
 */
export default function DialogoReporte({ servicio, abierto, alCerrar }) {
  const ref = useRef(null);
  const [motivo, setMotivo] = useState('no_contesta');
  const canalesReportables = servicio.canales.filter((c) => c.tipo !== 'email');
  const [canalId, setCanalId] = useState(canalesReportables[0]?.id ?? '');
  const [estado, setEstado] = useState({ tipo: 'inicial' });

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) {
      setEstado({ tipo: 'inicial' });
      if (typeof dialogo.showModal === 'function') dialogo.showModal();
      else dialogo.setAttribute('open', '');
    }
    if (!abierto && dialogo.open) {
      if (typeof dialogo.close === 'function') dialogo.close();
      else dialogo.removeAttribute('open');
    }
  }, [abierto]);

  async function enviar(evento) {
    evento.preventDefault();
    setEstado({ tipo: 'enviando' });
    try {
      await api.reportar({ servicio_id: servicio.id, canal_id: canalId ? Number(canalId) : null, motivo });
      setEstado({ tipo: 'ok' });
    } catch (err) {
      setEstado({ tipo: 'error', mensaje: err.message });
    }
  }

  const tituloId = `reporte-titulo-${servicio.id}`;
  return (
    <dialog ref={ref} className="dialogo" aria-labelledby={tituloId} onClose={alCerrar} onCancel={alCerrar}>
      <h2 id={tituloId}>Avísanos qué pasó</h2>
      {estado.tipo === 'ok' ? (
        <>
          <p className="mensaje-estado" role="status">
            Gracias por avisarnos. Revisaremos este servicio lo antes posible.
          </p>
          <p className="pequeno texto-suave">Si necesitas apoyo ahora, llama al 123.</p>
          <button type="button" className="boton boton--bloque" onClick={alCerrar}>
            Cerrar
          </button>
        </>
      ) : (
        <form onSubmit={enviar}>
          <p className="pequeno texto-suave">
            {servicio.nombre}. Tu aviso es anónimo: no guardamos datos tuyos.
          </p>
          <fieldset className="opciones" style={{ border: 0, padding: 0 }}>
            <legend className="solo-lectores">Motivo</legend>
            {MOTIVOS.map((m) => (
              <label key={m.valor} className="opcion">
                <input type="radio" name="motivo" value={m.valor} checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
                {m.texto}
              </label>
            ))}
          </fieldset>
          {canalesReportables.length > 1 && (
            <label className="campo">
              ¿Cuál canal?
              <select className="selector" value={canalId} onChange={(e) => setCanalId(e.target.value)}>
                {canalesReportables.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.etiqueta || c.tipo}: {c.valor}
                  </option>
                ))}
              </select>
            </label>
          )}
          {estado.tipo === 'error' && (
            <p className="mensaje-estado mensaje-estado--error" role="alert">
              {estado.mensaje}
            </p>
          )}
          <div className="tarjeta__acciones" style={{ marginTop: '1rem' }}>
            <button type="button" className="boton boton--secundario" onClick={alCerrar}>
              Cancelar
            </button>
            <button type="submit" className="boton" disabled={estado.tipo === 'enviando'}>
              {estado.tipo === 'enviando' ? 'Enviando…' : 'Enviar aviso'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
