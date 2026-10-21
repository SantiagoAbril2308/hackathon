import { crearApp } from './app.js';
import { env } from './config/env.js';
import { cerrarPool } from './db/pool.js';
import { iniciarJobs } from './jobs/index.js';

const app = crearApp();

const servidor = app.listen(env.port, () => {
  console.log(`Ruta Serena API escuchando en el puerto ${env.port}`);
});

const jobs = env.jobsActivos && env.db.host ? iniciarJobs() : null;
if (!jobs) console.log('[jobs] desactivados (JOBS_ACTIVOS=false o sin base de datos)');

function apagar(senal) {
  console.log(`${senal} recibido: cerrando...`);
  jobs?.detener();
  servidor.close(async () => {
    await cerrarPool().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
