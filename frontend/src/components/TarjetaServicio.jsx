import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Globe, Mail, Clock, Wallet, MapPin, ChevronRight, Flag } from 'lucide-react';
import Insignia from './Insignia.jsx';
import DialogoReporte from './DialogoReporte.jsx';
import { fechaCorta, dominio, enlaceTelefono, enlaceWhatsApp } from '../services/formato.js';

/**
 * Tarjeta de servicio: nombre, llamar (tel:), WhatsApp (wa.me) si existe, horario, costo,
 * fuente enlazada, fecha de verificación y "Este número no funciona".
 */
export default function TarjetaServicio({ servicio, nivel = 3, enlaceDetalle = true }) {
  const [reportando, setReportando] = useState(false);
  const Titulo = `h${nivel}`;
  const telefono = servicio.canales.find((c) => c.tipo === 'telefono');
  const whatsapp = servicio.canales.find((c) => c.tipo === 'whatsapp');
  const web = servicio.canales.find((c) => c.tipo === 'web');
  const correo = servicio.canales.find((c) => c.tipo === 'email');
  const nombreAccesible = servicio.nombre;

  return (
    <article className="tarjeta" aria-labelledby={`servicio-${servicio.id}`}>
      <div className="tarjeta__cabecera">
        <Titulo className="tarjeta__titulo" id={`servicio-${servicio.id}`}>
          {enlaceDetalle ? (
            <Link to={`/directorio/${servicio.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {servicio.nombre}
            </Link>
          ) : (
            servicio.nombre
          )}
        </Titulo>
        <Insignia estado={servicio.estado} />
      </div>

      <ul className="tarjeta__datos">
        {telefono && (
          <li>
            <Phone size={15} aria-hidden="true" />
            <span>{telefono.valor}</span>
          </li>
        )}
        {servicio.horario && (
          <li>
            <Clock size={15} aria-hidden="true" />
            <span>
              <span className="solo-lectores">Horario: </span>
              {servicio.horario}
            </span>
          </li>
        )}
        {servicio.costo && (
          <li>
            <Wallet size={15} aria-hidden="true" />
            <span>
              <span className="solo-lectores">Costo: </span>
              {servicio.costo}
            </span>
          </li>
        )}
        {servicio.direccion && (
          <li>
            <MapPin size={15} aria-hidden="true" />
            <span>{servicio.direccion}</span>
          </li>
        )}
      </ul>

      {servicio.estado !== 'vigente' && servicio.mensaje_estado && <p className="banner">{servicio.mensaje_estado}</p>}

      <div className="tarjeta__acciones">
        {telefono && (
          <a className="boton boton--secundario" href={enlaceTelefono(telefono.valor)}>
            <Phone size={18} aria-hidden="true" /> Llamar{' '}<span className="solo-lectores">a {nombreAccesible}</span>
          </a>
        )}
        {whatsapp && (
          <a
            className="boton boton--secundario"
            href={enlaceWhatsApp(whatsapp.valor)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} aria-hidden="true" /> WhatsApp
            {' '}<span className="solo-lectores">de {nombreAccesible} (se abre en otra aplicación)</span>
          </a>
        )}
        {!telefono && web && (
          <a className="boton boton--secundario" href={web.valor} target="_blank" rel="noopener noreferrer">
            <Globe size={18} aria-hidden="true" /> Abrir chat
            {' '}<span className="solo-lectores">de {nombreAccesible} (se abre en otra pestaña)</span>
          </a>
        )}
        {!telefono && !web && correo && (
          <a className="boton boton--secundario" href={`mailto:${correo.valor}`}>
            <Mail size={18} aria-hidden="true" /> Escribir
          </a>
        )}
      </div>

      <div className="tarjeta__fuente">
        <span>
          Fuente:{' '}
          <a href={servicio.url_fuente} target="_blank" rel="noopener noreferrer">
            {dominio(servicio.url_fuente)}
            {' '}<span className="solo-lectores">(se abre en otra pestaña)</span>
          </a>
          <br />
          Verificado el <time dateTime={servicio.fecha_verificacion}>{fechaCorta(servicio.fecha_verificacion)}</time>
        </span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <button type="button" className="boton boton--texto boton--pequeno" onClick={() => setReportando(true)}>
            <Flag size={15} aria-hidden="true" /> Este número no funciona
          </button>
          {enlaceDetalle && (
            <Link to={`/directorio/${servicio.id}`} className="boton-icono" aria-label={`Ver detalle de ${nombreAccesible}`} title="Ver detalle">
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
          )}
        </span>
      </div>
      {servicio.es_sintetico && <span className="insignia insignia--sintetico" style={{ marginTop: 8 }}>Dato de prueba ficticio</span>}

      {reportando && <DialogoReporte servicio={servicio} abierto={reportando} alCerrar={() => setReportando(false)} />}
    </article>
  );
}
