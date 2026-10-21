import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { activar, desactivar, restaurarAlIniciar, ETIQUETA } from './accesoRapido.js';
import { leerPreferencias, guardarPreferencias } from './almacen.js';
import Ajustes from '../pages/Ajustes.jsx';
import { simularFetch } from '../test/datos.js';

function prepararNavegador({ permiso = 'default', respuesta = 'granted' } = {}) {
  const registro = { showNotification: vi.fn().mockResolvedValue(), getNotifications: vi.fn().mockResolvedValue([]) };
  const requestPermission = vi.fn().mockResolvedValue(respuesta);
  const Notificacion = vi.fn();
  Notificacion.permission = permiso;
  Notificacion.requestPermission = requestPermission;
  vi.stubGlobal('Notification', Notificacion);
  Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve(registro) }, configurable: true });
  return { registro, requestPermission, Notificacion };
}

describe('acceso rápido (PWA-05 a PWA-08)', () => {
  it('PWA-06: usa registration.showNotification con el título, el texto y sin sonido', async () => {
    const { registro, Notificacion } = prepararNavegador();
    expect((await activar()).ok).toBe(true);
    expect(registro.showNotification).toHaveBeenCalledWith(
      'Ruta Serena',
      expect.objectContaining({ body: 'Toca para ver líneas de apoyo', silent: true, tag: ETIQUETA, data: { url: '/apoyo' }, badge: '/icons/badge-96.png' }),
    );
    expect(Notificacion).not.toHaveBeenCalled(); // nunca new Notification()
  });

  it('PWA-08: guarda la preferencia en IndexedDB', async () => {
    prepararNavegador();
    await activar();
    expect((await leerPreferencias()).accesoRapido).toBe(true);
    await desactivar();
    expect((await leerPreferencias()).accesoRapido).toBe(false);
  });

  it('si la persona niega el permiso, no muestra nada y deja la preferencia apagada', async () => {
    const { registro } = prepararNavegador({ respuesta: 'denied' });
    expect(await activar()).toEqual({ ok: false, motivo: 'denegado' });
    expect(registro.showNotification).not.toHaveBeenCalled();
    expect((await leerPreferencias()).accesoRapido).toBe(false);
  });

  it('PWA-08: al abrir la app vuelve a mostrar la notificación solo si está activa y hay permiso', async () => {
    const { registro } = prepararNavegador({ permiso: 'granted' });
    expect(await restaurarAlIniciar()).toBe(false);
    await guardarPreferencias({ accesoRapido: true });
    expect(await restaurarAlIniciar()).toBe(true);
    expect(registro.showNotification).toHaveBeenCalledTimes(1);
  });

  it('PWA-05: /ajustes no pide permiso al abrirse; lo pide solo al activar el interruptor', async () => {
    simularFetch({});
    const { requestPermission, registro } = prepararNavegador();
    render(
      <MemoryRouter>
        <Ajustes />
      </MemoryRouter>,
    );
    const interruptor = await screen.findByRole('switch', { name: /Acceso rápido/ });
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(requestPermission).not.toHaveBeenCalled();

    await userEvent.click(interruptor);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(interruptor).toHaveAttribute('aria-checked', 'true'));
    expect(registro.showNotification).toHaveBeenCalledTimes(1);
  });

  it('el código nunca crea notificaciones con new Notification()', () => {
    const raiz = resolve(process.cwd(), 'src');
    const archivos = [];
    const recorrer = (dir) =>
      readdirSync(dir).forEach((n) => {
        const ruta = join(dir, n);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.(jsx?|mjs)$/.test(n) && !n.includes('.test.')) archivos.push(ruta);
      });
    recorrer(raiz);
    expect(archivos.length).toBeGreaterThan(10);
    for (const archivo of archivos) {
      expect(readFileSync(archivo, 'utf8'), archivo).not.toMatch(/new\s+Notification\s*\(/);
    }
  });
});
