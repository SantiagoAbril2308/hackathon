/**
 * Palabras clave para el prefiltro SQL del asistente. Solo sirven para elegir qué servicios
 * se le muestran al modelo como CONTEXTO; no clasifican ni evalúan a la persona.
 * Formato igual que en emergencia.js (sin tildes; `*` = cualquier terminación).
 */
export const PALABRAS_TEMA = {
  ansiedad: ['ansie*', 'ansios*', 'nervio*', 'angusti*', 'panico', 'estres*', 'preocupa*', 'agobi*', 'no puedo dormir', 'inquiet*'],
  depresion: ['triste*', 'deprim*', 'depresi*', 'desanim*', 'sin ganas', 'vacio', 'vacia', 'solo', 'sola', 'soledad', 'llorar', 'lloro', 'apagad*'],
  duelo: ['duelo', 'perdi a', 'murio', 'fallecio', 'fallecimiento', 'perdida', 'extrano a', 'luto', 'se fue para siempre'],
  consumo_sustancias: ['alcohol', 'droga*', 'consum*', 'marihuana', 'adicci*', 'adict*', 'trago', 'tomar mucho', 'bebe mucho', 'fumar', 'cocaina', 'sustancia*', 'apuesta*'],
  conducta_suicida: ['pensamientos de muerte', 'no quiero estar aqui'],
  violencias: ['violen*', 'maltrat*', 'golpe*', 'me pega', 'le pega', 'abus*', 'acoso', 'acosa*', 'agresi*', 'amenaz*', 'bullying', 'matoneo', 'intimida*'],
};

export const PALABRAS_PUBLICO = {
  ninos: ['nino*', 'nina*', 'mi hijo', 'mi hija', 'mis hijos', 'infan*', 'bebe'],
  jovenes: ['joven*', 'adolescen*', 'colegio', 'universidad', 'estudiante*', 'tengo 1* anos'],
  familias: ['familia*', 'mi pareja', 'mi esposo', 'mi esposa', 'mi mama', 'mi papa', 'en casa'],
  adultos: ['adulto*', 'trabajo'],
};

export const PALABRAS_MODALIDAD = {
  chat: ['chat', 'escribir', 'por mensaje', 'whatsapp', 'no quiero hablar', 'no puedo hablar'],
  telefono: ['llamar', 'llamada', 'telefono', 'linea'],
  presencial: ['presencial', 'en persona', 'cerca', 'direccion', 'ir a', 'barrio', 'donde queda'],
};
