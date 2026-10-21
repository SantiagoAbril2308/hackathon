import { EXPRESIONES_EMERGENCIA } from '../config/emergencia.js';
import { PALABRAS_TEMA, PALABRAS_PUBLICO, PALABRAS_MODALIDAD } from '../config/temasChat.js';
import { normalizar, compilarExpresiones } from './texto.js';

const compilarMapa = (mapa) => Object.entries(mapa).map(([clave, lista]) => [clave, compilarExpresiones(lista)]);

const EMERGENCIA = compilarExpresiones(EXPRESIONES_EMERGENCIA);
const TEMAS = compilarMapa(PALABRAS_TEMA);
const PUBLICOS = compilarMapa(PALABRAS_PUBLICO);
const MODALIDADES = compilarMapa(PALABRAS_MODALIDAD);

/** true si el texto contiene alguna expresión de emergencia. No calcula ni guarda nada. */
export function esEmergencia(texto) {
  const t = normalizar(texto);
  return EMERGENCIA.some((re) => re.test(t));
}

function coincidencias(mapa, t) {
  return mapa.filter(([, patrones]) => patrones.some((re) => re.test(t))).map(([clave]) => clave);
}

/** Temas, público y modalidad mencionados, para el prefiltro SQL. */
export function detectarIntencion(texto) {
  const t = normalizar(texto);
  return {
    temas: coincidencias(TEMAS, t),
    publico: coincidencias(PUBLICOS, t)[0],
    modalidad: coincidencias(MODALIDADES, t)[0],
  };
}
