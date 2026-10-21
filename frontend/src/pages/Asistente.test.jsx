import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Asistente from './Asistente.jsx';
import { servicioPresencial, servicioEmergencia, simularFetch, cuerpoDe } from '../test/datos.js';

const renderizar = () =>
  render(
    <MemoryRouter>
      <Asistente />
    </MemoryRouter>,
  );

async function escribir(texto) {
  await userEvent.type(screen.getByRole('textbox', { name: 'Escribe un mensaje' }), texto);
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
}

describe('asistente', () => {
  it('siempre muestra que no es un profesional de salud y un botón fijo de líneas de emergencia', () => {
    renderizar();
    expect(screen.getByRole('note')).toHaveTextContent('Soy un asistente de información, no un profesional de salud.');
    expect(screen.getByRole('link', { name: 'Líneas de emergencia' })).toHaveAttribute('href', '/apoyo');
  });

  it('CP-07: envía el mensaje y muestra la respuesta con tarjetas de servicios', async () => {
    const fetch = simularFetch({
      'POST /api/chat': { origen: 'asistente', emergencia: false, mensaje: 'Este servicio puede orientarte.', servicios: [servicioPresencial] },
    });
    renderizar();
    await escribir('Perdí a mi abuela');
    expect(await screen.findByText('Este servicio puede orientarte.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Centro de Escucha Barzal (ficticio)' })).toBeInTheDocument();
    expect(cuerpoDe(fetch)).toEqual({ mensaje: 'Perdí a mi abuela', historial: [] });
  });

  it('envía el historial de la conversación (sin el saludo inicial)', async () => {
    const fetch = simularFetch({ 'POST /api/chat': { emergencia: false, mensaje: 'Respuesta.', servicios: [] } });
    renderizar();
    await escribir('Hola');
    await screen.findByText('Respuesta.');
    await escribir('Gracias');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(cuerpoDe(fetch, 1).historial).toEqual([
      { rol: 'usuario', texto: 'Hola' },
      { rol: 'asistente', texto: 'Respuesta.' },
    ]);
  });

  it('CP-09: en una emergencia muestra el botón para llamar al 123', async () => {
    simularFetch({
      'POST /api/chat': { origen: 'emergencia', emergencia: true, mensaje: 'Gracias por contarlo. Llama al 123.', servicios: [servicioEmergencia] },
    });
    renderizar();
    await escribir('No quiero vivir');
    expect(await screen.findByRole('link', { name: 'Llamar al 123' })).toHaveAttribute('href', 'tel:123');
  });

  it('si la API falla, ofrece las líneas de apoyo', async () => {
    simularFetch({ 'POST /api/chat': new TypeError('Failed to fetch') });
    renderizar();
    await escribir('Hola');
    expect(await screen.findByText(/No pude responder en este momento/, { selector: 'p.burbuja' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver líneas de apoyo' })).toHaveAttribute('href', '/apoyo');
  });

  it('no guarda la conversación en el navegador', async () => {
    simularFetch({ 'POST /api/chat': { emergencia: false, mensaje: 'Respuesta.', servicios: [] } });
    const local = vi.spyOn(Storage.prototype, 'setItem');
    const abrirIdb = vi.spyOn(indexedDB, 'open');
    renderizar();
    await escribir('Me siento con ansiedad');
    await screen.findByText('Respuesta.');
    expect(local).not.toHaveBeenCalled();
    expect(abrirIdb).not.toHaveBeenCalled();
  });
});
