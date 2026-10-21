-- Ruta Serena — esquema de base de datos (MySQL / TiDB Cloud Serverless)
-- Idempotente: se puede ejecutar varias veces sin perder datos.

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fuentes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(160) NOT NULL,
  entidad VARCHAR(160) NOT NULL,
  url VARCHAR(500) NOT NULL,
  dominio VARCHAR(190) NOT NULL,
  selector_css VARCHAR(300) NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_hash CHAR(64) NULL,
  ultima_lectura DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fuentes_dominio (dominio),
  KEY idx_fuentes_activa (activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- temas:     ["ansiedad","depresion","duelo","consumo_sustancias","conducta_suicida","violencias","general"]
-- publico:   ["ninos","jovenes","adultos","familias"]
-- modalidad: ["telefono","chat","presencial"]
-- prioridad: sube con cada reporte ciudadano para ordenar la cola de revisión.
CREATE TABLE IF NOT EXISTS servicios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  tipo ENUM('linea_nacional','linea_departamental','linea_municipal','presencial','chat') NOT NULL,
  temas JSON NOT NULL,
  publico JSON NOT NULL,
  modalidad JSON NOT NULL,
  cobertura VARCHAR(160) NULL,
  horario VARCHAR(200) NULL,
  costo VARCHAR(120) NULL,
  direccion VARCHAR(250) NULL,
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  fuente_id INT UNSIGNED NULL,
  url_fuente VARCHAR(500) NULL,
  fecha_verificacion DATE NULL,
  verificado_por VARCHAR(120) NULL,
  estado ENUM('vigente','en_revision','retirado') NOT NULL DEFAULT 'en_revision',
  es_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
  orden INT NOT NULL DEFAULT 0,
  prioridad INT NOT NULL DEFAULT 0,
  es_sintetico BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_servicios_estado_fecha (estado, fecha_verificacion),
  KEY idx_servicios_emergencia (es_emergencia, orden),
  KEY idx_servicios_tipo (tipo),
  KEY idx_servicios_prioridad (prioridad),
  KEY idx_servicios_fuente (fuente_id),
  CONSTRAINT fk_servicios_fuente FOREIGN KEY (fuente_id) REFERENCES fuentes (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS canales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  servicio_id INT UNSIGNED NOT NULL,
  tipo ENUM('telefono','whatsapp','web','email') NOT NULL,
  valor VARCHAR(300) NOT NULL,
  etiqueta VARCHAR(120) NULL,
  PRIMARY KEY (id),
  KEY idx_canales_servicio (servicio_id),
  CONSTRAINT fk_canales_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verificaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  servicio_id INT UNSIGNED NOT NULL,
  admin_id INT UNSIGNED NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resultado ENUM('confirmado','corregido','retirado') NOT NULL,
  nota VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY idx_verificaciones_servicio (servicio_id, fecha),
  KEY idx_verificaciones_admin (admin_id),
  CONSTRAINT fk_verificaciones_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_verificaciones_admin FOREIGN KEY (admin_id) REFERENCES admins (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cambios_pendientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fuente_id INT UNSIGNED NOT NULL,
  servicio_id INT UNSIGNED NULL,
  campo VARCHAR(80) NOT NULL,
  valor_anterior TEXT NULL,
  valor_nuevo TEXT NULL,
  hash CHAR(64) NOT NULL,
  prioridad INT NOT NULL DEFAULT 0,
  estado ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  revisado_por INT UNSIGNED NULL,
  revisado_en DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cambios_estado_prioridad (estado, prioridad),
  KEY idx_cambios_fuente (fuente_id),
  KEY idx_cambios_servicio (servicio_id),
  KEY idx_cambios_hash (hash),
  CONSTRAINT fk_cambios_fuente FOREIGN KEY (fuente_id) REFERENCES fuentes (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cambios_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_cambios_admin FOREIGN KEY (revisado_por) REFERENCES admins (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sin IP, sin texto libre y sin datos de quien reporta.
CREATE TABLE IF NOT EXISTS reportes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  servicio_id INT UNSIGNED NOT NULL,
  canal_id INT UNSIGNED NULL,
  motivo ENUM('no_contesta','numero_errado','enlace_caido','otro') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reportes_servicio (servicio_id, created_at),
  KEY idx_reportes_canal (canal_id),
  CONSTRAINT fk_reportes_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reportes_canal FOREIGN KEY (canal_id) REFERENCES canales (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS actividades (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(200) NOT NULL,
  organizador VARCHAR(160) NOT NULL,
  descripcion TEXT NULL,
  fecha DATETIME NOT NULL,
  lugar VARCHAR(250) NULL,
  url VARCHAR(500) NULL,
  estado ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_actividades_estado_fecha (estado, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
