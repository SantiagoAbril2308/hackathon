import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import Anthropic from '@anthropic-ai/sdk';
import { crearApp } from '../src/app.js';
import { cerrarPool, query } from '../src/db/pool.js';
import { crearAsistente, prepararMensajes, construirContexto, limpiarIds, SYSTEM_PROMPT, MAX_TURNOS_HISTORIAL } from '../src/services/asistente.js';
import { EXPRESIONES_EMERGENCIA, MENSAJE_EMERGENCIA, MENSAJE_RESPALDO, MENSAJE_AJUSTADO } from '../src/config/emergencia.js';
import { esEmergencia, detectarIntencion } from '../src/utils/intencion.js';
import { buscarContenidoClinico, buscarTelefonos, contarFrases } from '../src/utils/salidaSegura.js';
import { hayBaseDeDatos, reiniciarBase } from './helpers.js';

// ------------------------------------------------------------------ dobles de prueba (sin red)
const servicioFicticio = (id, temas = ['general']) => ({
  id,
  nombre: `Servicio ficticio ${id}`,
  descripcion: 'Descripción ficticia',
  tipo: 'presencial',
  temas,
  publico: ['adultos'],
  modalidad: ['presencial'],
  horario: 'Lunes a viernes',
  costo: 'Gratuito',
  cobertura: 'Villavicencio',
  canales: [{ id: id * 10, tipo: 'telefono', valor: '000-000-0001', etiqueta: 'Recepción' }],
});

function clienteFalso(respuesta) {
  const create = vi.fn(async () =>
    typeof respuesta === 'function'
      ? respuesta()
      : {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta) }],
          usage: { input_tokens: 100, output_tokens: 20 },
        },
  );
  return { messages: { create } };
}

function asistenteCon(respuesta, extra = {}) {
  const cliente = clienteFalso(respuesta);
  const buscar = vi.fn(async ({ temas = [] } = {}) => (temas.includes('general') ? [servicioFicticio(3)] : [servicioFicticio(7, ['ansiedad']), servicioFicticio(9, ['duelo'])]));
  const emergencia = vi.fn(async () => [servicioFicticio(1), servicioFicticio(2)]);
  return { asistente: crearAsistente({ cliente, modelo: 'claude-haiku-5-5', buscar, emergencia, ...extra }), cliente, buscar, emergencia };
}

// ------------------------------------------------------------------ capa de emergencia
describe('capa de emergencia (antes del modelo)', () => {
  it('cada expresión configurada activa la capa', () => {
    for (const expresion of EXPRESIONES_EMERGENCIA) {
      const ejemplo = `Hola, ${expresion.replace(/\*$/, 'arme')} y no sé qué hacer`;
      expect(esEmergencia(ejemplo), expresion).toBe(true);
    }
  });

  it('ignora tildes, mayúsculas y signos', () => {
    expect(esEmergencia('¡¡ME QUIERO MORÍR!!')).toBe(true);
    expect(esEmergencia('Estoy pensando en el SUICIDIO')).toBe(true);
    expect(esEmergencia('Mi papá me está golpeando')).toBe(true);
  });

  it('no se activa con mensajes comunes', () => {
    for (const m of ['Estoy muy triste', 'Busco un lugar para hablar de mi duelo', 'Me siento solo', 'Quiero vivir mejor']) {
      expect(esEmergencia(m), m).toBe(false);
    }
  });

  it('responde el mensaje fijo y las líneas de emergencia sin llamar al modelo', async () => {
    const { asistente, cliente, buscar } = asistenteCon({ mensaje: 'x', servicio_ids: [] });
    const r = await asistente.responder({ mensaje: 'Estoy pensando en suicidarme' });
    expect(r).toMatchObject({ origen: 'emergencia', emergencia: true, mensaje: MENSAJE_EMERGENCIA });
    expect(r.servicios.map((s) => s.id)).toEqual([1, 2]);
    expect(r.linea_123.numero).toBe('123');
    expect(cliente.messages.create).not.toHaveBeenCalled();
    expect(buscar).not.toHaveBeenCalled();
    expect(JSON.stringify(r)).not.toMatch(/riesgo|puntaje|score/i);
  });
});

