import { useEffect, useSyncExternalStore } from 'react';
import { api } from '../services/api.js';
import { leerDirectorio, guardarDirectorio } from '../services/almacen.js';

/**
 * Estado compartido del directorio: primero la copia local (IndexedDB) y luego la red.
 * Una sola descarga por sesión; todas las pantallas leen el mismo estado.
 */
let estado = { datos: null, guardadoEn: null, origen: null, cargando: true, error: null };
const oyentes = new Set();
let enCurso = null;

function actualizar(cambios) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((o) => o());
}

export async function cargarDirectorio({ forzar = false } = {}) {
  if (enCurso && !forzar) return enCurso;
  enCurso = (async () => {
    if (!estado.datos) {
      const copia = await leerDirectorio();
      if (copia?.datos) actualizar({ datos: copia.datos, guardadoEn: copia.guardado_en, origen: 'copia' });
    }
    try {
      const datos = await api.directorio();
      await guardarDirectorio(datos);
      actualizar({ datos, guardadoEn: new Date().toISOString(), origen: 'red', cargando: false, error: null });
    } catch (err) {
      actualizar({ cargando: false, error: estado.datos ? null : err.message, origen: estado.datos ? 'copia' : null });
    }
  })();
  return enCurso;
}

export function useDirectorio() {
  const actual = useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    () => estado,
  );
  useEffect(() => {
    cargarDirectorio();
  }, []);
  return { ...actual, recargar: () => cargarDirectorio({ forzar: true }) };
}

/** Solo para pruebas. */
export function _reiniciarDirectorio() {
  estado = { datos: null, guardadoEn: null, origen: null, cargando: true, error: null };
  enCurso = null;
  oyentes.clear();
}
