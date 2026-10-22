import { describe, it, expect } from 'vitest';
import { extraerTelefonos, soloDigitos } from '../src/utils/telefonos.js';
import { parsearRobots, rutaPermitida } from '../src/utils/robots.js';
import { dominioPermitido, crearLimitadorPorDominio, calcularCambios, normalizarTexto, sha256 } from '../src/services/scraper.js';
import { USER_AGENT, INTERVALO_POR_DOMINIO_MS, LISTA_BLANCA_POR_DEFECTO } from '../src/config/scraper.js';

// Números con formato colombiano válido pero rellenos de ceros (no corresponden a líneas reales).
describe('extracción de teléfonos colombianos', () => {
  const valores = (texto, op) => extraerTelefonos(texto, op).map((t) => `${t.tipo}:${t.valor}`);

  it('detecta fijos de 10 dígitos que empiezan con 60, con distintos formatos', () => {
    expect(valores('Fijo 601 000 0000 o (608) 000-0000 o +57 604.000.0000')).toEqual([
      'fijo:601 000 0000',
      'fijo:608 000 0000',
      'fijo:604 000 0000',
    ]);
  });

  it('detecta celulares de 10 dígitos que empiezan con 3', () => {
    expect(valores('Escríbenos al 300 000 0000 o al +573100000000')).toEqual(['celular:300 000 0000', 'celular:310 000 0000']);
  });

  it('detecta líneas cortas de 3 dígitos, incluso al final de una frase', () => {
    expect(valores('Si estás en peligro llama al 123.')).toEqual(['corta:123']);
  });

  it('no confunde fechas, precios, direcciones ni números largos', () => {
    expect(valores('Actualizado 2026-10-20. Costo $ 300.000. Calle 123A. Radicado 1234567. Código 12345')).toEqual([]);
  });

  it('no toma partes de un fijo o celular como línea corta', () => {
    expect(valores('Llama al 601 000 0000')).toEqual(['fijo:601 000 0000']);
  });

  it('solo reconoce el formato sintético 000-000-00XX si se activa', () => {
    expect(valores('Línea 000-000-0005')).toEqual([]);
    expect(valores('Línea 000-000-0005', { aceptarSinteticos: true })).toEqual(['sintetico:000-000-0005']);
  });

  it('quita duplicados y compara solo dígitos (con o sin +57)', () => {
    expect(extraerTelefonos('300 000 0000 y 3000000000')).toHaveLength(1);
    expect(soloDigitos('+57 300 000 0000')).toBe(soloDigitos('300-000-0000'));
  });
});

describe('robots.txt', () => {
  const robots = parsearRobots(`
    # comentario
    User-agent: *
    Disallow: /privado
    Allow: /privado/publico
    Disallow: /*.pdf$

    User-agent: OtroBot
    Disallow: /
  `);

  it('aplica el grupo * cuando no hay uno para RutaSerenaBot', () => {
    expect(rutaPermitida(robots, USER_AGENT, '/lineas')).toBe(true);
    expect(rutaPermitida(robots, USER_AGENT, '/privado/datos')).toBe(false);
    expect(rutaPermitida(robots, USER_AGENT, '/privado/publico/x')).toBe(true);
    expect(rutaPermitida(robots, USER_AGENT, '/docs/guia.pdf')).toBe(false);
    expect(rutaPermitida(robots, USER_AGENT, '/docs/guia.pdf?v=2')).toBe(true);
  });

  it('respeta un grupo específico para RutaSerenaBot', () => {
    const propio = parsearRobots('User-agent: *\nAllow: /\n\nUser-agent: RutaSerenaBot\nDisallow: /');
    expect(rutaPermitida(propio, USER_AGENT, '/lineas')).toBe(false);
  });

  it('sin reglas todo está permitido', () => {
    expect(rutaPermitida(parsearRobots(''), USER_AGENT, '/x')).toBe(true);
  });
});

