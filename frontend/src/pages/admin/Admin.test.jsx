import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { simularFetch } from '../../test/datos.js';

const cambio = {
  id: 5,
  fuente_id: 3,
  fuente_nombre: 'Fuente ficticia',
  fuente_url: 'https://fuente-ficticia-villavicencio.example/orientacion',
  servicio_id: 3,
  servicio_nombre: 'Línea Municipal Escucha (ficticia)',
  campo: 'telefono',
  valor_anterior: '000-000-0005',
  valor_nuevo: '000-000-0099',
  prioridad: 2,
  estado: 'pendiente',
};

function rutasAdmin(extra = {}) {
  return simularFetch({
    'POST /api/admin/login': { token: 'token-de-prueba', expira_en: '8h', admin: { id: 1, nombre: 'Administrador inicial', email: 'admin@ruta-serena.example' } },
    'GET /api/admin/cambios?estado=pendiente': { total: 1, cambios: [cambio] },
    'GET /api/admin/cambios?estado=todos': { total: 1, cambios: [cambio] },
    'GET /api/admin/reportes': { resumen: [{ servicio_id: 3, total: 2 }], recientes: [] },
    'GET /api/admin/servicios': { total: 1, servicios: [{ id: 17, estado: 'vigente', estado_publico: 'en_revision', vencido: true }] },
    'POST /api/admin/cambios/5/aprobar': { id: 5, estado: 'aprobado', aplicado: true, mensaje: 'Cambio aprobado y aplicado al servicio.' },
    ...extra,
  });
}

describe('panel de administración', () => {
  it('inicia sesión, guarda el token solo en sessionStorage y muestra los cambios pendientes', async () => {
    const fetch = rutasAdmin();
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.type(await screen.findByLabelText('Correo'), 'admin@ruta-serena.example');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'test-secret-clave');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Cambios pendientes', level: 1 })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('rs-admin')).token).toBe('token-de-prueba');
    expect(localStorage.getItem('rs-admin')).toBeNull();

    const fila = (await screen.findByText('Línea Municipal Escucha (ficticia)')).closest('tr');
    expect(within(fila).getByText('000-000-0099')).toBeInTheDocument();
    expect(within(fila).getByText('2')).toBeInTheDocument(); // reportes del servicio

    const llamadaAutenticada = fetch.mock.calls.find(([url]) => String(url).includes('/api/admin/cambios'));
    expect(llamadaAutenticada[1].headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('aprobar un cambio llama a la API y confirma', async () => {
    sessionStorage.setItem('rs-admin', JSON.stringify({ token: 'token-de-prueba', admin: { nombre: 'Admin', email: 'a@b.example' } }));
    const fetch = rutasAdmin();
    render(
      <MemoryRouter initialEntries={['/admin/cambios']}>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Aprobar cambio de telefono/ }));
    expect(await screen.findByText('Cambio aprobado y aplicado al servicio.')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url, init]) => String(url).endsWith('/api/admin/cambios/5/aprobar') && init.method === 'POST')).toBe(true);
  });

  it('si el token venció, vuelve al inicio de sesión', async () => {
    sessionStorage.setItem('rs-admin', JSON.stringify({ token: 'vencido', admin: { nombre: 'Admin', email: 'a@b.example' } }));
    rutasAdmin({ 'GET /api/admin/cambios?estado=pendiente': { __status: 401, cuerpo: { error: 'Tu sesión venció' } } });
    render(
      <MemoryRouter initialEntries={['/admin/cambios']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument();
    expect(sessionStorage.getItem('rs-admin')).toBeNull();
  });
});
