/**
 * Extracción de teléfonos colombianos en texto libre.
 * - fijo:     10 dígitos que empiezan con 60 (ej. 601 000 0000, (608) 000-0000, +57 601...)
 * - celular:  10 dígitos que empiezan con 3 (ej. 300 000 0000, +57 300...)
 * - corta:    3 dígitos que empiezan con 1 (ej. 123)
 * - sintetico: formato 000-000-00XX de los datos ficticios (solo si se activa, para pruebas)
 */
const SEP = '[\\s.\\-]*';
const PREFIJO_PAIS = `(?:\\+?57${SEP})?`;

const PATRONES = {
  sintetico: /(?<![\d-])000-000-00\d{2}(?![\d-])/g,
  fijo: new RegExp(`(?<![\\d+])${PREFIJO_PAIS}\\(?(60\\d)\\)?${SEP}(\\d{3})${SEP}(\\d{4})(?!\\d)`, 'g'),
  celular: new RegExp(`(?<![\\d+])${PREFIJO_PAIS}(3\\d{2})${SEP}(\\d{3})${SEP}(\\d{4})(?!\\d)`, 'g'),
  // Aislado: sin dígitos, guiones ni puntos pegados (evita "123-4567", "1.234", "Calle 123A").
  corta: /(?<![\d\-.,\w])(1\d{2})(?![\d\-\w]|[.,]\d|\s+\d)/g,
};

/** Solo dígitos: se usa para comparar números escritos con formatos distintos. */
export function soloDigitos(valor) {
  const d = String(valor).replace(/\D/g, '');
  return d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
}

/**
 * @param {string} texto
 * @param {{ aceptarSinteticos?: boolean }} [opciones]
 * @returns {{ tipo: string, valor: string, digitos: string }[]} sin duplicados, en orden de aparición
 */
export function extraerTelefonos(texto, { aceptarSinteticos = false } = {}) {
  let resto = String(texto ?? '');
  const hallados = [];
  const tipos = aceptarSinteticos ? ['sintetico', 'fijo', 'celular', 'corta'] : ['fijo', 'celular', 'corta'];

  for (const tipo of tipos) {
    const patron = PATRONES[tipo];
    patron.lastIndex = 0;
    for (const m of resto.matchAll(patron)) {
      let valor;
      if (tipo === 'sintetico') valor = m[0];
      else if (tipo === 'corta') valor = m[1];
      else valor = `${m[1]} ${m[2]} ${m[3]}`;
      hallados.push({ tipo, valor, digitos: soloDigitos(valor), indice: m.index });
    }
    // Se tapa lo encontrado para que un patrón posterior no lo vuelva a tomar por partes.
    resto = resto.replace(patron, (s) => ' '.repeat(s.length));
  }

  const vistos = new Set();
  return hallados
    .sort((a, b) => a.indice - b.indice)
    .filter((t) => (vistos.has(t.digitos) ? false : vistos.add(t.digitos)))
    .map(({ tipo, valor, digitos }) => ({ tipo, valor, digitos }));
}
