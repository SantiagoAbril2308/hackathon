/** Modo de apariencia: 'auto' (según el sistema), 'claro' u 'oscuro'. Preferencia local, no personal. */
const CLAVE = 'rs-apariencia';
export const MODOS = [
  { valor: 'auto', etiqueta: 'Automático' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

export function leerApariencia() {
  try {
    const v = localStorage.getItem(CLAVE);
    return MODOS.some((m) => m.valor === v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function aplicarApariencia(modo = leerApariencia()) {
  document.documentElement.dataset.tema = modo;
  const oscuro = modo === 'oscuro' || (modo === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0F1F1A' : '#164F3B');
}

export function guardarApariencia(modo) {
  try {
    localStorage.setItem(CLAVE, modo);
  } catch {
    /* almacenamiento no disponible: se aplica solo en esta sesión */
  }
  aplicarApariencia(modo);
}
