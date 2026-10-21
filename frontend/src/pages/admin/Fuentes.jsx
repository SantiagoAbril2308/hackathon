import { useState } from 'react';
import { Play } from 'lucide-react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { useCarga, Mensaje, TituloAdmin } from './comun.jsx';
import { fechaHora } from '../../services/formato.js';

const ESTADOS = {
  linea_base: 'Primera lectura',
  sin_cambios: 'Sin cambios',
  con_cambios: 'Con cambios',
  omitida: 'Omitida',
  error: 'Error',
};

export default function Fuentes() {
  const { pedirAdmin } = useSesionAdmin();
  const [ejecucion, setEjecucion] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const { datos, error, recargar } = useCarga(() => pedirAdmin('/fuentes'), [pedirAdmin]);

  async function ejecutar() {
    setLeyendo(true);
    setMensaje(null);
    try {
      const r = await pedirAdmin('/scraper/ejecutar', { metodo: 'POST', tiempoMs: 120000 });
      setEjecucion(r);
      setMensaje({ tipo: 'ok', texto: `Lectura terminada: ${r.total_cambios} cambios pendientes nuevos. Ningún servicio se publicó sin revisión.` });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <>
      <TituloAdmin titulo="Fuentes oficiales" descripcion="El lector solo visita dominios de la lista blanca, respeta robots.txt y nunca publica cambios por sí solo.">
        <button type="button" className="boton boton--pequeno" onClick={ejecutar} disabled={leyendo}>
          <Play size={16} aria-hidden="true" /> {leyendo ? 'Leyendo fuentes…' : 'Leer fuentes ahora'}
        </button>
      </TituloAdmin>
      <Mensaje mensaje={mensaje} />
      {error && <Mensaje mensaje={{ tipo: 'error', texto: error }} />}

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Fuente</th>
              <th scope="col">Dominio</th>
              <th scope="col">Selector</th>
              <th scope="col">Servicios</th>
              <th scope="col">Última lectura</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {(datos?.fuentes ?? []).map((f) => {
              const resultado = ejecucion?.fuentes.find((r) => r.id === f.id);
              return (
                <tr key={f.id}>
                  <td>
                    <strong>{f.nombre}</strong>
                    <br />
                    <span className="texto-suave">{f.entidad}</span>
                    {!f.activa && <span className="insignia insignia--sintetico" style={{ marginLeft: 6 }}>Inactiva</span>}
                  </td>
                  <td>{f.dominio}</td>
                  <td>
                    <code>{f.selector_css || 'body'}</code>
                  </td>
                  <td>{f.servicios}</td>
                  <td>{f.ultima_lectura ? fechaHora(f.ultima_lectura) : 'Nunca'}</td>
                  <td>{resultado ? `${ESTADOS[resultado.estado]}${resultado.motivo ? `: ${resultado.motivo}` : ''}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
