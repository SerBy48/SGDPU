CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('ADMIN','PORTERO','CONSULTOR');
CREATE TYPE user_status AS ENUM ('ACTIVO','INACTIVO','BLOQUEADO');
CREATE TYPE parking_status AS ENUM ('ACTIVO','INACTIVO');
CREATE TYPE movement_type AS ENUM ('ENTRADA','SALIDA');
CREATE TYPE incident_status AS ENUM ('ACTIVA','CERRADA');
CREATE TYPE vehicle_type AS ENUM ('CARRO','MOTO');
CREATE TYPE occupation_status AS ENUM ('ACTIVA','FINALIZADA');
CREATE TYPE occupant_type AS ENUM ('ESTUDIANTE','ADMINISTRATIVO','DOCENTE');

CREATE TABLE sedes (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT
);

CREATE TABLE parqueaderos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  ubicacion TEXT NOT NULL,
  capacidad_total INTEGER NOT NULL CHECK (capacidad_total > 0),
  cupos_disponibles INTEGER NOT NULL CHECK (cupos_disponibles >= 0),
  estado parking_status NOT NULL DEFAULT 'INACTIVO',
  id_sede BIGINT NOT NULL REFERENCES sedes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cupos_disponibles <= capacidad_total)
);

CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  apellido VARCHAR(80) NOT NULL,
  correo VARCHAR(180) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol user_role NOT NULL DEFAULT 'CONSULTOR',
  estado user_status NOT NULL DEFAULT 'ACTIVO',
  id_parqueadero_asignado BIGINT REFERENCES parqueaderos(id) ON DELETE SET NULL,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE secciones (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  descripcion TEXT,
  capacidad INTEGER NOT NULL CHECK (capacidad > 0),
  cupos_disponibles INTEGER NOT NULL CHECK (cupos_disponibles >= 0),
  tipo_vehiculo vehicle_type NOT NULL DEFAULT 'CARRO',
  es_preferencial BOOLEAN NOT NULL DEFAULT false,
  -- activo=false: retirado por un cambio de plano (se conserva por su historial).
  activo BOOLEAN NOT NULL DEFAULT true,
  -- habilitado=false: inhabilitado temporalmente (ver migrations/007).
  habilitado BOOLEAN NOT NULL DEFAULT true,
  motivo_inhabilitacion TEXT,
  inhabilitado_desde TIMESTAMPTZ,
  inhabilitado_hasta DATE,
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE RESTRICT,
  UNIQUE(id_parqueadero, nombre),
  CHECK (cupos_disponibles <= capacidad)
);

CREATE TABLE horarios_operacion (
  id BIGSERIAL PRIMARY KEY,
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_apertura TIME NOT NULL,
  hora_cierre TIME NOT NULL,
  UNIQUE(id_parqueadero, dia_semana)
);

CREATE TABLE planos_parqueadero (
  id BIGSERIAL PRIMARY KEY,
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE CASCADE,
  archivo_svg TEXT NOT NULL,
  fecha_carga TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  sha256 CHAR(64),
  id_usuario_carga BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo TEXT,
  resumen JSONB
);

CREATE TABLE coordenadas_seccion (
  id BIGSERIAL PRIMARY KEY,
  id_seccion BIGINT NOT NULL REFERENCES secciones(id) ON DELETE CASCADE,
  id_plano BIGINT NOT NULL REFERENCES planos_parqueadero(id) ON DELETE CASCADE,
  elemento_svg_id VARCHAR(160) NOT NULL,
  x NUMERIC(12,2) NOT NULL DEFAULT 0,
  y NUMERIC(12,2) NOT NULL DEFAULT 0,
  ancho NUMERIC(12,2) NOT NULL DEFAULT 52,
  alto NUMERIC(12,2) NOT NULL DEFAULT 30,
  UNIQUE(id_plano, elemento_svg_id)
);

CREATE TABLE movimientos (
  id BIGSERIAL PRIMARY KEY,
  tipo movement_type NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE RESTRICT,
  id_seccion BIGINT REFERENCES secciones(id) ON DELETE RESTRICT,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observacion TEXT
);

