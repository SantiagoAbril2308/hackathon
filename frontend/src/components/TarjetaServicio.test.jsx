import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TarjetaServicio from './TarjetaServicio.jsx';
import { servicioEmergencia, servicioChat, simularFetch, cuerpoDe } from '../test/datos.js';

const renderizar = (servicio) =>
  render(
    <MemoryRouter>
      <TarjetaServicio servicio={servicio} />
    </MemoryRouter>,
  );

describe('tarjeta de servicio (CP-01)', () => {
  it('muestra nombre, llamar, WhatsApp, horario, costo, fuente enlazada y fecha de verificación', () => {
    renderizar(servicioEmergencia);
    const tarjeta = screen.getByRole('article', { name: servicioEmergencia.nombre });
    const t = within(tarjeta);
    expect(t.getByRole('link', { name: `Llamar a ${servicioEmergencia.nombre}` })).toHaveAttribute('href', 'tel:0000000001');
    expect(t.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/0000000002');
    expect(t.getByText('Todos los días, 24 horas')).toBeInTheDocument();
    expect(t.getByText('Gratuito')).toBeInTheDocument();
    expect(t.getByRole('link', { name: /fuente-ficticia-nacional\.example/ })).toHaveAttribute('href', servicioEmergencia.url_fuente);
    expect(t.getByText('17 oct 2026')).toHaveAttribute('datetime', '2026-10-17');
    expect(t.getByText('Verificado')).toBeInTheDocument();
    expect(t.getByRole('button', { name: /Este número no funciona/ })).toBeInTheDocument();
  });

  it('sin teléfono ofrece abrir el chat web; sin WhatsApp no muestra ese botón', () => {
    renderizar(servicioChat);
    expect(screen.getByRole('link', { name: /Abrir chat/ })).toHaveAttribute('href', servicioChat.canales[0].valor);
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('marca los servicios en revisión', () => {
    renderizar({ ...servicioEmergencia, estado: 'en_revision', mensaje_estado: 'Estamos revisando esta información.' });
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('Estamos revisando esta información.')).toBeInTheDocument();
  });

  it('"Este número no funciona" envía un reporte anónimo con el canal y el motivo', async () => {
    const fetch = simularFetch({ 'POST /api/reportes': { ok: true } });
    renderizar(servicioEmergencia);
    await userEvent.click(screen.getByRole('button', { name: /Este número no funciona/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'El número está equivocado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar aviso' }));
    expect(await screen.findByText(/Gracias por avisarnos/)).toBeInTheDocument();
    expect(cuerpoDe(fetch)).toEqual({ servicio_id: 1, canal_id: 1, motivo: 'numero_errado' });
  });
});
