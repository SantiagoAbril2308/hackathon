import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Apoyo from './Apoyo.jsx';
import { guardarDirectorio, leerDirectorio } from '../services/almacen.js';
import { directorio, simularFetch } from '../test/datos.js';

const renderizar = () =>
  render(
    <MemoryRouter>
      <Apoyo />
    </MemoryRouter>,
  );

describe('/apoyo', () => {
  it('muestra el 123 de inmediato, sin esperar datos', () => {
    simularFetch({ 'GET /api/directorio.json': () => new Promise(() => {}) }); // la red nunca responde
    renderizar();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Llamar al 123' })).toHaveAttribute('href', 'tel:123');
  });

  it('con conexión carga las líneas y guarda la copia en IndexedDB', async () => {
    simularFetch({ 'GET /api/directorio.json': directorio });
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Línea Serena Nacional (ficticia)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chat Juvenil Amanecer (ficticio)' })).toBeInTheDocument();
    // Los servicios presenciales no se muestran como "líneas".
    expect(screen.queryByRole('heading', { name: 'Centro de Escucha Barzal (ficticio)' })).not.toBeInTheDocument();
    expect((await leerDirectorio()).datos.generado_en).toBe(directorio.generado_en);
  });

  it('CP-05: sin conexión usa la copia guardada y muestra la fecha de la última actualización', async () => {
    await guardarDirectorio(directorio);
    simularFetch({ 'GET /api/directorio.json': new TypeError('Failed to fetch') });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Línea Serena Nacional (ficticia)' })).toBeInTheDocument();
    expect(screen.getByText('Sin conexión: usando la copia guardada')).toBeInTheDocument();
    expect(screen.getByText(/Última actualización/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sin conexión y sin copia: el 123 sigue disponible y lo explica', async () => {
    simularFetch({ 'GET /api/directorio.json': new TypeError('Failed to fetch') });
    renderizar();
    expect(await screen.findByRole('alert')).toHaveTextContent('El 123 siempre está disponible');
    expect(screen.getByRole('link', { name: 'Llamar al 123' })).toBeInTheDocument();
  });

  it('filtra entre líneas nacionales y del Meta', async () => {
    simularFetch({ 'GET /api/directorio.json': directorio });
    renderizar();
    await screen.findByRole('heading', { name: 'Líneas nacionales' });
    await userEvent.click(screen.getByRole('button', { name: 'Meta' }));
    expect(screen.queryByRole('heading', { name: 'Líneas nacionales' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meta' })).toHaveAttribute('aria-pressed', 'true');
  });
});
