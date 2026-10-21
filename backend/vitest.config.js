import { defineConfig } from 'vitest/config';
import { DB_PRUEBAS } from './tests/setup/constantes.js';

// Las pruebas de integración usan una base APARTE (ruta_serena_test) en el mismo clúster.
// Nunca tocan la base de desarrollo. Sin DB_HOST en backend/.env, esas pruebas se omiten.

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['tests/setup/global.js'],
    // Los archivos comparten la base de pruebas: se ejecutan uno tras otro.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-ruta-serena-0123456789',
      DIAS_VIGENCIA: '30',
      DB_NAME: DB_PRUEBAS,
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
