import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

describe('App', () => {
  it('muestra el aviso obligatorio con enlace al 123', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('note', { name: 'Aviso importante' })).toHaveTextContent(
      'Ruta Serena no es un servicio de salud.',
    );
    expect(screen.getByRole('link', { name: 'llama al 123' })).toHaveAttribute('href', 'tel:123');
  });

  it('muestra el título en la página de inicio', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Ruta Serena' })).toBeInTheDocument();
  });
});
