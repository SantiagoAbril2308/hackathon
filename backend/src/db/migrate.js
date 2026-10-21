import { env } from '../config/env.js';
import { migrarBase } from './operaciones.js';

migrarBase()
  .then((tablas) => {
    console.log(`Migración completa en "${env.db.name}". Tablas: ${tablas.join(', ')}`);
  })
  .catch((err) => {
    console.error(`Error en la migración: ${err.message}`);
    process.exit(1);
  });