CREATE TABLE ocupaciones (
  id BIGSERIAL PRIMARY KEY,
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE RESTRICT,
  id_seccion BIGINT NOT NULL REFERENCES secciones(id) ON DELETE RESTRICT,
  nombre_ocupante VARCHAR(160) NOT NULL,
  codigo_carne VARCHAR(40),
  tipo_persona occupant_type NOT NULL DEFAULT 'ESTUDIANTE',
  placa VARCHAR(20) NOT NULL,
  tipo_vehiculo vehicle_type NOT NULL,
  id_movimiento_entrada BIGINT NOT NULL REFERENCES movimientos(id) ON DELETE RESTRICT,
  id_movimiento_salida BIGINT REFERENCES movimientos(id) ON DELETE RESTRICT,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  estado occupation_status NOT NULL DEFAULT 'ACTIVA'
);

CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  revocado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_revocacion TIMESTAMPTZ
);

CREATE TABLE email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auditoria (
  id BIGSERIAL PRIMARY KEY,
  id_usuario BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  rol_usuario user_role,
  accion VARCHAR(100) NOT NULL,
  modulo VARCHAR(80) NOT NULL,
  descripcion_detalle TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip VARCHAR(64)
);

CREATE TABLE incidencias (
  id BIGSERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  placa_opcional VARCHAR(20),
  cupo_opcional VARCHAR(80),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE RESTRICT,
  id_usuario BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado incident_status NOT NULL DEFAULT 'ACTIVA',
  comentario_resolucion TEXT
);

CREATE INDEX idx_movimientos_parqueadero_fecha ON movimientos(id_parqueadero, fecha_hora);
CREATE INDEX idx_movimientos_usuario_fecha ON movimientos(id_usuario, fecha_hora);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha_hora);
CREATE INDEX idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX idx_incidencias_estado ON incidencias(estado);
CREATE INDEX idx_ocupaciones_seccion_estado ON ocupaciones(id_seccion, estado);
CREATE INDEX idx_ocupaciones_parqueadero_fecha ON ocupaciones(id_parqueadero, fecha_inicio);
CREATE INDEX idx_evt_usuario ON email_verification_tokens(id_usuario);
CREATE INDEX idx_prt_usuario ON password_reset_tokens(id_usuario);

CREATE OR REPLACE FUNCTION prevent_historical_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los registros históricos son inmutables';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimientos_immutable
BEFORE UPDATE OR DELETE ON movimientos
FOR EACH ROW EXECUTE FUNCTION prevent_historical_mutation();

CREATE TRIGGER trg_auditoria_immutable
BEFORE UPDATE OR DELETE ON auditoria
FOR EACH ROW EXECUTE FUNCTION prevent_historical_mutation();

CREATE OR REPLACE FUNCTION guard_ocupaciones_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los registros de ocupación son inmutables';
  END IF;
  -- Solo se permite la transición de cierre ACTIVA -> FINALIZADA,
  -- fijando fecha_fin/id_movimiento_salida; todo lo demás debe permanecer igual.
  IF OLD.estado <> 'ACTIVA' OR NEW.estado <> 'FINALIZADA'
     OR NEW.id <> OLD.id OR NEW.id_parqueadero <> OLD.id_parqueadero
     OR NEW.id_seccion <> OLD.id_seccion OR NEW.nombre_ocupante <> OLD.nombre_ocupante
     OR NEW.codigo_carne IS DISTINCT FROM OLD.codigo_carne
     OR NEW.tipo_persona <> OLD.tipo_persona
     OR NEW.placa <> OLD.placa OR NEW.tipo_vehiculo <> OLD.tipo_vehiculo
     OR NEW.id_movimiento_entrada <> OLD.id_movimiento_entrada
     OR NEW.fecha_inicio <> OLD.fecha_inicio
     OR NEW.id_movimiento_salida IS NULL OR NEW.fecha_fin IS NULL THEN
    RAISE EXCEPTION 'Solo se permite cerrar una ocupación activa (transición a FINALIZADA)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ocupaciones_guard
BEFORE UPDATE OR DELETE ON ocupaciones
FOR EACH ROW EXECUTE FUNCTION guard_ocupaciones_mutation();

CREATE OR REPLACE FUNCTION sync_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION sync_updated_at();

CREATE TRIGGER trg_parqueaderos_updated BEFORE UPDATE ON parqueaderos
FOR EACH ROW EXECUTE FUNCTION sync_updated_at();
