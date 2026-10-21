import { z } from 'zod';
import {
  TEMAS,
  PUBLICOS,
  MODALIDADES,
  TIPOS_SERVICIO,
  ESTADOS_SERVICIO,
  TIPOS_CANAL,
  MOTIVOS_REPORTE,
  RESULTADOS_VERIFICACION,
  ESTADOS_CAMBIO,
  ESTADOS_ACTIVIDAD,
} from '../config/catalogos.js';

z.config(z.locales.es());

const id = z.coerce.number().int().positive();
const urlHttps = z.url({ protocol: /^https$/, error: 'Debe ser un enlace https válido' }).max(500);
const texto = (max) => z.string().trim().max(max);
const textoOpcional = (max) => texto(max).nullable().optional();
/** En query strings `?tema=` llega como cadena vacía: se trata como ausente. */
const filtro = (esquema) => z.preprocess((v) => (v === '' ? undefined : v), esquema.optional());

export const paramsId = z.object({ id });

// ---------------------------------------------------------------- públicos
export const filtrosServicios = z.object({
  tema: filtro(z.enum(TEMAS)),
  publico: filtro(z.enum(PUBLICOS)),
  modalidad: filtro(z.enum(MODALIDADES)),
  q: filtro(texto(100)),
});

export const esquemaReporte = z
  .object({
    servicio_id: id,
    canal_id: id.nullable().optional(),
    motivo: z.enum(MOTIVOS_REPORTE),
  })
  .strict();

export const esquemaChat = z
  .object({
    mensaje: texto(500).min(1),
    historial: z
      .array(z.object({ rol: z.enum(['usuario', 'asistente']), texto: texto(1000).min(1) }).strict())
      .max(20)
      .default([]),
  })
  .strict();

// ---------------------------------------------------------------- admin
export const esquemaLogin = z.object({
  email: z.email().max(190),
  password: z.string().min(1).max(200),
});

const camposServicio = {
  nombre: texto(200).min(3),
  descripcion: textoOpcional(2000),
  tipo: z.enum(TIPOS_SERVICIO),
  temas: z.array(z.enum(TEMAS)).min(1),
  publico: z.array(z.enum(PUBLICOS)).min(1),
  modalidad: z.array(z.enum(MODALIDADES)).min(1),
  cobertura: textoOpcional(160),
  horario: textoOpcional(200),
  costo: textoOpcional(120),
  direccion: textoOpcional(250),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  fuente_id: id.nullable().optional(),
  url_fuente: urlHttps.nullable().optional(),
  fecha_verificacion: z.iso.date().nullable().optional(),
  estado: z.enum(ESTADOS_SERVICIO),
  es_emergencia: z.boolean(),
  orden: z.number().int().min(0).max(10000),
  es_sintetico: z.boolean(),
};

export const esquemaServicioCrear = z
  .object({
    ...camposServicio,
    estado: camposServicio.estado.default('en_revision'),
    es_emergencia: camposServicio.es_emergencia.default(false),
    orden: camposServicio.orden.default(0),
    es_sintetico: camposServicio.es_sintetico.default(false),
  })
  .strict();

export const esquemaServicioActualizar = z
  .object(camposServicio)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar');

export const filtrosAdminServicios = z.object({
  estado: filtro(z.enum(ESTADOS_SERVICIO)),
  q: filtro(texto(100)),
});

export const esquemaVerificar = z
  .object({
    resultado: z.enum(RESULTADOS_VERIFICACION),
    nota: textoOpcional(500),
    url_fuente: urlHttps.optional(),
  })
  .strict();

const camposCanal = {
  servicio_id: id,
  tipo: z.enum(TIPOS_CANAL),
  valor: texto(300).min(1),
  etiqueta: textoOpcional(120),
};
export const esquemaCanalCrear = z.object(camposCanal).strict();
export const esquemaCanalActualizar = z
  .object({ tipo: camposCanal.tipo, valor: camposCanal.valor, etiqueta: camposCanal.etiqueta })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar');
export const filtrosCanales = z.object({ servicio_id: id });

const camposFuente = {
  nombre: texto(160).min(3),
  entidad: texto(160).min(2),
  url: urlHttps,
  selector_css: textoOpcional(300),
  activa: z.boolean().optional(),
};
export const esquemaFuenteCrear = z.object(camposFuente).strict();
export const esquemaFuenteActualizar = z
  .object(camposFuente)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Envía al menos un campo para actualizar');

export const filtrosCambios = z.object({
  estado: filtro(z.enum([...ESTADOS_CAMBIO, 'todos'])),
});

export const filtrosActividades = z.object({
  estado: filtro(z.enum(ESTADOS_ACTIVIDAD)),
});
