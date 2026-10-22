import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstalarAplicacion from '../components/InstalarAplicacion.jsx';
import { iniciarInstalacion, leerInstalacion, solicitarInstalacion } from './instalacion.js';

let detener;
let pantalla;

function ofrecer({ resultado = 'accepted', fallo = false } = {}) {
  const evento = new Event('beforeinstallprompt', { cancelable: true });
  evento.prompt = fallo ? vi.fn().mockRejectedValue(new Error('No disponible')) : vi.fn().mockResolvedValue({ outcome: resultado });
  evento.userChoice = Promise.resolve({ outcome: resultado });
  act(() => window.dispatchEvent(evento));
  return evento;
}

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true);
  pantalla = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.spyOn(window, 'matchMedia').mockReturnValue(pantalla);
});

afterEach(() => {
  cleanup();
  detener?.();
  detener = null;
});

describe('instalación voluntaria de la PWA', () => {
  it('permite consultar las instrucciones sin pedir instalar ni activar notificaciones', async () => {
    detener = iniciarInstalacion();
    const permiso = vi.fn();
    vi.stubGlobal('Notification', { requestPermission: permiso });
    render(<InstalarAplicacion />);
    expect(screen.queryByRole('button', { name: 'Instalar Ruta Serena' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Cómo instalar en iPhone o iPad'));
    expect(screen.getByText(/Si aparece «Abrir como app»/)).toBeVisible();
    expect(permiso).not.toHaveBeenCalled();
  });

  it('recuerda la oferta del navegador aunque Ajustes todavía no esté abierto', async () => {
    detener = iniciarInstalacion();
    const evento = ofrecer();
    expect(evento.defaultPrevented).toBe(true);
    expect(evento.prompt).not.toHaveBeenCalled();
    render(<InstalarAplicacion />);
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Ruta Serena' }));
    expect(evento.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Instalación solicitada/)).toBeVisible();
    expect(leerInstalacion().instalada).toBe(false);
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(screen.getByText('Ruta Serena está instalada.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Instalar Ruta Serena' })).not.toBeInTheDocument();
  });

  it('respeta el rechazo y no reutiliza una confirmación nativa consumida', async () => {
    detener = iniciarInstalacion();
    const evento = ofrecer({ resultado: 'dismissed' });
    render(<InstalarAplicacion />);
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Ruta Serena' }));
    expect(await screen.findByText(/Puedes instalarla más adelante/)).toBeVisible();
    await expect(solicitarInstalacion()).resolves.toBe('no_disponible');
    expect(evento.prompt).toHaveBeenCalledTimes(1);
  });

  it('mantiene las instrucciones si falla la confirmación del navegador', async () => {
    detener = iniciarInstalacion();
    ofrecer({ fallo: true });
    render(<InstalarAplicacion />);
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Ruta Serena' }));
    expect(await screen.findByText(/No se pudo abrir la instalación/)).toBeVisible();
    expect(screen.getByText('Cómo instalar en Android')).toBeVisible();
    expect(leerInstalacion().solicitando).toBe(false);
  });

  it('no ofrece instalación nativa en un origen inseguro', () => {
    vi.stubGlobal('isSecureContext', false);
    detener = iniciarInstalacion();
    const evento = ofrecer();
    render(<InstalarAplicacion />);
    expect(evento.defaultPrevented).toBe(false);
    expect(screen.queryByRole('button', { name: 'Instalar Ruta Serena' })).not.toBeInTheDocument();
  });

  it('reconoce la apertura standalone y evita solicitar otra instalación', async () => {
    pantalla.matches = true;
    detener = iniciarInstalacion();
    const evento = ofrecer();
    render(<InstalarAplicacion />);
    expect(screen.getByText('Ruta Serena está instalada.')).toBeVisible();
    await expect(solicitarInstalacion()).resolves.toBe('no_disponible');
    expect(evento.prompt).not.toHaveBeenCalled();
  });

  it('reconoce la instalación desde el menú del navegador', () => {
    detener = iniciarInstalacion();
    render(<InstalarAplicacion />);
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(screen.getByText('Ruta Serena está instalada.')).toBeVisible();
  });

  it('no acumula suscripciones si se inicializa más de una vez', () => {
    const registrar = vi.spyOn(window, 'addEventListener');
    detener = iniciarInstalacion();
    expect(iniciarInstalacion()).toBe(detener);
    expect(registrar.mock.calls.filter(([nombre]) => nombre === 'beforeinstallprompt')).toHaveLength(1);
  });
});
