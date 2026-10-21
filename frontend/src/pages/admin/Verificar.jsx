import { useState } from 'react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, EstadoServicio, Mensaje, TituloAdmin } from './comun.jsx';
import { fechaCorta } from '../../services/formato.js';

function FormularioVerificacion({ servicio, alTerminar }) {
  const { pedirAdmin } = useSesionAdmin();
  const [resultado, setResultado] = useState('confirmado');
  const [nota, setNota] = useState('');
  const [url, setUrl] = useState(servicio.url_fuente ?? '');
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    try {
      await pedirAdmin(`/servicios/${servicio.id}/verificar`, {
        metodo: 'POST',
        cuerpo: { resultado, nota: nota || null, ...(url && { url_fuente: url }) },
      });
      alTerminar(`"${servicio.nombre}" quedó ${resultado === 'retirado' ? 'retirado' : 'vigente con fecha de hoy'}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={enviar} className="formulario-admin" style={{ marginTop: '0.75rem' }}>
      <label className="campo">
        Resultado
        <select className="selector" value={resultado} onChange={(e) => setResultado(e.target.value)}>
          <option value="confirmado">Confirmado: la información sigue igual</option>
          <option value="corregido">Corregido: la actualicé</option>
          <option value="retirado">Retirado: ya no existe</option>
        </select>
      </label>
      <label className="campo">
        URL oficial donde lo verificaste
        <input className="entrada" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required={resultado !== 'retirado'} />
      </label>
      <label className="campo completo">
        Nota (opcional)
        <input className="entrada" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
      </label>
      {error && (
        <p className="mensaje-estado mensaje-estado--error completo" role="alert">
          {error}
        </p>
      )}
      <div className="completo">
        <button type="submit" className="boton boton--pequeno">
          Registrar verificación
        </button>
      </div>
    </form>
  );
}

/** Cola de verificación: lo vencido o en revisión primero, ordenado por prioridad (reportes). */
export default function Verificar() {
  const { pedirAdmin } = useSesionAdmin();
  const [mensaje, setMensaje] = useState(null);
  const { datos, error, recargar } = useCarga(() => pedirAdmin('/servicios'), [pedirAdmin]);

  const pendientes = (datos?.servicios ?? [])
    .filter((s) => s.estado !== 'retirado' && s.estado_publico !== 'vigente')
    .sort((a, b) => b.prioridad - a.prioridad);
  const vigentes = (datos?.servicios ?? []).filter((s) => s.estado_publico === 'vigente');

  return (
    <>
      <TituloAdmin titulo="Verificar" descripcion="Confirma cada servicio contra su fuente oficial. Lo vencido no se muestra como vigente." />
      <Mensaje mensaje={mensaje} />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      <h2>Por verificar ({pendientes.length})</h2>
      {pendientes.length === 0 && datos && <p className="texto-suave">Todo está al día.</p>}
      {pendientes.map((s) => (
        <article key={s.id} id={`servicio-${s.id}`} className="tarjeta" aria-labelledby={`verificar-${s.id}`}>
          <div className="tarjeta__cabecera">
            <h3 id={`verificar-${s.id}`} className="tarjeta__titulo">
              {s.nombre}
            </h3>
            <EstadoServicio servicio={s} />
          </div>
          <p className="pequeno texto-suave" style={{ margin: 0 }}>
            Última verificación: {s.fecha_verificacion ? fechaCorta(s.fecha_verificacion) : 'nunca'} · Prioridad {s.prioridad}
            {s.url_fuente && (
              <>
                {' · '}
                <a href={s.url_fuente} target="_blank" rel="noopener noreferrer">
                  Abrir fuente
                </a>
              </>
            )}
          </p>
          <FormularioVerificacion
            servicio={s}
            alTerminar={(texto) => {
              setMensaje({ tipo: 'ok', texto });
              recargar();
            }}
          />
        </article>
      ))}

      <h2 style={{ marginTop: '2rem' }}>Vigentes ({vigentes.length})</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Servicio</th>
              <th scope="col">Verificado</th>
              <th scope="col">Por</th>
            </tr>
          </thead>
          <tbody>
            {vigentes.map((s) => (
              <tr key={s.id} id={`servicio-${s.id}`}>
                <td>{s.nombre}</td>
                <td>{fechaCorta(s.fecha_verificacion)}</td>
                <td>{s.verificado_por}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
