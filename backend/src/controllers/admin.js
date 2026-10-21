import { autenticar } from '../services/admins.js';
import { firmarToken } from '../utils/jwt.js';
import * as servicios from '../services/servicios.js';
import * as canales from '../services/canales.js';
import * as fuentes from '../services/fuentes.js';
import * as cambios from '../services/cambios.js';
import * as reportes from '../services/reportes.js';
import * as actividades from '../services/actividades.js';

// ---------------------------------------------------------------- sesión
export async function login(req, res) {
  const admin = await autenticar(req.valid.body.email, req.valid.body.password);
  res.json({ token: firmarToken(admin), expira_en: '8h', admin });
}

// ---------------------------------------------------------------- servicios
export async function listarServicios(req, res) {
  const lista = await servicios.adminListar(req.valid.query);
  res.json({ total: lista.length, servicios: lista });
}
export async function obtenerServicio(req, res) {
  res.json(await servicios.adminObtener(req.valid.params.id));
}
export async function crearServicio(req, res) {
  res.status(201).json(await servicios.crear(req.valid.body));
}
export async function actualizarServicio(req, res) {
  res.json(await servicios.actualizar(req.valid.params.id, req.valid.body));
}
export async function retirarServicio(req, res) {
  res.json(await servicios.retirar(req.valid.params.id, req.admin));
}
export async function verificarServicio(req, res) {
  res.json(await servicios.verificar(req.valid.params.id, req.admin, req.valid.body));
}

// ---------------------------------------------------------------- canales
export async function listarCanales(req, res) {
  res.json({ canales: await canales.listar(req.valid.query.servicio_id) });
}
export async function crearCanal(req, res) {
  res.status(201).json(await canales.crear(req.valid.body));
}
export async function actualizarCanal(req, res) {
  res.json(await canales.actualizar(req.valid.params.id, req.valid.body));
}
export async function eliminarCanal(req, res) {
  await canales.eliminar(req.valid.params.id);
  res.status(204).end();
}

// ---------------------------------------------------------------- fuentes
export async function listarFuentes(_req, res) {
  res.json({ fuentes: await fuentes.listar() });
}
export async function obtenerFuente(req, res) {
  res.json(await fuentes.obtener(req.valid.params.id));
}
export async function crearFuente(req, res) {
  res.status(201).json(await fuentes.crear(req.valid.body));
}
export async function actualizarFuente(req, res) {
  res.json(await fuentes.actualizar(req.valid.params.id, req.valid.body));
}
export async function desactivarFuente(req, res) {
  res.json(await fuentes.desactivar(req.valid.params.id));
}

// ---------------------------------------------------------------- cambios pendientes
export async function listarCambios(req, res) {
  const lista = await cambios.listar(req.valid.query);
  res.json({ total: lista.length, cambios: lista });
}
export async function aprobarCambio(req, res) {
  res.json(await cambios.aprobar(req.valid.params.id, req.admin));
}
export async function rechazarCambio(req, res) {
  res.json(await cambios.rechazar(req.valid.params.id, req.admin));
}

// ---------------------------------------------------------------- reportes y actividades
export async function listarReportes(_req, res) {
  res.json(await reportes.resumenAdmin());
}
export async function listarActividades(req, res) {
  res.json({ actividades: await actividades.adminListar(req.valid.query) });
}
export async function aprobarActividad(req, res) {
  res.json(await actividades.cambiarEstado(req.valid.params.id, 'aprobada'));
}
export async function rechazarActividad(req, res) {
  res.json(await actividades.cambiarEstado(req.valid.params.id, 'rechazada'));
}

// ---------------------------------------------------------------- scraper
export function crearControladorScraper(ejecutarScraper) {
  return async function ejecutar(req, res) {
    res.json(await ejecutarScraper({ admin: req.admin }));
  };
}
