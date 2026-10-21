import { HttpError } from '../utils/httpError.js';

/**
 * Punto de entrada del scraper. La implementación (lista blanca, robots.txt, hash SHA-256
 * y creación de cambios_pendientes) se agrega en la Fase 3.
 */
export async function ejecutarScraper() {
  throw new HttpError(501, 'El scraper todavía no está habilitado (Fase 3)');
}
