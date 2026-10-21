import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, Mensaje, TituloAdmin } from './comun.jsx';
import { fechaHora } from '../../services/formato.js';

const MOTIVOS = { no_contesta: 'No contestan', numero_errado: 'Número equivocado', enlace_caido: 'Enlace caído', otro: 'Otro' };

export default function Reportes() {
  const { pedirAdmin } = useSesionAdmin();
  const { datos, error } = useCarga(() => pedirAdmin('/reportes'), [pedirAdmin]);

  return (
    <>
      <TituloAdmin
        titulo="Reportes ciudadanos"
        descripcion="Avisos anónimos de “este número no funciona”. Con 3 desde la última verificación, el servicio pasa a revisión."
      />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      <h2>Por servicio</h2>
      <div className="tabla-contenedor" style={{ marginBottom: '2rem' }}>
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Servicio</th>
              <th scope="col">Estado</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Total</th>
              <th scope="col">No contestan</th>
              <th scope="col">Número equivocado</th>
              <th scope="col">Enlace caído</th>
              <th scope="col">Otro</th>
              <th scope="col">Último</th>
            </tr>
          </thead>
          <tbody>
            {(datos?.resumen ?? []).map((r) => (
              <tr key={r.servicio_id}>
                <td>{r.nombre}</td>
                <td>{r.estado === 'vigente' ? 'Vigente' : r.estado === 'en_revision' ? 'En revisión' : 'Retirado'}</td>
                <td>{r.prioridad}</td>
                <td>{r.total}</td>
                <td>{r.no_contesta}</td>
                <td>{r.numero_errado}</td>
                <td>{r.enlace_caido}</td>
                <td>{r.otro}</td>
                <td>{fechaHora(r.ultimo_reporte)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {datos && datos.resumen.length === 0 && <p className="vacio">No hay reportes.</p>}
      </div>

      <h2>Recientes</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Servicio</th>
              <th scope="col">Canal</th>
              <th scope="col">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(datos?.recientes ?? []).map((r) => (
              <tr key={r.id}>
                <td>{fechaHora(r.created_at)}</td>
                <td>{r.servicio_nombre}</td>
                <td>{r.canal_valor ? `${r.canal_tipo}: ${r.canal_valor}` : '—'}</td>
                <td>{MOTIVOS[r.motivo]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