describe('lista blanca', () => {
  const lista = ['meta.gov.co'];
  it('acepta el dominio y sus subdominios', () => {
    expect(dominioPermitido('meta.gov.co', lista)).toBe(true);
    expect(dominioPermitido('www.meta.gov.co', lista)).toBe(true);
    expect(dominioPermitido('WWW.META.GOV.CO.', lista)).toBe(true);
  });
  it('rechaza dominios parecidos', () => {
    expect(dominioPermitido('evilmeta.gov.co', lista)).toBe(false);
    expect(dominioPermitido('meta.gov.co.evil.example', lista)).toBe(false);
    expect(dominioPermitido('gov.co', lista)).toBe(false);
  });
  it('la configuración por defecto usa solo dominios .gov.co, 5 s y el user-agent pedido', () => {
    expect(LISTA_BLANCA_POR_DEFECTO.every((d) => d.endsWith('.gov.co'))).toBe(true);
    expect(INTERVALO_POR_DOMINIO_MS).toBe(5000);
    expect(USER_AGENT).toBe('RutaSerenaBot/1.0');
  });
});

describe('límite de 1 solicitud cada N ms por dominio', () => {
  it('espera entre solicitudes al mismo dominio y no entre dominios distintos', async () => {
    let reloj = 0;
    const esperas = [];
    const turno = crearLimitadorPorDominio(5000, {
      ahora: () => reloj,
      dormir: async (ms) => {
        esperas.push(ms);
        reloj += ms;
      },
    });
    // Cada "solicitud" pide su turno y libera el dominio al terminar.
    const solicitar = async (dominio) => (await turno(dominio))();
    await Promise.all([solicitar('a.gov.co'), solicitar('a.gov.co'), solicitar('b.gov.co'), solicitar('a.gov.co')]);
    expect(esperas).toEqual([5000, 5000]); // solo el 2.º y 3.º de a.gov.co esperan
  });
});

describe('cálculo de cambios (sin efectos)', () => {
  const conocidos = [
    { servicio_id: 3, tipo: 'telefono', valor: '000-000-0005', es_emergencia: false },
    { servicio_id: 1, tipo: 'telefono', valor: '000-000-0001', es_emergencia: true },
  ];
  const t = (valor) => ({ tipo: 'sintetico', valor, digitos: soloDigitos(valor) });

  it('empareja un teléfono que desapareció con uno nuevo', () => {
    const cambios = calcularCambios({
      conocidos,
      encontrados: [t('000-000-0099'), t('000-000-0001')],
      primeraLectura: false,
      texto: 'x',
      ultimoHash: 'h',
    });
    expect(cambios).toEqual([
      { servicio_id: 3, campo: 'telefono', valor_anterior: '000-000-0005', valor_nuevo: '000-000-0099', prioridad: 2 },
    ]);
  });

  it('da más prioridad a los servicios de emergencia', () => {
    const [c] = calcularCambios({
      conocidos,
      encontrados: [t('000-000-0005')],
      primeraLectura: false,
      texto: 'x',
      ultimoHash: 'h',
    });
    expect(c).toMatchObject({ servicio_id: 1, valor_nuevo: null, prioridad: 7 });
  });

  it('en la primera lectura no propone números sueltos', () => {
    const cambios = calcularCambios({
      conocidos,
      encontrados: [t('000-000-0005'), t('000-000-0001'), t('000-000-0088')],
      primeraLectura: true,
      texto: 'x',
      ultimoHash: null,
    });
    expect(cambios).toEqual([]);
  });

  it('si cambió el texto pero no los teléfonos, propone revisar el bloque', () => {
    const [c] = calcularCambios({
      conocidos,
      encontrados: [t('000-000-0005'), t('000-000-0001')],
      primeraLectura: false,
      texto: 'Nuevo horario',
      ultimoHash: 'abc',
    });
    expect(c).toMatchObject({ campo: 'bloque', servicio_id: null, valor_anterior: 'sha256:abc', valor_nuevo: 'Nuevo horario' });
  });
});

describe('texto y hash', () => {
  it('normaliza espacios para que el hash no cambie por formato', () => {
    expect(sha256(normalizarTexto('  Línea  municipal \n\n  000 '))).toBe(sha256('Línea municipal\n000'));
    expect(sha256('x')).toMatch(/^[a-f0-9]{64}$/);
  });
});
