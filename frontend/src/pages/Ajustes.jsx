import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Bell, Accessibility, RefreshCw, Database, ShieldCheck, FileText, Info, ChevronRight } from 'lucide-react';
import Encabezado from '../components/Encabezado.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';
import { leerPreferencias } from '../services/almacen.js';
import { activar, desactivar, esCompatible } from '../services/accesoRapido.js';
import { MODOS, leerApariencia, guardarApariencia } from '../services/apariencia.js';
import { fechaHora } from '../services/formato.js';

const MENSAJES = {
  denegado:
    'No se pudo activar porque el permiso de notificaciones está bloqueado. Puedes permitirlo en la configuración del navegador.',
  no_compatible: 'Este navegador no permite notificaciones de acceso rápido.',
};

export default function Ajustes() {
  const { guardadoEn, recargar, datos } = useDirectorio();
  const [modo, setModo] = useState(leerApariencia);
  const [accesoRapido, setAccesoRapido] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    leerPreferencias().then((p) => setAccesoRapido(p.accesoRapido));
  }, []);

  async function alternarAccesoRapido() {
    setOcupado(true);
    setAviso(null);
    try {
      if (accesoRapido) {
        await desactivar();
        setAccesoRapido(false);
        setAviso({ tipo: 'ok', texto: 'Acceso rápido desactivado.' });
      } else {
        // PWA-05: el permiso de notificaciones se pide únicamente en este momento.
        const r = await activar();
        setAccesoRapido(r.ok);
        setAviso(
          r.ok
            ? { tipo: 'ok', texto: 'Listo: verás una notificación silenciosa para llegar rápido a las líneas de apoyo.' }
            : { tipo: 'error', texto: MENSAJES[r.motivo] },
        );
      }
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo cambiar el acceso rápido. Intenta de nuevo.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="lectura">
      <Encabezado titulo="Ajustes" />

      <section className="seccion" aria-labelledby="preferencias" style={{ marginTop: 0 }}>
        <h2 id="preferencias">Preferencias</h2>
        <ul className="lista-ajustes">
          <li>
            <Sun size={20} aria-hidden="true" />
            <label htmlFor="apariencia" style={{ flex: 1, fontWeight: 600 }}>
              Modo de apariencia
            </label>
            <select
              id="apariencia"
              className="selector"
              style={{ width: 'auto' }}
              value={modo}
              onChange={(e) => {
                setModo(e.target.value);
                guardarApariencia(e.target.value);
              }}
            >
              {MODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </li>
          <li>
            <Bell size={20} aria-hidden="true" />
            <span id="acceso-rapido-etiqueta" style={{ fontWeight: 600 }}>
              Acceso rápido
              <span className="descripcion" id="acceso-rapido-descripcion">
                Muestra una notificación silenciosa que abre las líneas de apoyo con un toque, también desde la pantalla de
                bloqueo.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              className="interruptor"
              aria-checked={accesoRapido}
              aria-labelledby="acceso-rapido-etiqueta"
              aria-describedby="acceso-rapido-descripcion"
              disabled={ocupado || !esCompatible()}
              onClick={alternarAccesoRapido}
            />
          </li>
          <li>
            <Link to="/acerca#accesibilidad">
              <Accessibility size={20} aria-hidden="true" />
              <span style={{ fontWeight: 600 }}>Accesibilidad</span>
              <ChevronRight size={18} aria-hidden="true" style={{ marginLeft: 'auto' }} />
            </Link>
          </li>
        </ul>
        {!esCompatible() && <p className="pequeno texto-suave">{MENSAJES.no_compatible}</p>}
        {aviso && (
          <p
            className={`mensaje-estado ${aviso.tipo === 'error' ? 'mensaje-estado--error' : ''}`}
            role={aviso.tipo === 'error' ? 'alert' : 'status'}
            style={{ marginTop: '0.75rem' }}
          >
            {aviso.texto}
          </p>
        )}
      </section>

      <section className="seccion" aria-labelledby="informacion">
        <h2 id="informacion">Información</h2>
        <ul className="lista-ajustes">
          <li>
            <RefreshCw size={20} aria-hidden="true" />
            <span style={{ fontWeight: 600, flex: 1 }}>
              Última sincronización
              <span className="descripcion">{guardadoEn ? fechaHora(guardadoEn) : 'Todavía no hay copia guardada'}</span>
            </span>
            <button type="button" className="boton boton--secundario boton--pequeno" onClick={recargar}>
              Actualizar
            </button>
          </li>
          <li>
            <Database size={20} aria-hidden="true" />
            <span style={{ fontWeight: 600 }}>
              Datos disponibles sin conexión
              <span className="descripcion">{datos ? `Sí · ${datos.servicios.length} servicios guardados` : 'No'}</span>
            </span>
          </li>
          {[
            { a: '/acerca#fuentes', texto: 'Acerca de las fuentes', Icono: ShieldCheck },
            { a: '/acerca#privacidad', texto: 'Política de privacidad', Icono: FileText },
            { a: '/acerca', texto: 'Acerca de Ruta Serena', Icono: Info },
          ].map(({ a, texto, Icono }) => (
            <li key={a}>
              <Link to={a}>
                <Icono size={20} aria-hidden="true" />
                <span style={{ fontWeight: 600 }}>{texto}</span>
                <ChevronRight size={18} aria-hidden="true" style={{ marginLeft: 'auto' }} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
