/** Minúsculas, sin tildes (ñ → n), sin signos de puntuación y con espacios simples. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Compila expresiones a regex con límites de palabra sobre texto normalizado.
 * Un `*` al final de una palabra acepta cualquier terminación (ej. "suicid*").
 */
export function compilarExpresiones(expresiones) {
  return expresiones.map((expresion) => {
    const partes = expresion
      .trim()
      .split(/\s+/)
      .map((palabra) => {
        const comodin = palabra.endsWith('*');
        return escapar(normalizar(palabra.replace(/\*$/, ''))) + (comodin ? '\\w*' : '');
      });
    return new RegExp(`\\b${partes.join(' ')}\\b`);
  });
}