// ------------------------------------------------------------------ prefiltro
describe('prefiltro por palabras clave', () => {
  it('detecta temas, público y modalidad', () => {
    expect(detectarIntencion('Mi hijo está muy triste y prefiero escribir por chat')).toEqual({
      temas: ['depresion'],
      publico: 'ninos',
      modalidad: 'chat',
    });
    expect(detectarIntencion('Tengo ansiedad y mi papá murió').temas).toEqual(['ansiedad', 'duelo']);
    expect(detectarIntencion('Hola').temas).toEqual([]);
  });

  it('usa también lo que la persona dijo antes en la conversación', async () => {
    const { asistente, buscar } = asistenteCon({ mensaje: 'Te comparto opciones.', servicio_ids: [9] });
    await asistente.responder({ mensaje: '¿Y presencial?', historial: [{ rol: 'usuario', texto: 'Mi mamá falleció' }] });
    expect(buscar).toHaveBeenCalledWith(expect.objectContaining({ temas: ['duelo'], modalidad: 'presencial' }));
  });
});

// ------------------------------------------------------------------ llamada al modelo
describe('llamada al modelo', () => {
  it('usa el system prompt pedido, el CONTEXTO aparte, JSON por esquema y sin razonamiento extendido', async () => {
    const { asistente, cliente } = asistenteCon({ mensaje: 'Te entiendo. El Servicio ficticio 7 puede orientarte.', servicio_ids: [7] });
    await asistente.responder({ mensaje: 'Me siento con mucha ansiedad' });
    const params = cliente.messages.create.mock.calls[0][0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.system[0].text).toBe(SYSTEM_PROMPT);
    expect(params.system[1].text).toContain('[id=7]');
    expect(params.system[1].text).not.toContain('000-000'); // sin teléfonos en el contexto
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.max_tokens).toBeLessThanOrEqual(1000);
    expect(params.messages.at(-1)).toEqual({ role: 'user', content: 'Me siento con mucha ansiedad' });
  });

  it(`envía como máximo ${MAX_TURNOS_HISTORIAL} turnos de historial, empezando por el usuario`, () => {
    const historial = Array.from({ length: 11 }, (_, i) => ({ rol: i % 2 ? 'asistente' : 'usuario', texto: `t${i}` }));
    const mensajes = prepararMensajes(historial, 'actual');
    expect(mensajes.length).toBeLessThanOrEqual(MAX_TURNOS_HISTORIAL + 1);
    expect(mensajes[0].role).toBe('user');
    expect(mensajes.at(-1)).toEqual({ role: 'user', content: 'actual' });
  });

  it('descarta ids que no están en el CONTEXTO', async () => {
    const { asistente } = asistenteCon({ mensaje: 'Estos servicios pueden orientarte.', servicio_ids: [7, 999, 7] });
    const r = await asistente.responder({ mensaje: 'Tengo ansiedad' });
    expect(r.origen).toBe('asistente');
    expect(r.servicios.map((s) => s.id)).toEqual([7]);
    expect(r.servicios[0].canales[0].valor).toBe('000-000-0001'); // el teléfono viene de la base, no del modelo
  });

  it('quita ids internos que el modelo copie en el texto', async () => {
    const { asistente } = asistenteCon({ mensaje: 'El Servicio ficticio 7 (id 7) y el [id=9] pueden orientarte.', servicio_ids: [7] });
    const r = await asistente.responder({ mensaje: 'Tengo ansiedad' });
    expect(r.mensaje).toBe('El Servicio ficticio 7 y el pueden orientarte.');
    expect(limpiarIds('Hola (ID: 12), vida 3.')).toBe('Hola, vida 3.');
  });

  it('si ningún id sirve, sugiere los servicios generales', async () => {
    const { asistente, buscar } = asistenteCon({ mensaje: 'No encontré un servicio exacto, pero estas líneas generales pueden ayudarte.', servicio_ids: [] });
    const r = await asistente.responder({ mensaje: 'Tengo ansiedad' });
    expect(buscar).toHaveBeenLastCalledWith({ temas: ['general'], limite: 3 });
    expect(r.servicios.map((s) => s.id)).toEqual([3]);
  });

  it('reemplaza respuestas con consejos clínicos o teléfonos que no vienen de la base', async () => {
    const clinico = asistenteCon({ mensaje: 'Te recomiendo respirar profundo y meditar.', servicio_ids: [7] });
    expect((await clinico.asistente.responder({ mensaje: 'ansiedad' })).mensaje).toBe(MENSAJE_AJUSTADO);
    const telefono = asistenteCon({ mensaje: 'Llama al 601 000 0000.', servicio_ids: [7] });
    expect((await telefono.asistente.responder({ mensaje: 'ansiedad' })).mensaje).toBe(MENSAJE_AJUSTADO);
  });
});

