export const TEMAS = ['ansiedad', 'depresion', 'duelo', 'consumo_sustancias', 'conducta_suicida', 'violencias', 'general'];
export const PUBLICOS = ['ninos', 'jovenes', 'adultos', 'familias'];
export const MODALIDADES = ['telefono', 'chat', 'presencial'];
export const TIPOS_SERVICIO = ['linea_nacional', 'linea_departamental', 'linea_municipal', 'presencial', 'chat'];
export const ESTADOS_SERVICIO = ['vigente', 'en_revision', 'retirado'];
export const TIPOS_CANAL = ['telefono', 'whatsapp', 'web', 'email'];
export const MOTIVOS_REPORTE = ['no_contesta', 'numero_errado', 'enlace_caido', 'otro'];
export const RESULTADOS_VERIFICACION = ['confirmado', 'corregido', 'retirado'];
export const ESTADOS_CAMBIO = ['pendiente', 'aprobado', 'rechazado'];
export const ESTADOS_ACTIVIDAD = ['pendiente', 'aprobada', 'rechazada'];

/** Con este número de reportes (desde la última verificación) un servicio pasa a en_revision. */
export const UMBRAL_REPORTES = 3;

/** Campos de `servicios` que un cambio pendiente aprobado puede actualizar directamente. */
export const CAMPOS_CAMBIO_SERVICIO = ['nombre', 'descripcion', 'horario', 'costo', 'direccion', 'cobertura', 'url_fuente'];

/** Línea única de emergencias de Colombia (la misma del aviso obligatorio). */
export const LINEA_123 = { numero: '123', etiqueta: 'Línea de emergencias' };
