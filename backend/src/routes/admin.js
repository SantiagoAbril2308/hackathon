import { Router } from 'express';
import { validar } from '../middleware/validar.js';
import { requiereAdmin } from '../middleware/auth.js';
import {
  paramsId,
  esquemaLogin,
  esquemaServicioCrear,
  esquemaServicioActualizar,
  filtrosAdminServicios,
  esquemaVerificar,
  esquemaCanalCrear,
  esquemaCanalActualizar,
  filtrosCanales,
  esquemaFuenteCrear,
  esquemaFuenteActualizar,
  filtrosCambios,
  filtrosActividades,
} from '../utils/esquemas.js';
import * as c from '../controllers/admin.js';

export function rutasAdmin({ limites, ejecutarScraper }) {
  const r = Router();
  const id = validar({ params: paramsId });

  r.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  r.post('/login', limites.login, validar({ body: esquemaLogin }), c.login);

  // Todo lo que sigue requiere JWT.
  r.use(limites.admin, requiereAdmin);

  r.get('/servicios', validar({ query: filtrosAdminServicios }), c.listarServicios);
  r.post('/servicios', validar({ body: esquemaServicioCrear }), c.crearServicio);
  r.get('/servicios/:id', id, c.obtenerServicio);
  r.put('/servicios/:id', validar({ params: paramsId, body: esquemaServicioActualizar }), c.actualizarServicio);
  r.delete('/servicios/:id', id, c.retirarServicio);
  r.post('/servicios/:id/verificar', validar({ params: paramsId, body: esquemaVerificar }), c.verificarServicio);

  r.get('/canales', validar({ query: filtrosCanales }), c.listarCanales);
  r.post('/canales', validar({ body: esquemaCanalCrear }), c.crearCanal);
  r.put('/canales/:id', validar({ params: paramsId, body: esquemaCanalActualizar }), c.actualizarCanal);
  r.delete('/canales/:id', id, c.eliminarCanal);

  r.get('/fuentes', c.listarFuentes);
  r.post('/fuentes', validar({ body: esquemaFuenteCrear }), c.crearFuente);
  r.get('/fuentes/:id', id, c.obtenerFuente);
  r.put('/fuentes/:id', validar({ params: paramsId, body: esquemaFuenteActualizar }), c.actualizarFuente);
  r.delete('/fuentes/:id', id, c.desactivarFuente);

  r.get('/cambios', validar({ query: filtrosCambios }), c.listarCambios);
  r.post('/cambios/:id/aprobar', id, c.aprobarCambio);
  r.post('/cambios/:id/rechazar', id, c.rechazarCambio);

  r.get('/reportes', c.listarReportes);

  r.get('/actividades', validar({ query: filtrosActividades }), c.listarActividades);
  r.post('/actividades/:id/aprobar', id, c.aprobarActividad);
  r.post('/actividades/:id/rechazar', id, c.rechazarActividad);

  r.post('/scraper/ejecutar', c.crearControladorScraper(ejecutarScraper));

  return r;
}