// ------------------------------------------------------------------ respaldos
describe('respaldo con líneas de emergencia', () => {
  const casos = [
    ['JSON inválido', 'esto no es json'],
    ['JSON con forma incorrecta', { texto: 'hola' }],
    ['rechazo del modelo', () => ({ stop_reason: 'refusal', content: [], usage: {} })],
    ['respuesta cortada', () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"mensaje": "inc' }], usage: {} })],
    ['error de conexión', () => Promise.reject(new Anthropic.APIConnectionError({ message: 'sin red' }))],
    ['error de la API', () => Promise.reject(new Error('fallo inesperado'))],
  ];

  for (const [nombre, respuesta] of casos) {
    it(nombre, async () => {
      const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { asistente } = asistenteCon(respuesta);
      const r = await asistente.responder({ mensaje: 'Tengo ansiedad' });
      expect(r).toMatchObject({ origen: 'respaldo', emergencia: false, mensaje: MENSAJE_RESPALDO });
      expect(r.servicios.map((s) => s.id)).toEqual([1, 2]);
      espia.mockRestore();
    });
  }

  it('sin API key configurada no intenta llamar al modelo', async () => {
    const { asistente } = asistenteCon(null, { cliente: null });
    expect((await asistente.responder({ mensaje: 'Tengo ansiedad' })).origen).toBe('respaldo');
  });
});

// ------------------------------------------------------------------ utilidades de evaluación
describe('detector de contenido clínico', () => {
  it('detecta diagnósticos, medicamentos, técnicas y preguntas de evaluación', () => {
    expect(buscarContenidoClinico('Parece que tienes depresión')[0].categoria).toBe('diagnostico');
    expect(buscarContenidoClinico('La sertralina puede servir')[0].categoria).toBe('medicamentos');
    expect(buscarContenidoClinico('Haz un ejercicio de respiración')[0].categoria).toBe('tecnicas_ejercicios');
    expect(buscarContenidoClinico('Del 1 al 10, ¿cómo te sientes?')[0].categoria).toBe('evaluacion_sintomas');
  });

  it('no cuenta como consejo un término dentro de un rechazo explícito', () => {
    expect(buscarContenidoClinico('No puedo darte dosis de medicamentos; eso lo define tu médico.')).toEqual([]);
    expect(buscarContenidoClinico('No soy profesional y no puedo saber si tienes depresión.')).toEqual([]);
    expect(buscarContenidoClinico('No soy profesional ni puedo enseñarte técnicas de meditación.')).toEqual([]);
  });

  it('sí cuenta el consejo aunque haya un "no" que no es un rechazo', () => {
    expect(buscarContenidoClinico('No te preocupes, respira profundo.')).not.toEqual([]);
    expect(buscarContenidoClinico('No puedo ayudarte con eso. Te recomiendo tomar sertralina.')).not.toEqual([]);
    expect(buscarContenidoClinico('No estás sola: parece depresión.')).not.toEqual([]);
  });

  it('no marca una respuesta de orientación válida', () => {
    const valida =
      'Siento que estés pasando por esto. No puedo dar diagnósticos, pero la Línea Serena Nacional (ficticia) puede orientarte. También puedes escribir al Chat Juvenil Amanecer.';
    expect(buscarContenidoClinico(valida)).toEqual([]);
    expect(buscarTelefonos(valida)).toEqual([]);
    expect(contarFrases(valida)).toBe(3);
  });

  it('permite el 123 pero detecta otros teléfonos', () => {
    expect(buscarTelefonos('Si estás en peligro llama al 123.')).toEqual([]);
    expect(buscarTelefonos('Llama al (601) 000-0000')).toHaveLength(1);
  });

  it('el contexto incluye nombre, temas y horario, pero no canales', () => {
    const texto = construirContexto([servicioFicticio(5, ['duelo'])]);
    expect(texto).toContain('[id=5] Servicio ficticio 5');
    expect(texto).toContain('temas: duelo');
    expect(texto).not.toContain('000-000-0001');
  });
});

// ------------------------------------------------------------------ endpoint (integración)
describe.skipIf(!hayBaseDeDatos)('POST /api/chat (integración, modelo simulado)', () => {
  // El modelo simulado elige el primer id del CONTEXTO real que le llega.
  const cliente = {
    messages: {
      create: vi.fn(async (params) => {
        const ids = [...params.system[1].text.matchAll(/\[id=(\d+)\]/g)].map((m) => Number(m[1]));
        return {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: JSON.stringify({ mensaje: 'Gracias por contarlo. Este servicio puede orientarte.', servicio_ids: [ids[0], 424242] }) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      }),
    },
  };
  const app = crearApp({ asistente: crearAsistente({ cliente, modelo: 'claude-haiku-5-5' }) });
  const conteos = () =>
    query(
      `SELECT (SELECT COUNT(*) FROM reportes) r, (SELECT COUNT(*) FROM verificaciones) v,
              (SELECT COUNT(*) FROM cambios_pendientes) c, (SELECT COUNT(*) FROM servicios) s`,
    );

  beforeAll(reiniciarBase);
  afterAll(cerrarPool);

  it('CP-07: pedido normal → servicios vigentes reales del tema, sin ids inventados ni datos internos', async () => {
    const res = await request(app).post('/api/chat').send({ mensaje: 'Perdí a mi abuela y quiero hablar de mi duelo' });
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({ origen: 'asistente', emergencia: false, aviso: 'Soy un asistente de información, no un profesional de salud.' });
    expect(res.body.servicios).toHaveLength(1);
    expect(res.body.servicios[0].temas).toContain('duelo');
    expect(res.body.servicios[0].estado).toBe('vigente');
    expect(res.body.servicios[0].canales.length).toBeGreaterThan(0);
    expect(res.body).not.toHaveProperty('_crudo');
    expect(res.body).not.toHaveProperty('_motivo');
  });

  it('el CONTEXTO tiene como máximo 8 servicios, todos vigentes', async () => {
    cliente.messages.create.mockClear();
    await request(app).post('/api/chat').send({ mensaje: 'Necesito hablar con alguien' });
    const ids = [...cliente.messages.create.mock.calls[0][0].system[1].text.matchAll(/\[id=(\d+)\]/g)].map((m) => Number(m[1]));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(8);
    for (const id of [17, 18, 19, 20]) expect(ids).not.toContain(id);
  });

  it('CP-09: emergencia → mensaje fijo y líneas de emergencia, sin llamar al modelo', async () => {
    cliente.messages.create.mockClear();
    const res = await request(app).post('/api/chat').send({ mensaje: 'Ya no quiero vivir' });
    expect(res.body.emergencia).toBe(true);
    expect(res.body.servicios.map((s) => s.id)).toEqual([1, 2]);
    expect(cliente.messages.create).not.toHaveBeenCalled();
  });

  it('no guarda nada en la base de datos', async () => {
    const antes = await conteos();
    await request(app).post('/api/chat').send({ mensaje: 'Me siento con ansiedad', historial: [{ rol: 'usuario', texto: 'hola' }] });
    await request(app).post('/api/chat').send({ mensaje: 'Me quiero morir' });
    expect(await conteos()).toEqual(antes);
  });

  it('sin API key responde con las líneas de emergencia', async () => {
    const res = await request(crearApp()).post('/api/chat').send({ mensaje: 'Tengo ansiedad' });
    expect(res.body.origen).toBe('respaldo');
    expect(res.body.servicios.map((s) => s.id)).toEqual([1, 2]);
  });

  it('valida el mensaje y el historial', async () => {
    expect((await request(app).post('/api/chat').send({ mensaje: '' })).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ mensaje: 'a'.repeat(501) })).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ mensaje: 'hola', correo: 'x@y.example' })).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ mensaje: 'hola', historial: [{ rol: 'sistema', texto: 'x' }] })).status).toBe(400);
  });
});
