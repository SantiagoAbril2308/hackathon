import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, Mensaje, TituloAdmin } from './comun.jsx';
import { fechaHora } from '../../services/formato.js';

const ESTADOS = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

export default function ActividadesAdmin() {
  const { pedirAdmin } = useSesionAdmin();
  const [filtro, setFiltro] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const { datos, error, recargar } = useCarga(() => pedirAdmin(`/actividades${filtro ? `?estado=${filtro}` : ''}`), [pedirAdmin, filtro]);

  async function decidir(actividad, accion) {
    try {
      await pedirAdmin(`/actividades/${actividad.id}/${accion}`, { metodo: 'POST' });
      setMensaje({ tipo: 'ok', texto: `"${actividad.titulo}" ${accion === 'aprobar' ? 'aprobada: ya es pública' : 'rechazada'}.` });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <>
      <TituloAdmin titulo="Actividades" descripcion="Solo las actividades aprobadas se muestran al público." />
      <Mensaje mensaje={mensaje} />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      <div className="pestanas" role="tablist" aria-label="Filtrar actividades">
        {[['', 'Todas'], ...Object.entries(ESTADOS)].map(([v, t]) => (
          <button key={v || 'todas'} type="button" role="tab" aria-selected={filtro === v} aria-controls="tabla-actividades" onClick={() => setFiltro(v)}>
            {t}
          </button>
        ))}
      </div>

      <div className="tabla-contenedor" id="tabla-actividades" role="tabpanel">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Actividad</th>
              <th scope="col">Organiza</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(datos?.actividades ?? []).map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.titulo}</strong>
                  <br />
                  <span className="texto-suave">{a.lugar}</span>
                </td>
                <td>{a.organizador}</td>
                <td>{fechaHora(a.fecha)}</td>
                <td>{ESTADOS[a.estado]}</td>
                <td>
                  <div className="acciones">
                    {a.estado !== 'aprobada' && (
                      <button type="button" className="boton boton--pequeno" onClick={() => decidir(a, 'aprobar')} aria-label={`Aprobar ${a.titulo}`}>
                        <Check size={16} aria-hidden="true" /> Aprobar
                      </button>
                    )}
                    {a.estado !== 'rechazada' && (
                      <button type="button" className="boton boton--secundario boton--pequeno" onClick={() => decidir(a, 'rechazar')} aria-label={`Rechazar ${a.titulo}`}>
                        <X size={16} aria-hidden="true" /> Rechazar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {datos && datos.actividades.length === 0 && <p className="vacio">No hay actividades en esta vista.</p>}
      </div>
    </>
  );
}
