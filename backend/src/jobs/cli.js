import { cerrarPool } from '../db/pool.js';
import { ejecutarScraper } from '../services/scraper.js';
import { vencerServicios } from './vencimiento.js';

/** Ejecución manual: `npm run jobs:scraper` o `npm run jobs:vencimiento`. */
const TAREAS = {
  scraper: async () => {
    const r = await ejecutarScraper();
    console.table(r.fuentes.map(({ id, nombre, estado, cambios, motivo }) => ({ id, nombre, estado, cambios, motivo: motivo ?? '' })));
    console.log(`Cambios pendientes nuevos: ${r.total_cambios}. Ningún servicio fue modificado.`);
  },
  vencimiento: async () => {
    const n = await vencerServicios();
    console.log(`${n} servicios pasaron a en_revision.`);
  },
};

const nombre = process.argv[2];
const tarea = TAREAS[nombre];
if (!tarea) {
  console.error(`Uso: node src/jobs/cli.js <${Object.keys(TAREAS).join('|')}>`);
  process.exit(1);
}

tarea()
  .catch((err) => {
    console.error(`Error en ${nombre}: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(cerrarPool);
