import { enlaceWhatsApp, enlaceTelefono, fechaCorta, haceCuanto, normalizar, saludo } from './formato.js';

describe('formato', () => {
  it('arma enlaces de WhatsApp y teléfono', () => {
    expect(enlaceWhatsApp('000-000-0002')).toBe('https://wa.me/0000000002');
    expect(enlaceWhatsApp('300 000 0000')).toBe('https://wa.me/573000000000');
    expect(enlaceTelefono('(601) 000-0000')).toBe('tel:6010000000');
  });

  it('muestra fechas DATE sin correrlas por zona horaria', () => {
    expect(fechaCorta('2026-10-01')).toBe('1 oct 2026');
  });

  it('calcula hace cuánto', () => {
    const ahora = Date.parse('2026-10-20T12:00:00Z');
    expect(haceCuanto('2026-10-20T10:00:00Z', ahora)).toBe('hace 2 h');
    expect(haceCuanto('2026-10-18T12:00:00Z', ahora)).toBe('hace 2 días');
  });

  it('normaliza tildes y saluda según la hora de Colombia', () => {
    expect(normalizar('Línea Escúcha')).toBe('linea escucha');
    expect(saludo(new Date('2026-10-20T13:00:00Z'))).toBe('Buenos días'); // 8 a. m. en Colombia
    expect(saludo(new Date('2026-10-20T20:00:00Z'))).toBe('Buenas tardes'); // 3 p. m.
    expect(saludo(new Date('2026-10-21T02:00:00Z'))).toBe('Buenas noches'); // 9 p. m.
  });
});
