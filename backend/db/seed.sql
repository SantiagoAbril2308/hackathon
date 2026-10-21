-- Ruta Serena — datos 100 % SINTÉTICOS para desarrollo y pruebas (TRL 4).
-- Todos los nombres son ficticios. Todos los teléfonos siguen el formato 000-000-00XX.
-- Las coordenadas corresponden a barrios reales de Villavicencio, pero los servicios NO existen.
-- Las fechas son relativas a hoy para que siempre haya servicios vencidos (> 30 días).
-- El administrador inicial lo crea `npm run db:seed` desde las variables de entorno.

DELETE FROM reportes;
DELETE FROM verificaciones;
DELETE FROM cambios_pendientes;
DELETE FROM canales;
DELETE FROM servicios;
DELETE FROM fuentes;
DELETE FROM actividades;

-- ---------------------------------------------------------------------------
-- Fuentes ficticias (dominio reservado .example, RFC 2606)
-- ---------------------------------------------------------------------------
INSERT INTO fuentes (id, nombre, entidad, url, dominio, selector_css, activa) VALUES
(1, 'Directorio nacional de líneas (ficticio)', 'Ministerio Ficticio de Bienestar', 'https://fuente-ficticia-nacional.example/lineas', 'fuente-ficticia-nacional.example', '#lineas-apoyo', TRUE),
(2, 'Red departamental de apoyo (ficticia)', 'Secretaría Ficticia de Salud del Meta', 'https://fuente-ficticia-meta.example/red-apoyo', 'fuente-ficticia-meta.example', '.servicios-apoyo', TRUE),
(3, 'Oferta municipal de orientación (ficticia)', 'Alcaldía Ficticia de Villavicencio', 'https://fuente-ficticia-villavicencio.example/orientacion', 'fuente-ficticia-villavicencio.example', 'section#oferta', TRUE);

