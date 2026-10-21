import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, Wallet, Users, Globe, ShieldCheck, Flag, Map, Mail } from 'lucide-react';
import Ilustracion from '../components/Ilustracion.jsx';
import Insignia from '../components/Insignia.jsx';
import DialogoReporte from '../components/DialogoReporte.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';
import { api } from '../services/api.js';
import { ETIQUETAS, dominio, enlaceTelefono, enlaceWhatsApp, fechaCorta } from '../services/formato.js';

export default function DetalleServicio() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { datos } = useDirectorio();
  const [remoto, setRemoto] = useState({ servicio: null, error: null });
  const [reportando, setReportando] = useState(false);

  const local = [...(datos?.servicios ?? []), ...(datos?.emergencia ?? [])].find((s) => String(s.id) === id);

  // Si no está en la copia (por ejemplo, está en revisión), se pide a la API.
  useEffect(() => {
    if (local || !datos) return;
    let vigente = true;
    api
      .servicio(id)
      .then((servicio) => vigente && setRemoto({ servicio, error: null }))
      .catch((err) => vigente && setRemoto({ servicio: null, error: err.message }));
    return () => {
      vigente = false;
    };
  }, [id, local, datos]);

  const servicio = local ?? remoto.servicio;
  const volver = (
    <button type="button" className="boton-icono" aria-label="Volver" onClick={() => navegar(-1)}>
      <ArrowLeft size={22} aria-hidden="true" />
    </button>
  );

  if (!servicio) {
    return (
      <>
        <header className="encabezado">{volver}</header>
        {remoto.error ? (
          <div className="vacio" role="alert">
            <p>{remoto.error}</p>
            <Link to="/apoyo">Ver líneas de apoyo</Link>
          </div>
        ) : (
          <p className="vacio">Cargando…</p>
        )}
      </>
    );
  }

  const telefono = servicio.canales.find((c) => c.tipo === 'telefono');
  const whatsapp = servicio.canales.find((c) => c.tipo === 'whatsapp');
  const web = servicio.canales.find((c) => c.tipo === 'web');
  const correo = servicio.canales.find((c) => c.tipo === 'email');

  return (
    <article>
      <div className="detalle__portada">
        <Ilustracion />
        {volver}
      </div>
      <div className="detalle__cuerpo">
        <div className="detalle__columnas">
          <div className="detalle__principal">
            <Insignia estado={servicio.estado} />
            <h1 style={{ marginTop: '0.75rem' }}>{servicio.nombre}</h1>
            {servicio.descripcion && <p className="texto-suave">{servicio.descripcion}</p>}
            {servicio.estado !== 'vigente' && servicio.mensaje_estado && <p className="banner">{servicio.mensaje_estado}</p>}

            {telefono && (
              <p
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  margin: '1rem 0 0.75rem',
                }}
              >
                <Phone size={22} aria-hidden="true" /> {telefono.valor}
              </p>
            )}
            <div className="tarjeta__acciones">
              {telefono && (
                <a className="boton" href={enlaceTelefono(telefono.valor)}>
                  <Phone size={18} aria-hidden="true" /> Llamar
                </a>
              )}
              {whatsapp && (
                <a
                  className="boton boton--secundario"
                  href={enlaceWhatsApp(whatsapp.valor)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={18} aria-hidden="true" /> WhatsApp{' '}
                  <span className="solo-lectores">(se abre en otra aplicación)</span>
                </a>
              )}
              {web && (
                <a className="boton boton--secundario" href={web.valor} target="_blank" rel="noopener noreferrer">
                  <Globe size={18} aria-hidden="true" /> Abrir chat{' '}
                  <span className="solo-lectores">(se abre en otra pestaña)</span>
                </a>
              )}
              {correo && (
                <a className="boton boton--secundario" href={`mailto:${correo.valor}`}>
                  <Mail size={18} aria-hidden="true" /> Correo
                </a>
              )}
            </div>
          </div>
          <div className="detalle__info">
            <ul className="lista-info">
              {servicio.direccion && (
                <li>
                  <MapPin size={20} aria-hidden="true" />
                  <div>
                    <strong>Dirección</strong>
                    <span>{servicio.direccion}</span>
                    {servicio.lat != null && (
                      <>
                        {' · '}
                        <Link to={`/mapa?servicio=${servicio.id}`}>
                          <Map size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Ver en el mapa
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              )}
              {servicio.horario && (
                <li>
                  <Clock size={20} aria-hidden="true" />
                  <div>
                    <strong>Horario</strong>
                    <span>{servicio.horario}</span>
                  </div>
                </li>
              )}
              <li>
                <Wallet size={20} aria-hidden="true" />
                <div>
                  <strong>Costo y modalidad</strong>
                  <span>
                    {servicio.costo || 'Sin información'} · {servicio.modalidad.map((m) => ETIQUETAS.modalidad[m]).join(', ')}
                  </span>
                </div>
              </li>
              <li>
                <Users size={20} aria-hidden="true" />
                <div>
                  <strong>Para quién y cobertura</strong>
                  <span>
                    {servicio.publico.map((p) => ETIQUETAS.publico[p]).join(', ')}
                    {servicio.cobertura && ` · ${servicio.cobertura}`}
                  </span>
                </div>
              </li>
              <li>
                <ShieldCheck size={20} aria-hidden="true" />
                <div>
                  <strong>Fuente oficial</strong>
                  <span>
                    {servicio.fuente?.entidad && `${servicio.fuente.entidad} · `}
                    <a href={servicio.url_fuente} target="_blank" rel="noopener noreferrer">
                      {dominio(servicio.url_fuente)} <span className="solo-lectores">(se abre en otra pestaña)</span>
                    </a>
                    <br />
                    Verificado el <time dateTime={servicio.fecha_verificacion}>{fechaCorta(servicio.fecha_verificacion)}</time>
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {servicio.es_sintetico && <p className="insignia insignia--sintetico">Dato de prueba ficticio</p>}

        <button
          type="button"
          className="boton boton--secundario boton--bloque"
          onClick={() => setReportando(true)}
          style={{ marginTop: '0.75rem' }}
        >
          <Flag size={18} aria-hidden="true" /> Reportar información incorrecta
        </button>
        {reportando && <DialogoReporte servicio={servicio} abierto={reportando} alCerrar={() => setReportando(false)} />}
      </div>
    </article>
  );
}
