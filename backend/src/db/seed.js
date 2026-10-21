import { env } from '../config/env.js';
import { sembrarBase } from './operaciones.js';

async function main() {
  if (env.nodeEnv === 'production' && !process.argv.includes('--forzar')) {
    throw new Error('El seed borra los datos y solo carga datos sintéticos. En producción usa --forzar si estás seguro.');
  }
  await sembrarBase();
  console.log(`Seed sintético cargado en "${env.db.name}" y administrador inicial creado/actualizado.`);
}

main().catch((err) => {
  console.error(`Error en el seed: ${err.message}`);
  process.exit(1);
});
