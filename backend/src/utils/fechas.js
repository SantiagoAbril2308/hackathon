const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000; // UTC-5, sin horario de verano

/** Fecha de hoy en Colombia como 'YYYY-MM-DD'. */
export function hoyColombia(ahora = new Date()) {
  return new Date(ahora.getTime() - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}
