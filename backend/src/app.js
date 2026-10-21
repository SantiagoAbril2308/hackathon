import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { crearLimites } from './middleware/limites.js';
import { manejadorErrores, rutaNoEncontrada } from './middleware/errores.js';
import { rutasPublicas } from './routes/publicas.js';
import { rutasAdmin } from './routes/admin.js';
import { ejecutarScraper as scraperPorDefecto } from './services/scraper.js';

/**
 * @param {object} [opciones]
 * @param {Function} [opciones.ejecutarScraper] permite inyectar el scraper (pruebas)
 */
export function crearApp({ ejecutarScraper = scraperPorDefecto } = {}) {
  const app = express();

  // No se registran IPs: no hay logger de peticiones. En Render hay un proxy delante.
  app.disable('x-powered-by');
  if (env.nodeEnv === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.length ? env.corsOrigin : false,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '50kb' }));

  const limites = crearLimites();
  // Admin primero para que sus solicitudes no consuman el límite público.
  app.use('/api/admin', rutasAdmin({ limites, ejecutarScraper }));
  app.use('/api', rutasPublicas({ limites }));

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
