/**
 * Parser mínimo de robots.txt (RFC 9309): grupos por User-agent, Allow/Disallow,
 * gana la regla más específica (más larga) y, en empate, Allow. Soporta * y $.
 */
export function parsearRobots(contenido) {
  const grupos = [];
  let actual = null;
  let leyendoAgentes = false;

  for (const lineaCruda of String(contenido ?? '').split(/\r?\n/)) {
    const linea = lineaCruda.replace(/#.*$/, '').trim();
    if (!linea) continue;
    const separador = linea.indexOf(':');
    if (separador === -1) continue;
    const clave = linea.slice(0, separador).trim().toLowerCase();
    const valor = linea.slice(separador + 1).trim();

    if (clave === 'user-agent') {
      if (!leyendoAgentes) {
        actual = { agentes: [], reglas: [] };
        grupos.push(actual);
      }
      actual.agentes.push(valor.toLowerCase());
      leyendoAgentes = true;
    } else if ((clave === 'allow' || clave === 'disallow') && actual) {
      leyendoAgentes = false;
      if (valor) actual.reglas.push({ permitir: clave === 'allow', ruta: valor });
    } else {
      leyendoAgentes = false;
    }
  }
  return grupos;
}

function coincide(ruta, patron) {
  const anclado = patron.endsWith('$');
  const cuerpo = (anclado ? patron.slice(0, -1) : patron)
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${cuerpo}${anclado ? '$' : ''}`).test(ruta);
}

/**
 * @param {ReturnType<typeof parsearRobots>} grupos
 * @param {string} userAgent ej. "RutaSerenaBot/1.0"
 * @param {string} ruta path + query, ej. "/lineas?x=1"
 */
export function rutaPermitida(grupos, userAgent, ruta) {
  const producto = userAgent.split('/')[0].toLowerCase();
  const especificos = grupos.filter((g) => g.agentes.some((a) => a !== '*' && producto.includes(a)));
  const aplicables = especificos.length ? especificos : grupos.filter((g) => g.agentes.includes('*'));
  const reglas = aplicables.flatMap((g) => g.reglas);

  let ganadora = null;
  for (const regla of reglas) {
    if (!coincide(ruta, regla.ruta)) continue;
    if (
      !ganadora ||
      regla.ruta.length > ganadora.ruta.length ||
      (regla.ruta.length === ganadora.ruta.length && regla.permitir)
    ) {
      ganadora = regla;
    }
  }
  return ganadora ? ganadora.permitir : true;
}
