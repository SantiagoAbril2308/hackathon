/** POST /api/chat — no guarda la conversación ni registra su contenido. */
export function crearControladorChat(asistente) {
  return async function chat(req, res) {
    const { _motivo, _crudo, ...respuesta } = await asistente.responder(req.valid.body);
    res.set('Cache-Control', 'no-store');
    res.json(respuesta);
  };
}
