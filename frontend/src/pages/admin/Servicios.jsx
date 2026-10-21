import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Ban } from 'lucide-react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, EstadoServicio, Mensaje, TituloAdmin } from './comun.jsx';
import FormularioServicio from './FormularioServicio.jsx';
import { ETIQUETAS, fechaCorta } from '../../services/formato.js';

export default function Servicios() {
  const { pedirAdmin } = useSesionAdmin();
  const [params, setParams] = useSearchParams();
  const [estado, setEstado] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const editando = params.get('editar');
  const nuevo = params.get('nuevo') === '1';

  const { datos, error, recargar } = useCarga(async () => {
    const [s, f] = await Promise.all([pedirAdmin('/servicios'), pedirAdmin('/fuentes')]);
    return { servicios: s.servicios, fuentes: f.fuentes };
  }, [pedirAdmin]);

  const servicios = (datos?.servicios ?? []).filter((s) => !estado || s.estado === estado);
  const seleccionado = datos?.servicios.find((s) => String(s.id) === editando);
  const cerrarFormulario = () => setParams({}, { replace: true });

  async function retirar(s) {
    if (!window.confirm(`¿Retirar "${s.nombre}" del directorio? Dejará de mostrarse al público.`)) return;
    try {
      await pedirAdmin(`/servicios/${s.id}`, { metodo: 'DELETE' });
      setMensaje({ tipo: 'ok', texto: 'Servicio retirado.' });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <>
      <TituloAdmin titulo="Servicios" descripcion="Todos los servicios, incluidos los vencidos, en revisión y retirados.">
        <button type="button" className="boton boton--pequeno" onClick={() => setParams({ nuevo: '1' })}>
          <Plus size={16} aria-hidden="true" /> Nuevo servicio
        </button>
      </TituloAdmin>

      <Mensaje mensaje={mensaje} />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      {datos && (nuevo || seleccionado) && (
        <FormularioServicio
          key={seleccionado?.id ?? 'nuevo'}
          servicio={seleccionado}
          fuentes={datos.fuentes}
          alCancelar={cerrarFormulario}
          alGuardar={(r, texto) => {
            setMensaje({ tipo: 'ok', texto });
            if (r?.id) setParams({ editar: String(r.id) }, { replace: true });
            recargar();
          }}
        />
      )}

      <label className="campo" style={{ maxWidth: 260 }}>
        Filtrar por estado
        <select className="selector" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="vigente">Vigente</option>
          <option value="en_revision">En revisión</option>
          <option value="retirado">Retirado</option>
        </select>
      </label>

      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="solo-lectores">Servicios del directorio</caption>
          <thead>
            <tr>
              <th scope="col">Servicio</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
              <th scope="col">Verificado</th>
              <th scope="col">Prioridad</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.nombre}
                  {s.es_emergencia && <span className="insignia insignia--revision" style={{ marginLeft: 6 }}>Emergencia</span>}
                </td>
                <td>{ETIQUETAS.tipo[s.tipo]}</td>
                <td>
                  <EstadoServicio servicio={s} />
                </td>
                <td>{s.fecha_verificacion ? fechaCorta(s.fecha_verificacion) : '—'}</td>
                <td>{s.prioridad}</td>
                <td>
                  <div className="acciones">
                    <button type="button" className="boton boton--secundario boton--pequeno" onClick={() => setParams({ editar: String(s.id) })} aria-label={`Editar ${s.nombre}`}>
                      <Pencil size={15} aria-hidden="true" /> Editar
                    </button>
                    <Link to={`/admin/verificar#servicio-${s.id}`} className="boton boton--secundario boton--pequeno" aria-label={`Verificar ${s.nombre}`}>
                      Verificar
                    </Link>
                    {s.estado !== 'retirado' && (
                      <button type="button" className="boton boton--secundario boton--pequeno" onClick={() => retirar(s)} aria-label={`Retirar ${s.nombre}`}>
                        <Ban size={15} aria-hidden="true" /> Retirar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
