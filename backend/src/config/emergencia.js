/**
 * Capa de emergencia del asistente (se evalúa ANTES de llamar al modelo).
 * Si alguna expresión aparece en el mensaje, se responde con MENSAJE_EMERGENCIA y las líneas de
 * emergencia. No se calcula, puntúa ni guarda ningún nivel de riesgo: es solo una coincidencia de texto.
 *
 * Las expresiones se comparan sin tildes, sin mayúsculas y sin signos. `*` = cualquier terminación.
 * Edita esta lista para ajustarla; las pruebas verifican que cada expresión active la capa.
 */
export const EXPRESIONES_EMERGENCIA = [
  // Ideas de quitarse la vida (en primera o tercera persona)
  'suicid*',
  'me quiero morir',
  'quiero morirme',
  'quiero morir',
  'me quiero matar',
  'me voy a matar',
  'matarme',
  'quitarme la vida',
  'quitarse la vida',
  'se quiere matar',
  'se va a matar',
  'acabar con mi vida',
  'terminar con mi vida',
  'no quiero vivir',
  'no quiero seguir viviendo',
  'no vale la pena vivir',
  'mejor estar muerto',
  'mejor estar muerta',
  'desaparecer para siempre',
  // Hacerse daño
  'hacerme dano',
  'lastimarme',
  'cortarme',
  'me corte',
  'sobredosis',
  'tome muchas pastillas',
  'me tome todas las pastillas',
  // Peligro inmediato por violencia
  'me va a matar',
  'me quiere matar',
  'me esta golpeando',
  'me estan golpeando',
  'me esta pegando',
  'me estan pegando',
  'estoy en peligro',
  'corro peligro',
  'me violaron',
  'abusaron de mi',
  'me estan amenazando con',
];

export const MENSAJE_EMERGENCIA =
  'Gracias por contarlo. Lo que estás viviendo importa y no tienes que enfrentarlo sin compañía. ' +
  'Si tu vida o la de alguien está en peligro ahora, llama al 123. ' +
  'Estas líneas pueden escucharte en este momento:';

export const MENSAJE_RESPALDO =
  'En este momento no puedo responder. Si necesitas apoyo, estas líneas están disponibles. ' +
  'Si tu vida o la de alguien está en peligro, llama al 123.';

export const MENSAJE_AJUSTADO = 'Puedo ayudarte a encontrar dónde te pueden orientar. Estos servicios pueden ser un buen punto de partida:';

export const AVISO_ASISTENTE = 'Soy un asistente de información, no un profesional de salud.';
