import { env } from './env.js';

export const USER_AGENT = 'RutaSerenaBot/1.0';

/** Mínimo entre dos solicitudes al mismo dominio (incluye robots.txt). */
export const INTERVALO_POR_DOMINIO_MS = 5000;

export const TIEMPO_MAXIMO_MS = 15000;
export const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECCIONES = 3;

/**
 * Lista blanca por defecto: dominios oficiales (se permiten también sus subdominios).
 * Se reemplaza con SCRAPER_LISTA_BLANCA="dominio1,dominio2". Verifica cada dominio antes de usarlo.
 */
export const LISTA_BLANCA_POR_DEFECTO = ['minsalud.gov.co', 'meta.gov.co', 'villavicencio.gov.co'];

export function listaBlanca() {
  return env.scraperListaBlanca.length ? env.scraperListaBlanca : LISTA_BLANCA_POR_DEFECTO;
}
