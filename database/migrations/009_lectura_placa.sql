-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas)
--
-- Lector de placas con cámara: junto a cada ENTRADA se guarda lo que sugirió
-- el lector (si se usó), para medir en campo cuántas lecturas acepta el
-- portero sin corregir. No se guardan imágenes.
--   placa_sugerida     NULL = no se usó el lector; '' = se usó y no leyó nada;
--                      si difiere de "placa", el portero corrigió la lectura.
--   confianza_lectura  confianza mínima por carácter (0 a 1).
--   version_modelos    versión de los modelos (frontend/public/models/manifest.json).

ALTER TABLE ocupaciones
  ADD COLUMN IF NOT EXISTS placa_sugerida VARCHAR(6),
  ADD COLUMN IF NOT EXISTS confianza_lectura NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS version_modelos VARCHAR(20);

DO $$ BEGIN
  ALTER TABLE ocupaciones ADD CONSTRAINT chk_ocupaciones_lectura CHECK (
    (placa_sugerida IS NULL OR placa_sugerida ~ '^[A-Z0-9]{0,6}$')
    AND (confianza_lectura IS NULL OR confianza_lectura BETWEEN 0 AND 1));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Las columnas nuevas también son inmutables al cerrar la ocupación.
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
     OR NEW.placa_sugerida IS DISTINCT FROM OLD.placa_sugerida
     OR NEW.confianza_lectura IS DISTINCT FROM OLD.confianza_lectura
     OR NEW.version_modelos IS DISTINCT FROM OLD.version_modelos
     OR NEW.id_movimiento_salida IS NULL OR NEW.fecha_fin IS NULL THEN
    RAISE EXCEPTION 'Solo se permite cerrar una ocupación activa (transición a FINALIZADA)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
