-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas)
-- Agrega el tipo de persona (estudiante/administrativo/docente) al ocupante del
-- cupo, y permite carné opcional para administrativos/docentes (aún no se
-- confirma si manejan código de carné). El tipo de vehículo ahora lo indica
-- el portero en el formulario en vez de heredarlo siempre de la sección.

DO $$ BEGIN
  CREATE TYPE occupant_type AS ENUM ('ESTUDIANTE','ADMINISTRATIVO','DOCENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE ocupaciones ADD COLUMN IF NOT EXISTS tipo_persona occupant_type NOT NULL DEFAULT 'ESTUDIANTE';
ALTER TABLE ocupaciones ALTER COLUMN codigo_carne DROP NOT NULL;

-- Se reemplaza la función de guarda para incluir tipo_persona y usar
-- IS DISTINCT FROM (en vez de <>) porque codigo_carne ahora puede ser NULL:
-- con <>, comparar NULL con un valor nuevo da NULL (no TRUE), lo que dejaría
-- pasar sin detectar una alteración de un carné antes vacío.
CREATE OR REPLACE FUNCTION guard_ocupaciones_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los registros de ocupación son inmutables';
  END IF;
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
