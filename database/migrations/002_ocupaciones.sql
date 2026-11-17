-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas)
-- Agrega la tabla ocupaciones: identidad de la persona que ocupa un cupo
-- (nombre + código de carné + placa), ligada al tiempo entre ENTRADA y SALIDA.

DO $$ BEGIN
  CREATE TYPE occupation_status AS ENUM ('ACTIVA','FINALIZADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ocupaciones (
  id BIGSERIAL PRIMARY KEY,
  id_parqueadero BIGINT NOT NULL REFERENCES parqueaderos(id) ON DELETE RESTRICT,
  id_seccion BIGINT NOT NULL REFERENCES secciones(id) ON DELETE RESTRICT,
  nombre_ocupante VARCHAR(160) NOT NULL,
  codigo_carne VARCHAR(40) NOT NULL,
  placa VARCHAR(20) NOT NULL,
  tipo_vehiculo vehicle_type NOT NULL,
  id_movimiento_entrada BIGINT NOT NULL REFERENCES movimientos(id) ON DELETE RESTRICT,
  id_movimiento_salida BIGINT REFERENCES movimientos(id) ON DELETE RESTRICT,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  estado occupation_status NOT NULL DEFAULT 'ACTIVA'
);

CREATE INDEX IF NOT EXISTS idx_ocupaciones_seccion_estado ON ocupaciones(id_seccion, estado);
CREATE INDEX IF NOT EXISTS idx_ocupaciones_parqueadero_fecha ON ocupaciones(id_parqueadero, fecha_inicio);

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
     OR NEW.codigo_carne <> OLD.codigo_carne
     OR NEW.placa <> OLD.placa OR NEW.tipo_vehiculo <> OLD.tipo_vehiculo
     OR NEW.id_movimiento_entrada <> OLD.id_movimiento_entrada
     OR NEW.fecha_inicio <> OLD.fecha_inicio
     OR NEW.id_movimiento_salida IS NULL OR NEW.fecha_fin IS NULL THEN
    RAISE EXCEPTION 'Solo se permite cerrar una ocupación activa (transición a FINALIZADA)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ocupaciones_guard ON ocupaciones;
CREATE TRIGGER trg_ocupaciones_guard
BEFORE UPDATE OR DELETE ON ocupaciones
FOR EACH ROW EXECUTE FUNCTION guard_ocupaciones_mutation();
