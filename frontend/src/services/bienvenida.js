/** La bienvenida (3 pasos) se muestra solo la primera vez. Preferencia local, no personal. */
export const CLAVE_BIENVENIDA = 'rs-bienvenida-vista';

export function bienvenidaVista() {
  try {
    return localStorage.getItem(CLAVE_BIENVENIDA) === '1';
  } catch {
    return true;
  }
}

export function marcarBienvenidaVista() {
  try {
    localStorage.setItem(CLAVE_BIENVENIDA, '1');
  } catch {
    /* sin almacenamiento: se mostrará de nuevo, no es grave */
  }
}
