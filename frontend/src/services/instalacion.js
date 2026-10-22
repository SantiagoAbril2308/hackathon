/** Estado de instalación en memoria. No pide permisos ni guarda datos del dispositivo. */
let eventoPendiente = null;
let detener = null;
let estado = { instalada: false, disponible: false, solicitando: false };
const oyentes = new Set();

function actualizar(cambios) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((oyente) => oyente());
}

export function leerInstalacion() {
  return estado;
}

export function observarInstalacion(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Se inicia antes de React: el navegador puede ofrecer instalación antes de abrir Ajustes. */
export function iniciarInstalacion() {
  if (detener) return detener;
  const pantalla = window.matchMedia('(display-mode: standalone)');
  const instalada = () => pantalla.matches || navigator.standalone === true;
  actualizar({ instalada: instalada(), disponible: false, solicitando: false });

  function ofrecer(evento) {
    if (typeof evento.prompt !== 'function' || instalada() || !window.isSecureContext) return;
    evento.preventDefault();
    eventoPendiente = evento;
    actualizar({ disponible: true });
  }

  function completar() {
    eventoPendiente = null;
    actualizar({ instalada: true, disponible: false });
  }

  function cambiarPantalla() {
    const abiertaComoApp = instalada();
    if (abiertaComoApp) eventoPendiente = null;
    actualizar({ instalada: abiertaComoApp, disponible: !abiertaComoApp && !!eventoPendiente });
  }

  window.addEventListener('beforeinstallprompt', ofrecer);
  window.addEventListener('appinstalled', completar);
  pantalla.addEventListener?.('change', cambiarPantalla);
  detener = () => {
    window.removeEventListener('beforeinstallprompt', ofrecer);
    window.removeEventListener('appinstalled', completar);
    pantalla.removeEventListener?.('change', cambiarPantalla);
    eventoPendiente = null;
    detener = null;
    actualizar({ instalada: false, disponible: false, solicitando: false });
  };
  return detener;
}

/** La confirmación nativa se abre únicamente desde el toque de la persona. */
export async function solicitarInstalacion() {
  if (!eventoPendiente || estado.instalada || estado.solicitando || !window.isSecureContext) return 'no_disponible';
  const evento = eventoPendiente;
  eventoPendiente = null;
  actualizar({ disponible: false, solicitando: true });
  try {
    const resultado = await evento.prompt();
    const decision = resultado?.outcome ? resultado : await evento.userChoice;
    return decision?.outcome === 'accepted' ? 'aceptada' : 'descartada';
  } catch {
    return 'error';
  } finally {
    actualizar({ solicitando: false });
  }
}
