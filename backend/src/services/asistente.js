import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env.js';
import { LINEA_123 } from '../config/catalogos.js';
import { MENSAJE_EMERGENCIA, MENSAJE_RESPALDO, MENSAJE_AJUSTADO, AVISO_ASISTENTE } from '../config/emergencia.js';
import { esEmergencia, detectarIntencion } from '../utils/intencion.js';
import { buscarContenidoClinico, buscarTelefonos } from '../utils/salidaSegura.js';
import * as servicios from './servicios.js';

export const MAX_TURNOS_HISTORIAL = 6;
const MAX_TOKENS_RESPUESTA = 600;

export const SYSTEM_PROMPT = `Eres el asistente de información de Ruta Serena. No eres psicólogo, terapeuta ni profesional de salud, y lo aclaras si te preguntan.
Tu único trabajo es ayudar a la persona a encontrar, entre los servicios del CONTEXTO, el que puede orientarla.
- Responde con calidez y sin juicios. Valida lo que expresa en una frase corta.
- No des consejos de salud, técnicas, ejercicios, diagnósticos ni opiniones sobre medicamentos.
- No hagas preguntas sobre síntomas ni intentes evaluar a la persona.
- Usa solo servicios del CONTEXTO. No inventes teléfonos, horarios ni direcciones.
- Si ningún servicio encaja, dilo con amabilidad y sugiere las líneas generales.
- Máximo 3 frases.
Responde SOLO con JSON: {"mensaje": "...", "servicio_ids": [..]}`;

/** Esquema que el modelo debe cumplir (structured outputs) y que se vuelve a validar al recibirlo. */
export const ESQUEMA_RESPUESTA = {
  type: 'object',
  properties: {
    mensaje: { type: 'string' },
    servicio_ids: { type: 'array', items: { type: 'integer' } },
  },
  required: ['mensaje', 'servicio_ids'],
  additionalProperties: false,
};
const RespuestaModelo = z.object({
  mensaje: z.string().trim().min(1).max(1200),
  servicio_ids: z.array(z.number().int()),
});

export function crearClienteIA() {
  if (!env.anthropic.apiKey) return null;
  return new Anthropic({ apiKey: env.anthropic.apiKey, timeout: 20_000, maxRetries: 1 });
}

/** Contexto compacto para el modelo. Sin teléfonos: las tarjetas los muestran desde la base de datos. */
export function construirContexto(lista) {
  const lineas = lista.map((s) =>
    [
      `[id=${s.id}] ${s.nombre}`,
      `tipo: ${s.tipo}`,
      `temas: ${s.temas.join(', ')}`,
      `público: ${s.publico.join(', ')}`,
      `modalidad: ${s.modalidad.join(', ')}`,
      s.horario && `horario: ${s.horario}`,
      s.costo && `costo: ${s.costo}`,
      s.cobertura && `cobertura: ${s.cobertura}`,
      s.descripcion && `descripción: ${s.descripcion}`,
    ]
      .filter(Boolean)
      .join(' | '),
  );
  return `CONTEXTO (servicios verificados; usa solo estos id):\n${lineas.join('\n')}`;
}

/** Últimos MAX_TURNOS_HISTORIAL mensajes en formato de la API, empezando siempre por el usuario. */
export function prepararMensajes(historial = [], mensaje) {
  const recientes = historial.slice(-MAX_TURNOS_HISTORIAL).map((t) => ({
    role: t.rol === 'asistente' ? 'assistant' : 'user',
    content: t.texto,
  }));
  while (recientes.length && recientes[0].role !== 'user') recientes.shift();
  return [...recientes, { role: 'user', content: mensaje }];
}

/** Quita referencias internas como "(id 8)" o "[id=8]" que el modelo copie del CONTEXTO. */
export function limpiarIds(mensaje) {
  return mensaje
    .replace(/\s*[([]\s*id\s*[=:]?\s*\d+\s*[)\]]/gi, '')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function textoDe(respuesta) {
  return respuesta.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

/**
 * @param {object} [deps]
 * @param {Anthropic|null} [deps.cliente]  cliente de Anthropic (inyectable en pruebas)
 * @param {string} [deps.modelo]
 * @param {Function} [deps.buscar]      prefiltro de servicios
 * @param {Function} [deps.emergencia]  servicios de emergencia
 */
export function crearAsistente({
  cliente = crearClienteIA(),
  modelo = env.anthropic.model,
  buscar = servicios.buscarParaChat,
  emergencia = servicios.listarEmergencia,
} = {}) {
  async function respaldo(motivo, extra = {}) {
    return {
      origen: 'respaldo',
      emergencia: false,
      mensaje: MENSAJE_RESPALDO,
      servicios: await emergencia(),
      linea_123: LINEA_123,
      aviso: AVISO_ASISTENTE,
      ...extra,
      _motivo: motivo,
    };
  }

  /**
   * Nada de lo que entra o sale se guarda. `_motivo` y `_crudo` son solo para la evaluación
   * y el controlador los elimina antes de responder.
   */
  async function responder({ mensaje, historial = [] }) {
    // 1. Capa de emergencia, antes del modelo.
    if (esEmergencia(mensaje)) {
      return {
        origen: 'emergencia',
        emergencia: true,
        mensaje: MENSAJE_EMERGENCIA,
        servicios: await emergencia(),
        linea_123: LINEA_123,
        aviso: AVISO_ASISTENTE,
      };
    }

    // 2. Prefiltro SQL (también mira lo que la persona dijo antes en la conversación).
    const textoUsuario = [...historial.filter((t) => t.rol === 'usuario').map((t) => t.texto), mensaje].join(' ');
    const contexto = await buscar(detectarIntencion(textoUsuario));
    if (!cliente || !modelo) return respaldo('sin_configuracion');

    // 3. Llamada al modelo.
    let respuesta;
    try {
      respuesta = await cliente.messages.create({
        model: modelo,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'text', text: construirContexto(contexto) },
        ],
        messages: prepararMensajes(historial, mensaje),
        thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA_RESPUESTA } },
      });
    } catch (err) {
      const tipo = err instanceof Anthropic.APIError ? `api_${err.status ?? 'conexion'}` : 'error';
      console.error(`[asistente] fallo de la API (${tipo}): ${err.message}`);
      return respaldo(tipo);
    }
    if (respuesta.stop_reason !== 'end_turn') return respaldo(`stop_${respuesta.stop_reason}`);

    // 4. Parseo y validación.
    let datos;
    try {
      datos = RespuestaModelo.parse(JSON.parse(textoDe(respuesta)));
    } catch {
      return respaldo('json_invalido');
    }
    const crudo = { ...datos, usage: respuesta.usage };

    const idsContexto = new Set(contexto.map((s) => s.id));
    const ids = [...new Set(datos.servicio_ids)].filter((id) => idsContexto.has(id));

    // 5. Defensa en profundidad: nada clínico ni teléfonos que no vengan de la base de datos.
    const ajustado = buscarContenidoClinico(datos.mensaje).length > 0 || buscarTelefonos(datos.mensaje).length > 0;
    const elegidos = ids.map((id) => contexto.find((s) => s.id === id));
    const lista = elegidos.length ? elegidos : await buscar({ temas: ['general'], limite: 3 });

    return {
      origen: 'asistente',
      emergencia: false,
      mensaje: ajustado ? MENSAJE_AJUSTADO : limpiarIds(datos.mensaje),
      servicios: lista,
      linea_123: LINEA_123,
      aviso: AVISO_ASISTENTE,
      _crudo: { ...crudo, ids_contexto: [...idsContexto], ajustado },
    };
  }

  return { responder };
}
