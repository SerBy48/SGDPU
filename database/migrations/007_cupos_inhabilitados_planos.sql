-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- (schema.sql ya incluye esto para instalaciones nuevas)
--
-- Reglas para modificar la capacidad de un parqueadero existente:
--  * Cambio TEMPORAL: se inhabilitan cupos puntuales del plano (obra,
--    mantenimiento, evento…) con motivo obligatorio. El cupo sigue en el plano
--    pero no recibe entradas hasta que se rehabilite. capacidad_total no
--    cambia; cupos_disponibles sí (el cupo inhabilitado queda en 0).
--  * Cambio PERMANENTE: exige subir un nuevo plano .svg. Los cupos que ya no
--    están en el plano se eliminan si no tienen historial, o se retiran
--    (activo=false) si lo tienen, porque movimientos/ocupaciones son
--    inmutables y los referencian.

ALTER TABLE secciones ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS habilitado BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS motivo_inhabilitacion TEXT;
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS inhabilitado_desde TIMESTAMPTZ;
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS inhabilitado_hasta DATE;

-- Trazabilidad de cada plano cargado: quién lo subió, por qué, huella del
-- archivo saneado y resumen de cupos detectados en la revisión previa.
ALTER TABLE planos_parqueadero ADD COLUMN IF NOT EXISTS sha256 CHAR(64);
ALTER TABLE planos_parqueadero ADD COLUMN IF NOT EXISTS id_usuario_carga BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE planos_parqueadero ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE planos_parqueadero ADD COLUMN IF NOT EXISTS resumen JSONB;
