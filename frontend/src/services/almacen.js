/**
 * Almacenamiento local en IndexedDB (clave → valor). Solo guarda:
 *  - "directorio": la copia de /api/directorio.json para uso sin conexión.
 *  - "preferencias": el interruptor de acceso rápido (PWA-08).
 * Nunca guarda conversaciones ni datos de la persona.
 */
const BASE = 'ruta-serena';
const TIENDA = 'kv';
let conexion = null;

function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') {
      rechazar(new Error('IndexedDB no disponible'));
      return;
    }
    const solicitud = indexedDB.open(BASE, 1);
    solicitud.onupgradeneeded = () => solicitud.result.createObjectStore(TIENDA);
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
  conexion.catch(() => {
    conexion = null;
  });
  return conexion;
}

async function operar(modo, accion) {
  const db = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction(TIENDA, modo);
    const solicitud = accion(tx.objectStore(TIENDA));
    tx.oncomplete = () => resolver(solicitud?.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

export async function leer(clave) {
  try {
    return await operar('readonly', (tienda) => tienda.get(clave));
  } catch {
    return undefined;
  }
}

export async function guardar(clave, valor) {
  try {
    await operar('readwrite', (tienda) => tienda.put(valor, clave));
    return true;
  } catch {
    return false;
  }
}

export async function borrar(clave) {
  try {
    await operar('readwrite', (tienda) => tienda.delete(clave));
  } catch {
    /* sin almacenamiento disponible: nada que borrar */
  }
}

// ------------------------------------------------------------------ claves usadas por la app
export const leerDirectorio = () => leer('directorio');
export const guardarDirectorio = (datos) => guardar('directorio', { datos, guardado_en: new Date().toISOString() });

export async function leerPreferencias() {
  return { accesoRapido: false, ...((await leer('preferencias')) ?? {}) };
}

export async function guardarPreferencias(cambios) {
  const actuales = await leerPreferencias();
  return guardar('preferencias', { ...actuales, ...cambios });
}

/** Solo para pruebas: cierra la conexión abierta. */
export function _reiniciarConexion() {
  conexion = null;
}
