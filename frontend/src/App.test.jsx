import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { directorio, simularFetch } from './test/datos.js';

const RUTAS_PUBLICAS = ['/', '/apoyo', '/directorio', '/directorio/7', '/mapa', '/asistente', '/actividades', '/ajustes', '/acerca', '/no-existe', '/bienvenida'];

function renderizar(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  );
}

describe('aviso obligatorio en todas las pantallas públicas', () => {
  beforeEach(() => {
    simularFetch({ 'GET /api/directorio.json': directorio, 'GET /api/actividades': { total: 0, actividades: [] } });
  });

  for (const ruta of RUTAS_PUBLICAS) {
    it(`muestra el aviso y el enlace al 123 en ${ruta}`, async () => {
      renderizar(ruta);
      const aviso = await screen.findByRole('complementary', { name: 'Aviso importante' });
      expect(aviso).toHaveTextContent(
        'Ruta Serena no es un servicio de salud. Si tu vida o la de alguien está en peligro, llama al 123.',
      );
      expect(screen.getAllByRole('link', { name: /llama al 123/i })[0]).toHaveAttribute('href', 'tel:123');
    });
  }

  it('el panel de administración no muestra el aviso público y pide iniciar sesión', async () => {
    renderizar('/admin/cambios');
    expect(await screen.findByRole('heading', { name: 'Panel de administración' })).toBeInTheDocument();
  });
});

describe('inicio', () => {
  beforeEach(() => simularFetch({ 'GET /api/directorio.json': directorio }));

  it('tiene buscador, botón "Necesito apoyo ahora" y navegación accesible', async () => {
    renderizar('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Aquí para tu bienestar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Necesito apoyo ahora/ })).toHaveAttribute('href', '/apoyo');
    expect(screen.getByRole('searchbox', { name: 'Buscar servicio, tema o lugar' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al contenido' })).toHaveAttribute('href', '#contenido');
    expect(await screen.findByText(/Última actualización/)).toBeInTheDocument();
  });

  it('la primera vez muestra la bienvenida, que deja ir directo a /apoyo', async () => {
    localStorage.clear();
    renderizar('/');
    expect(await screen.findByRole('heading', { name: 'Un camino hacia más claridad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Necesito apoyo ahora/ })).toHaveAttribute('href', '/apoyo');
  });
});
