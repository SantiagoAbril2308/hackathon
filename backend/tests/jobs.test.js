import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { cerrarPool, query } from '../src/db/pool.js';
import { vencerServicios } from '../src/jobs/vencimiento.js';
import { iniciarJobs, CRON_VENCIMIENTO } from '../src/jobs/index.js';
import { hayBaseDeDatos, reiniciarBase } from './helpers.js';

describe('programación de jobs', () => {
  it('rechaza un SCRAPER_CRON inválido', () => {
    expect(() => iniciarJobs({ cronScraper: 'cada rato', vencerAlIniciar: false })).toThrow(/SCRAPER_CRON/);
  });

  it('programa scraper y vencimiento, ejecuta un vencimiento al iniciar y se puede detener', async () => {
    const vencer = vi.fn().mockResolvedValue(0);
    const jobs = iniciarJobs({ cronScraper: '0 3 * * *', vencer, ejecutarScraper: vi.fn() });
    await vi.waitFor(() => expect(vencer).toHaveBeenCalledTimes(1));
    expect(jobs.tareas).toHaveLength(2);
    expect(CRON_VENCIMIENTO).toBe('5 0 * * *');
    jobs.detener();
  });

  it('un error en un job se registra y no tumba el proceso', async () => {
    const vencer = vi.fn().mockRejectedValue(new Error('base caída'));
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const jobs = iniciarJobs({ vencer, ejecutarScraper: vi.fn() });
    await vi.waitFor(() => expect(espia).toHaveBeenCalledWith(expect.stringContaining('base caída')));
    jobs.detener();
    espia.mockRestore();
  });
});

describe.skipIf(!hayBaseDeDatos)('job de vencimiento (integración)', () => {
  const app = crearApp();
  beforeAll(reiniciarBase);
  afterAll(cerrarPool);

  it('pasa a en_revision los vigentes con más de DIAS_VIGENCIA días sin verificar', async () => {
    expect(await vencerServicios()).toBe(3);
    const filas = await query('SELECT id, estado FROM servicios WHERE id IN (16, 17, 18, 19, 20) ORDER BY id');
    expect(filas).toEqual([
      { id: 16, estado: 'vigente' },
      { id: 17, estado: 'en_revision' },
      { id: 18, estado: 'en_revision' },
      { id: 19, estado: 'en_revision' },
      { id: 20, estado: 'en_revision' },
    ]);
  });

  it('es idempotente y coincide con lo que muestra la API', async () => {
    expect(await vencerServicios()).toBe(0);
    const res = await request(app).get('/api/servicios');
    const [{ vigentes }] = await query("SELECT COUNT(*) AS vigentes FROM servicios WHERE estado = 'vigente'");
    expect(res.body.total).toBe(Number(vigentes));
  });
});
