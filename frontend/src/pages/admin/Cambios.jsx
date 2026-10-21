import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Plus } from 'lucide-react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, Mensaje, TituloAdmin } from './comun.jsx';
import { dominio } from '../../services/formato.js';

const PESTANAS = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'alta', texto: 'Alta prioridad' },
  { valor: 'todos', texto: 'Historial' },
];

const valorCorto = (v) => (v == null ? '—' : v.length > 120 ? `${v.slice(0, 120)}…` : v);

export default function Cambios() {
  const { pedirAdmin } = useSesionAdmin();
  const [pestana, setPestana] = useState('pendiente');
  const [mensaje, setMensaje] = useState(null);

  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [pendientes, todos, reportes, servicios] = await Promise.all([
      pedirAdmin('/cambios?estado=pendiente'),
      pedirAdmin('/cambios?estado=todos'),
      pedirAdmin('/reportes'),
      pedirAdmin('/servicios'),
    ]);
    return { pendientes: pendientes.cambios, todos: todos.cambios, reportes, servicios: servicios.servicios };
  }, [pedirAdmin]);

  async function decidir(cambio, accion) {
    setMensaje(null);
    try {
      const r = await pedirAdmin(`/cambios/${cambio.id}/${accion}`, { metodo: 'POST' });
      setMensaje({ tipo: 'ok', texto: r.mensaje ?? (accion === 'aprobar' ? 'Cambio aprobado.' : 'Cambio rechazado.') });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  const reportesPorServicio = new Map((datos?.reportes.resumen ?? []).map((r) => [r.servicio_id, r.total]));
  const totalReportes = (datos?.reportes.resumen ?? []).reduce((s, r) => s + r.total, 0);
  const porVencer = (datos?.servicios ?? []).filter((s) => s.estado !== 'retirado' && s.estado_publico !== 'vigente').length;
  const lista =
    pestana === 'todos' ? datos?.todos ?? [] : (datos?.pendientes ?? []).filter((c) => pestana !== 'alta' || c.prioridad >= 2);

  return (
    <>
      <TituloAdmin titulo="Cambios pendientes" descripcion="Revisa y aprueba los cambios antes de publicarlos.">
        <Link to="/admin/servicios?nuevo=1" className="boton boton--pequeno">
          <Plus size={16} aria-hidden="true" /> Nuevo servicio
        </Link>
      </TituloAdmin>

      <div className="estadisticas">
        <div className="estadistica">
          <strong>{datos?.pendientes.length ?? '…'}</strong>
          <span>Cambios pendientes</span>
        </div>
        <Link to="/admin/reportes" className="estadistica" style={{ color: 'inherit', textDecoration: 'none' }}>
          <strong>{datos ? totalReportes : '…'}</strong>
          <span>Reportes ciudadanos</span>
        </Link>
        <Link to="/admin/verificar" className="estadistica" style={{ color: 'inherit', textDecoration: 'none' }}>
          <strong>{datos ? porVencer : '…'}</strong>
          <span>Registros por verificar (vencidos o en revisión)</span>
        </Link>
      </div>

      <Mensaje mensaje={mensaje} />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      <div className="pestanas" role="tablist" aria-label="Filtrar cambios">
        {PESTANAS.map((p) => (
          <button key={p.valor} type="button" role="tab" aria-selected={pestana === p.valor} aria-controls="tabla-cambios" onClick={() => setPestana(p.valor)}>
            {p.texto}
          </button>
        ))}
      </div>

      <div className="tabla-contenedor" id="tabla-cambios" role="tabpanel">
        <table className="tabla">
          <caption className="solo-lectores">Cambios detectados en las fuentes oficiales</caption>
          <thead>
            <tr>
              <th scope="col">Servicio</th>
              <th scope="col">Campo</th>
              <th scope="col">Dato anterior</th>
              <th scope="col">Dato nuevo</th>
              <th scope="col">Reportes</th>
              <th scope="col">Fuente</th>
              <th scope="col">{pestana === 'todos' ? 'Estado' : 'Acciones'}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{c.servicio_nombre ?? <span className="texto-suave">Sin servicio asociado</span>}</td>
                <td>{c.campo}</td>
                <td>
                  <code>{valorCorto(c.valor_anterior)}</code>
                </td>
                <td>
                  <code>{valorCorto(c.valor_nuevo)}</code>
                </td>
                <td>{c.servicio_id ? reportesPorServicio.get(c.servicio_id) ?? 0 : '—'}</td>
                <td>{dominio(c.fuente_url)}</td>
                <td>
                  {c.estado === 'pendiente' ? (
                    <div className="acciones">
                      <button type="button" className="boton boton--pequeno" onClick={() => decidir(c, 'aprobar')} aria-label={`Aprobar cambio de ${c.campo} en ${c.servicio_nombre ?? 'la fuente'}`}>
                        <Check size={16} aria-hidden="true" /> Aprobar
                      </button>
                      <button
                        type="button"
                        className="boton boton--secundario boton--pequeno"
                        onClick={() => decidir(c, 'rechazar')}
                        aria-label={`Rechazar cambio de ${c.campo} en ${c.servicio_nombre ?? 'la fuente'}`}
                      >
                        <X size={16} aria-hidden="true" /> Rechazar
                      </button>
                    </div>
                  ) : (
                    c.estado
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && lista.length === 0 && <p className="vacio">No hay cambios en esta vista.</p>}
        {cargando && !datos && <p className="vacio">Cargando…</p>}
      </div>
    </>
  );
}