-- ---------------------------------------------------------------------------
-- Servicios ficticios (20). Ids 1 y 2 son de emergencia.
-- Ids 17, 18 y 19 están "vigente" pero con verificación vencida (prueban el job de vencimiento).
-- Id 20 ya está "en_revision".
-- ---------------------------------------------------------------------------
INSERT INTO servicios
(id, nombre, descripcion, tipo, temas, publico, modalidad, cobertura, horario, costo, direccion, lat, lng, fuente_id, url_fuente, fecha_verificacion, verificado_por, estado, es_emergencia, orden, prioridad, es_sintetico) VALUES
(1, 'Línea Serena Nacional (ficticia)', 'Línea de escucha que te orienta y te conecta con apoyo en cualquier momento.', 'linea_nacional',
 '["general","conducta_suicida","ansiedad","depresion"]', '["ninos","jovenes","adultos","familias"]', '["telefono","chat"]',
 'Nacional', 'Todos los días, 24 horas', 'Gratuito', NULL, NULL, NULL,
 1, 'https://fuente-ficticia-nacional.example/lineas#serena', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', TRUE, 1, 0, TRUE),

(2, 'Línea de Apoyo Llanera (ficticia)', 'Línea del departamento para orientarte y acompañarte hacia el servicio adecuado.', 'linea_departamental',
 '["general","conducta_suicida","violencias"]', '["jovenes","adultos","familias"]', '["telefono"]',
 'Departamento del Meta', 'Todos los días, 24 horas', 'Gratuito', NULL, NULL, NULL,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#llanera', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', TRUE, 2, 0, TRUE),

(3, 'Línea Municipal Escucha Villavicencio (ficticia)', 'Te escuchan y te indican a dónde acudir en la ciudad.', 'linea_municipal',
 '["general","ansiedad","duelo"]', '["jovenes","adultos","familias"]', '["telefono"]',
 'Villavicencio', 'Lunes a sábado, 7:00 a. m. a 7:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#escucha', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(4, 'Chat Juvenil Amanecer (ficticio)', 'Chat para jóvenes que quieren hablar con alguien y saber qué apoyo hay cerca.', 'chat',
 '["ansiedad","depresion","general"]', '["jovenes"]', '["chat"]',
 'Nacional', 'Lunes a viernes, 2:00 p. m. a 10:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 1, 'https://fuente-ficticia-nacional.example/lineas#amanecer', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(5, 'Línea Familias en Calma (ficticia)', 'Orientación para familias que viven situaciones de violencia en casa.', 'linea_departamental',
 '["violencias","general"]', '["familias","adultos","ninos"]', '["telefono"]',
 'Departamento del Meta', 'Todos los días, 6:00 a. m. a 10:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#familias', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(6, 'Línea de Orientación en Consumo (ficticia)', 'Información y orientación sobre el consumo de alcohol y otras sustancias.', 'linea_nacional',
 '["consumo_sustancias"]', '["jovenes","adultos","familias"]', '["telefono","chat"]',
 'Nacional', 'Lunes a viernes, 8:00 a. m. a 8:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 1, 'https://fuente-ficticia-nacional.example/lineas#consumo', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(7, 'Centro de Escucha Barzal (ficticio)', 'Espacio presencial de escucha y orientación.', 'presencial',
 '["general","ansiedad","depresion"]', '["adultos","jovenes"]', '["presencial"]',
 'Villavicencio', 'Lunes a viernes, 8:00 a. m. a 5:00 p. m.', 'Gratuito', 'Barrio Barzal, dirección ficticia', 4.155500, -73.639000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#barzal', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(8, 'Punto de Orientación Centro (ficticio)', 'Te ayudan a encontrar el servicio que necesitas en la ciudad.', 'presencial',
 '["general"]', '["adultos","familias"]', '["presencial","telefono"]',
 'Villavicencio', 'Lunes a viernes, 7:30 a. m. a 4:30 p. m.', 'Gratuito', 'Barrio El Centro, dirección ficticia', 4.151500, -73.635000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#centro', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(9, 'Casa Comunitaria La Esperanza (ficticia)', 'Encuentros comunitarios de acompañamiento para personas que viven una pérdida.', 'presencial',
 '["duelo","general"]', '["adultos","familias"]', '["presencial"]',
 'Villavicencio', 'Martes y jueves, 3:00 p. m. a 6:00 p. m.', 'Gratuito', 'Barrio La Esperanza, dirección ficticia', 4.133000, -73.615000,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#esperanza', DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(10, 'Centro de Apoyo Porfía (ficticio)', 'Orientación presencial para el sector de Porfía.', 'presencial',
 '["general","ansiedad"]', '["jovenes","adultos","familias"]', '["presencial"]',
 'Villavicencio — Comuna 8', 'Lunes a viernes, 8:00 a. m. a 4:00 p. m.', 'Gratuito', 'Barrio La Porfía, dirección ficticia', 4.096000, -73.664000,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#porfia', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(11, 'Espacio Joven Montecarlo (ficticio)', 'Espacio para jóvenes con actividades de escucha y orientación.', 'presencial',
 '["ansiedad","depresion","consumo_sustancias"]', '["jovenes"]', '["presencial"]',
 'Villavicencio', 'Lunes a sábado, 9:00 a. m. a 6:00 p. m.', 'Gratuito', 'Barrio Montecarlo, dirección ficticia', 4.127000, -73.631000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#montecarlo', DATE_SUB(CURDATE(), INTERVAL 9 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(12, 'Punto Familiar El Buque (ficticio)', 'Orientación y acompañamiento a familias en situaciones de violencia.', 'presencial',
 '["violencias"]', '["familias","ninos","adultos"]', '["presencial","telefono"]',
 'Villavicencio', 'Lunes a viernes, 8:00 a. m. a 5:00 p. m.', 'Gratuito', 'Barrio El Buque, dirección ficticia', 4.144000, -73.611000,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#buque', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(13, 'Centro de Escucha San Benito (ficticio)', 'Información y orientación sobre consumo de sustancias.', 'presencial',
 '["consumo_sustancias","general"]', '["jovenes","adultos"]', '["presencial"]',
 'Villavicencio', 'Lunes a viernes, 1:00 p. m. a 7:00 p. m.', 'Gratuito', 'Barrio San Benito, dirección ficticia', 4.148000, -73.630500,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#sanbenito', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(14, 'Atención Infantil Villa Julia (ficticio)', 'Orientación para niñas, niños y sus familias.', 'presencial',
 '["general","violencias"]', '["ninos","familias"]', '["presencial"]',
 'Villavicencio', 'Lunes a viernes, 7:00 a. m. a 3:00 p. m.', 'Gratuito', 'Barrio Villa Julia, dirección ficticia', 4.155500, -73.629000,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#villajulia', DATE_SUB(CURDATE(), INTERVAL 11 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(15, 'Grupo de Acompañamiento La Grama (ficticio)', 'Encuentros grupales para personas que atraviesan un duelo.', 'presencial',
 '["duelo"]', '["adultos","familias"]', '["presencial"]',
 'Villavicencio', 'Sábados, 9:00 a. m. a 12:00 m.', 'Gratuito', 'Barrio La Grama, dirección ficticia', 4.152000, -73.626000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#lagrama', DATE_SUB(CURDATE(), INTERVAL 25 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(16, 'Chat Orientación Violencias (ficticio)', 'Chat de orientación para personas que viven o conocen situaciones de violencia.', 'chat',
 '["violencias"]', '["jovenes","adultos"]', '["chat"]',
 'Nacional', 'Todos los días, 8:00 a. m. a 10:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 1, 'https://fuente-ficticia-nacional.example/lineas#violencias', DATE_SUB(CURDATE(), INTERVAL 13 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(17, 'Centro Comunitario Kirpas (ficticio)', 'Orientación comunitaria en el sector de Kirpas.', 'presencial',
 '["general"]', '["adultos","familias"]', '["presencial"]',
 'Villavicencio', 'Lunes a viernes, 8:00 a. m. a 4:00 p. m.', 'Gratuito', 'Barrio Kirpas, dirección ficticia', 4.125000, -73.599000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#kirpas', DATE_SUB(CURDATE(), INTERVAL 45 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(18, 'Línea Escucha Rural Meta (ficticia)', 'Línea para personas de zonas rurales del departamento.', 'linea_departamental',
 '["general","ansiedad","duelo"]', '["adultos","familias"]', '["telefono"]',
 'Zonas rurales del Meta', 'Lunes a viernes, 7:00 a. m. a 7:00 p. m.', 'Gratuito', NULL, NULL, NULL,
 2, 'https://fuente-ficticia-meta.example/red-apoyo#rural', DATE_SUB(CURDATE(), INTERVAL 60 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(19, 'Punto de Orientación Siete de Agosto (ficticio)', 'Orientación presencial en el barrio Siete de Agosto.', 'presencial',
 '["general","depresion"]', '["adultos"]', '["presencial"]',
 'Villavicencio', 'Miércoles y viernes, 8:00 a. m. a 12:00 m.', 'Gratuito', 'Barrio Siete de Agosto, dirección ficticia', 4.153000, -73.628000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#sieteagosto', DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'Equipo Ruta Serena (sintético)', 'vigente', FALSE, 0, 0, TRUE),

(20, 'Centro de Escucha Caudal (ficticio)', 'Espacio de escucha en revisión por cambio de horario.', 'presencial',
 '["general"]', '["jovenes","adultos"]', '["presencial"]',
 'Villavicencio', 'Por confirmar', 'Gratuito', 'Barrio Caudal, dirección ficticia', 4.139500, -73.616000,
 3, 'https://fuente-ficticia-villavicencio.example/orientacion#caudal', DATE_SUB(CURDATE(), INTERVAL 120 DAY), 'Equipo Ruta Serena (sintético)', 'en_revision', FALSE, 0, 0, TRUE);

-- ---------------------------------------------------------------------------
-- Canales (teléfonos y WhatsApp SIEMPRE con formato 000-000-00XX)
-- ---------------------------------------------------------------------------
INSERT INTO canales (id, servicio_id, tipo, valor, etiqueta) VALUES
(1, 1, 'telefono', '000-000-0001', 'Línea gratuita'),
(2, 1, 'whatsapp', '000-000-0002', 'WhatsApp'),
(3, 1, 'web', 'https://fuente-ficticia-nacional.example/chat-serena', 'Chat web'),
(4, 2, 'telefono', '000-000-0003', 'Línea gratuita'),
(5, 2, 'whatsapp', '000-000-0004', 'WhatsApp'),
(6, 3, 'telefono', '000-000-0005', 'Línea municipal'),
(7, 4, 'web', 'https://fuente-ficticia-nacional.example/chat-amanecer', 'Chat web'),
(8, 4, 'whatsapp', '000-000-0006', 'WhatsApp'),
(9, 5, 'telefono', '000-000-0007', 'Línea gratuita'),
(10, 6, 'telefono', '000-000-0008', 'Línea gratuita'),
(11, 6, 'web', 'https://fuente-ficticia-nacional.example/chat-consumo', 'Chat web'),
(12, 7, 'telefono', '000-000-0009', 'Recepción'),
(13, 8, 'telefono', '000-000-0010', 'Recepción'),
(14, 8, 'email', 'orientacion@fuente-ficticia-villavicencio.example', 'Correo'),
(15, 9, 'telefono', '000-000-0011', 'Recepción'),
(16, 10, 'telefono', '000-000-0012', 'Recepción'),
(17, 11, 'telefono', '000-000-0013', 'Recepción'),
(18, 11, 'whatsapp', '000-000-0014', 'WhatsApp'),
(19, 12, 'telefono', '000-000-0015', 'Recepción'),
(20, 13, 'telefono', '000-000-0016', 'Recepción'),
(21, 14, 'telefono', '000-000-0017', 'Recepción'),
(22, 15, 'telefono', '000-000-0018', 'Coordinación del grupo'),
(23, 16, 'web', 'https://fuente-ficticia-nacional.example/chat-violencias', 'Chat web'),
(24, 16, 'whatsapp', '000-000-0019', 'WhatsApp'),
(25, 17, 'telefono', '000-000-0020', 'Recepción'),
(26, 18, 'telefono', '000-000-0021', 'Línea gratuita'),
(27, 19, 'telefono', '000-000-0022', 'Recepción'),
(28, 20, 'telefono', '000-000-0023', 'Recepción');

-- ---------------------------------------------------------------------------
-- Historial de verificaciones (sin admin asociado: lo hizo el seed)
-- ---------------------------------------------------------------------------
INSERT INTO verificaciones (servicio_id, admin_id, fecha, resultado, nota) VALUES
(1, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), 'confirmado', 'Verificación sintética de ejemplo'),
(2, NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), 'confirmado', 'Verificación sintética de ejemplo'),
(12, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), 'corregido', 'Horario corregido (ejemplo sintético)'),
(20, NULL, DATE_SUB(NOW(), INTERVAL 120 DAY), 'confirmado', 'Verificación sintética antigua');

-- ---------------------------------------------------------------------------
-- Actividades ficticias (3 aprobadas, 1 pendiente, 1 rechazada)
-- ---------------------------------------------------------------------------
INSERT INTO actividades (id, titulo, organizador, descripcion, fecha, lugar, url, estado) VALUES
(1, 'Caminata por el bienestar (ficticia)', 'Colectivo Ficticio Llano Vivo', 'Recorrido en grupo por el parque, abierto a toda la familia.', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '07:00:00'), 'Parque ficticio Los Fundadores', 'https://fuente-ficticia-villavicencio.example/agenda/caminata', 'aprobada'),
(2, 'Charla: cómo pedir apoyo (ficticia)', 'Biblioteca Ficticia del Llano', 'Conversatorio sobre dónde encontrar orientación en la ciudad.', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 9 DAY), '16:00:00'), 'Biblioteca ficticia, sala 2', 'https://fuente-ficticia-villavicencio.example/agenda/charla', 'aprobada'),
(3, 'Encuentro juvenil de arte (ficticio)', 'Espacio Joven Montecarlo (ficticio)', 'Tarde de pintura y música para jóvenes.', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 14 DAY), '15:00:00'), 'Barrio Montecarlo, dirección ficticia', NULL, 'aprobada'),
(4, 'Feria de servicios comunitarios (ficticia)', 'Junta Ficticia de Acción Comunal', 'Feria con información de servicios del barrio.', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 20 DAY), '09:00:00'), 'Salón comunal ficticio', NULL, 'pendiente'),
(5, 'Taller sin fuente verificable (ficticio)', 'Organizador no identificado', 'Actividad rechazada por no tener organizador verificable.', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '10:00:00'), 'Por confirmar', NULL, 'rechazada');
