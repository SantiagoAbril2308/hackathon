import cron from 'node-cron';
import { env } from '../config/env.js';
import { ejecutarScraper as scraperPorDefecto } from '../services/scraper.js';
import { vencerServicios } from './vencimiento.js';

export const ZONA = 'America/Bogota';
/** Vencimiento diario a las 00:05 hora de Colombia. */
export const CRON_VENCIMIENTO = '5 0 * * *';

async function correr(nombre, tarea) {
  try {
    const resultado = await tarea();
    if (nombre === 'vencimiento') console.log(`[job:vencimiento] ${resultado} servicios pasaron a en_revision`);
    return resultado;
  } catch (err) {
    console.error(`[job:${nombre}] error: ${err.message}`);
    return null;
  }
}

/**
 * Programa el scraper (SCRAPER_CRON) y el vencimiento diario. Ejecuta un vencimiento al arrancar.
 * @returns {{ detener: () => void }}
 */
export function iniciarJobs({
  cronScraper = env.scraperCron,
  ejecutarScraper = scraperPorDefecto,
  vencer = vencerServicios,
  vencerAlIniciar = true,
} = {}) {
  if (!cron.validate(cronScraper)) {
    throw new Error(`SCRAPER_CRON no es una expresión cron válida: "${cronScraper}"`);
  }
  const opciones = { timezone: ZONA, noOverlap: true };
  const tareas = [
    cron.schedule(cronScraper, () => correr('scraper', ejecutarScraper), { ...opciones, name: 'scraper' }),
    cron.schedule(CRON_VENCIMIENTO, () => correr('vencimiento', vencer), { ...opciones, name: 'vencimiento' }),
  ];
  console.log(`[jobs] scraper "${cronScraper}" y vencimiento "${CRON_VENCIMIENTO}" (${ZONA})`);
  if (vencerAlIniciar) correr('vencimiento', vencer);

  return {
    tareas,
    detener: () => tareas.forEach((t) => t.stop()),
  };
}

export { correr };
