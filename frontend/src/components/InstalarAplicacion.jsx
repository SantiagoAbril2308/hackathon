import { useId, useState, useSyncExternalStore } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { Simbolo } from './Logo.jsx';
import { leerInstalacion, observarInstalacion, solicitarInstalacion } from '../services/instalacion.js';

const MENSAJES = {
  aceptada: 'Instalación solicitada. Sigue las indicaciones del navegador.',
  descartada: 'Puedes instalarla más adelante desde el menú de tu navegador.',
  no_disponible: 'Puedes seguir las instrucciones para instalarla desde tu navegador.',
  error: 'No se pudo abrir la instalación. Puedes usar las instrucciones que aparecen abajo.',
};

export default function InstalarAplicacion() {
  const titulo = useId();
  const { instalada, disponible, solicitando } = useSyncExternalStore(observarInstalacion, leerInstalacion);
  const [mensaje, setMensaje] = useState('');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const segura = window.isSecureContext;

  async function instalar() {
    setMensaje('');
    const resultado = await solicitarInstalacion();
    setMensaje(MENSAJES[resultado]);
  }

  return (
    <section className="instalacion" aria-labelledby={titulo}>
      <div className="instalacion__cabecera">
        <Simbolo tamano={44} />
        <div>
          <h2 id={titulo}>Lleva Ruta Serena contigo</h2>
          <p>En tu pantalla de inicio, sin pasar por una tienda.</p>
        </div>
      </div>

      {instalada ? (
        <p className="instalacion__estado" role="status">
          <CheckCircle2 size={20} aria-hidden="true" /> Ruta Serena está instalada.
        </p>
      ) : (
        <>
          <p className="instalacion__descripcion">
            Ábrela desde su icono y consulta el directorio que hayas guardado, incluso sin conexión.
          </p>
          {(disponible || solicitando) && segura && (
            <button type="button" className="boton boton--bloque" onClick={instalar} disabled={solicitando}>
              <Download size={19} aria-hidden="true" /> {solicitando ? 'Abriendo instalación…' : 'Instalar Ruta Serena'}
            </button>
          )}
          {(local || !segura) && (
            <p className="instalacion__nota">
              {local
                ? 'Esta es la versión local del computador. Para instalarla en un celular necesitarás el enlace HTTPS de la versión publicada.'
                : 'Para instalarla, abre Ruta Serena desde su enlace seguro HTTPS.'}
            </p>
          )}
          <div className="instalacion__instrucciones">
            <details>
              <summary>Cómo instalar en Android</summary>
              <ol>
                <li>Abre el enlace de Ruta Serena en Chrome u otro navegador compatible.</li>
                <li>En el menú del navegador, busca «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
                <li>Confirma y ábrela desde el nuevo icono.</li>
              </ol>
            </details>
            <details>
              <summary>Cómo instalar en iPhone o iPad</summary>
              <ol>
                <li>Abre el enlace de Ruta Serena en Safari.</li>
                <li>En el menú Compartir, elige «Añadir a pantalla de inicio».</li>
                <li>Si aparece «Abrir como app», actívalo. Confirma y abre el nuevo icono.</li>
              </ol>
            </details>
          </div>
        </>
      )}

      {!instalada && <p className="pequeno texto-suave instalacion__mensaje" role="status">{mensaje}</p>}
      <p className="instalacion__nota instalacion__notificaciones">
        Las notificaciones se activan por separado en «Acceso rápido». Instalar la app no solicita ese permiso.
      </p>
    </section>
  );
}
