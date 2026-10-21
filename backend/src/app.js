import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, AVISO } from './config/env.js';

export function crearApp() {
  const app = express();

  // No se registran IPs: sin logger de peticiones y sin confiar en cabeceras de proxy para guardarlas.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin.length ? env.corsOrigin : false,
    }),
  );
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true, servicio: 'ruta-serena-api', aviso: AVISO });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'No encontrado' });
  });

  return app;
}
