import 'dotenv/config';

function entero(valor, porDefecto) {
  const n = Number.parseInt(valor, 10);
  return Number.isNaN(n) ? porDefecto : n;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: entero(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || '',
    port: entero(process.env.DB_PORT, 4000),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'ruta_serena',
  },
  jwtSecret: process.env.JWT_SECRET || '',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || '',
  },
  corsOrigin: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  scraperCron: process.env.SCRAPER_CRON || '0 3 * * *',
  diasVigencia: entero(process.env.DIAS_VIGENCIA, 30),
  adminSeed: {
    email: process.env.ADMIN_SEED_EMAIL || '',
    password: process.env.ADMIN_SEED_PASSWORD || '',
  },
};

export const AVISO =
  'Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.';
