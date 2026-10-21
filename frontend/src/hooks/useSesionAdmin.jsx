import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { pedir } from '../services/api.js';

/** Sesión del panel de administración. El JWT vive solo en sessionStorage (se borra al cerrar la pestaña). */
const CLAVE = 'rs-admin';
const Contexto = createContext(null);

function leerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE)) ?? null;
  } catch {
    return null;
  }
}

export function ProveedorSesionAdmin({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const cerrar = useCallback(() => {
    sessionStorage.removeItem(CLAVE);
    setSesion(null);
  }, []);

  const iniciar = useCallback(async (email, password) => {
    const datos = await pedir('/api/admin/login', { metodo: 'POST', cuerpo: { email, password } });
    const nueva = { token: datos.token, admin: datos.admin };
    sessionStorage.setItem(CLAVE, JSON.stringify(nueva));
    setSesion(nueva);
    return nueva;
  }, []);

  /** Petición autenticada; si el token venció, cierra la sesión. */
  const pedirAdmin = useCallback(
    async (ruta, opciones = {}) => {
      try {
        return await pedir(`/api/admin${ruta}`, { ...opciones, token: sesion?.token });
      } catch (err) {
        if (err.status === 401) cerrar();
        throw err;
      }
    },
    [sesion, cerrar],
  );

  const valor = useMemo(() => ({ sesion, iniciar, cerrar, pedirAdmin }), [sesion, iniciar, cerrar, pedirAdmin]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesionAdmin() {
  return useContext(Contexto);
}
