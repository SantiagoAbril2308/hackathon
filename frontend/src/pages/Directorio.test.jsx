import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Directorio, { filtrarServicios } from './Directorio.jsx';
import { directorio, simularFetch } from '../test/datos.js';

describe('filtros del directorio', () => {
  const servicios = directorio.servicios;

  it('busca sin distinguir tildes ni mayúsculas', () => {
    expect(filtrarServicios(servicios, { q: 'BARZAL' }).map((s) => s.id)).toEqual([7]);
    expect(filtrarServicios(servicios, { q: 'linea serena' }).map((s) => s.id)).toEqual([1]);
  });

  it('combina tema, público y modalidad', () => {
    expect(filtrarServicios(servicios, { tema: 'ansiedad', publico: 'jovenes' }).map((s) => s.id)).toEqual([1, 4]);
    expect(filtrarServicios(servicios, { modalidad: 'presencial' }).map((s) => s.id)).toEqual([7]);
  });
});

describe('pantalla del directorio', () => {
  it('filtra con los chips de tema y anuncia el número de resultados', async () => {
    simularFetch({ 'GET /api/directorio.json': directorio });
    render(
      <MemoryRouter initialEntries={['/directorio']}>
        <Directorio />
      </MemoryRouter>,
    );
    expect(await screen.findByText('3 servicios encontrados')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Duelo' }));
    expect(screen.getByText('1 servicio encontrado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Centro de Escucha Barzal (ficticio)' })).toBeInTheDocument();
  });
});
