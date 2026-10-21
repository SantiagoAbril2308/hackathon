import { Router } from 'express';
import { validar } from '../middleware/validar.js';
import { filtrosServicios, paramsId, esquemaReporte } from '../utils/esquemas.js';
import * as c from '../controllers/publico.js';

export function rutasPublicas({ limites }) {
  const r = Router();
  r.use(limites.publico);

  r.get('/salud', c.salud);
  r.get('/servicios', validar({ query: filtrosServicios }), c.listarServicios);
  r.get('/servicios/:id', validar({ params: paramsId }), c.obtenerServicio);
  r.get('/emergencia', c.emergencia);
  r.get('/directorio.json', c.directorio);
  r.post('/reportes', limites.reportes, validar({ body: esquemaReporte }), c.crearReporte);
  r.get('/actividades', c.listarActividades);

  return r;
}
