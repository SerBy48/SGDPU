-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas; docker-entrypoint-initdb.d
-- solo se ejecuta la primera vez que se crea el volumen de datos)

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('CARRO','MOTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE secciones
  ADD COLUMN IF NOT EXISTS tipo_vehiculo vehicle_type NOT NULL DEFAULT 'CARRO';
