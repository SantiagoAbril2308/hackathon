import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Phone, Send, LifeBuoy } from 'lucide-react';
import Encabezado from '../components/Encabezado.jsx';
import TarjetaServicio from '../components/TarjetaServicio.jsx';
import { api } from '../services/api.js';

export const AVISO_ASISTENTE = 'Soy un asistente de información, no un profesional de salud.';
const SALUDO =
  'Hola, ¿en qué puedo ayudarte? Puedo mostrarte líneas y servicios de apoyo disponibles en Villavicencio y el Meta.';
const SUGERENCIA = 'Necesito hablar con alguien ahora';
const MAX_HISTORIAL = 12;

/**
 * La conversación vive solo en la memoria de esta pantalla: no se guarda en el navegador
 * ni en el servidor. Al salir de la pantalla se pierde.
 */
export default function Asistente() {
  const [mensajes, setMensajes] = useState([{ rol: 'asistente', texto: SALUDO }]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const final = useRef(null);

  const ultima = mensajes.length > 1 && mensajes.at(-1).rol === 'asistente' ? mensajes.at(-1) : null;

  useEffect(() => {
    final.current?.scrollIntoView?.({ block: 'end' });
  }, [mensajes]);

  async function enviar(contenido) {
    const mensaje = contenido.trim();
    if (!mensaje || enviando) return;
    const historial = mensajes
      .slice(1)
      .slice(-MAX_HISTORIAL)
      .map((m) => ({ rol: m.rol, texto: m.texto }));
    setMensajes((actuales) => [...actuales, { rol: 'usuario', texto: mensaje }]);
    setTexto('');
    setEnviando(true);
    try {
      const r = await api.chat({ mensaje, historial });
      setMensajes((actuales) => [
        ...actuales,
        { rol: 'asistente', texto: r.mensaje, servicios: r.servicios, emergencia: r.emergencia },
      ]);
    } catch (err) {
      setMensajes((actuales) => [
        ...actuales,
        {
          rol: 'asistente',
          texto: `${err.status === 429 ? err.message : 'No pude responder en este momento.'} Si necesitas apoyo, las líneas de apoyo siempre están disponibles y, si tu vida o la de alguien está en peligro, llama al 123.`,
          error: true,
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="lectura">
      <Encabezado titulo="Asistente" />
      <p className="banner" role="note" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <Info size={18} aria-hidden="true" />
        {AVISO_ASISTENTE}
      </p>

      <p className="solo-lectores" aria-live="polite">
        {ultima && !enviando
          ? `El asistente respondió: ${ultima.texto}${ultima.servicios?.length ? ` Con ${ultima.servicios.length} opciones de servicio.` : ''}`
          : ''}
      </p>
      <section className="chat" aria-label="Conversación">
        {mensajes.map((m, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <p className={`burbuja burbuja--${m.rol}`}>
              <span className="solo-lectores">{m.rol === 'usuario' ? 'Tú: ' : 'Asistente: '}</span>
              {m.texto}
            </p>
            {m.emergencia && (
              <a className="boton boton--emergencia" href="tel:123">
                <Phone size={18} aria-hidden="true" /> Llamar al 123
              </a>
            )}
            {m.error && (
              <Link className="boton boton--secundario" to="/apoyo">
                <LifeBuoy size={18} aria-hidden="true" /> Ver líneas de apoyo
              </Link>
            )}
            {m.servicios?.length > 0 && (
              <div className="chat__servicios">
                {!m.emergencia && (
                  <p className="pequeno" style={{ margin: 0, fontWeight: 600 }}>
                    Aquí tienes algunas opciones disponibles:
                  </p>
                )}
                {m.servicios.map((s) => (
                  <TarjetaServicio key={s.id} servicio={s} nivel={2} />
                ))}
              </div>
            )}
          </div>
        ))}
        {mensajes.length === 1 && (
          <button type="button" className="boton" style={{ alignSelf: 'flex-end' }} onClick={() => enviar(SUGERENCIA)}>
            {SUGERENCIA}
          </button>
        )}
        {enviando && (
          <p className="burbuja burbuja--asistente texto-suave" role="status">
            Buscando opciones…
          </p>
        )}
        <div ref={final} />
      </section>

      <div className="chat__entrada">
        <Link to="/apoyo" className="boton boton--emergencia boton--pequeno boton-emergencia-fijo">
          <Phone size={16} aria-hidden="true" /> Líneas de emergencia
        </Link>
        <form
          className="chat__formulario"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <label htmlFor="mensaje-chat" className="solo-lectores">
            Escribe un mensaje
          </label>
          <input
            id="mensaje-chat"
            className="entrada"
            placeholder="Escribe un mensaje…"
            value={texto}
            maxLength={500}
            autoComplete="off"
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="boton-enviar" aria-label="Enviar mensaje" disabled={enviando || !texto.trim()}>
            <Send size={20} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
