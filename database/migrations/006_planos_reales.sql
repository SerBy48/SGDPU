-- Reemplaza los planos/cupos de demostración por el diseño real de los 4
-- parqueaderos (SVG provistos por el usuario, un <polygon> por cupo con
-- data-codigo/data-tipo ya definidos). A diferencia de 005_plano_p1_central.sql
-- ya no se usa coordenadas_seccion: el SVG completo (con cada cupo como
-- <polygon data-codigo="...">) se guarda tal cual y el frontend colorea/opera
-- cada polígono en vivo por su atributo data-codigo, que coincide con
-- secciones.nombre.
--
-- Esto reemplaza la estructura de P1-P4 (antes datos de demostración con
-- capacidades pequeñas) por la capacidad real de cada sede. Como las tablas
-- movimientos/ocupaciones referencian secciones con ON DELETE RESTRICT, hay
-- que limpiar el historial de movimientos de demostración de estos 4
-- parqueaderos antes de reemplazar sus secciones (ver seed histórico aparte
-- para repoblar datos de ejemplo tras aplicar esta migración).

ALTER TABLE secciones ADD COLUMN IF NOT EXISTS es_preferencial BOOLEAN NOT NULL DEFAULT false;

DO $migration$
DECLARE
  ya_migrado BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM parqueaderos WHERE id=1 AND nombre='P1 - Central (Carros)') INTO ya_migrado;
  IF ya_migrado THEN RETURN; END IF;

  -- ocupaciones tiene un trigger que bloquea todo DELETE (registros
  -- inmutables salvo el cierre ACTIVA->FINALIZADA); se desactiva solo para
  -- limpiar el historial de demostración de estos 4 parqueaderos.
  ALTER TABLE ocupaciones DISABLE TRIGGER trg_ocupaciones_guard;
  ALTER TABLE movimientos DISABLE TRIGGER trg_movimientos_immutable;

  -- P1 - Central (Carros): limpiar historial/estructura previa
  DELETE FROM ocupaciones WHERE id_parqueadero=1;
  DELETE FROM movimientos WHERE id_parqueadero=1;
  DELETE FROM coordenadas_seccion WHERE id_seccion IN (SELECT id FROM secciones WHERE id_parqueadero=1);
  DELETE FROM planos_parqueadero WHERE id_parqueadero=1;
  DELETE FROM secciones WHERE id_parqueadero=1;

  UPDATE parqueaderos SET nombre='P1 - Central (Carros)', ubicacion='Acceso central, zona de carros', capacidad_total=118, cupos_disponibles=118 WHERE id=1;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo) VALUES (1, $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5.00 -34.79 112.00 63.00">
<style>
  .base{fill:none;stroke:var(--border);stroke-width:.09}
  .puesto{fill:var(--surface-2);stroke:var(--border);stroke-width:.12;cursor:pointer;transition:fill .15s}
  .puesto.preferencial{fill:var(--surface-2)}
  .marcaX{fill:none;stroke:var(--gold);stroke-width:.14;pointer-events:none}
  .puesto.libre{fill:#4caf50}
  .puesto.ocupado{fill:#ef5350}
  .puesto.selected{fill:#1565c0}
  .readonly .puesto{cursor:default}
</style>
<rect x="-5.00" y="-34.79" width="112.00" height="63.00" fill="var(--card)" stroke="var(--border)" stroke-width=".12"/>
<g id="puestos">
  <polygon id="C-01" class="puesto" data-codigo="C-01" data-tipo="carro" points="58.00,-18.00 54.94,-20.57 54.94,-22.57 58.00,-20.00"/>
  <polygon id="C-02" class="puesto" data-codigo="C-02" data-tipo="carro" points="58.00,-16.00 54.94,-18.57 54.94,-20.57 58.00,-18.00"/>
  <polygon id="C-03" class="puesto" data-codigo="C-03" data-tipo="carro" points="58.00,-14.00 54.94,-16.57 54.94,-18.57 58.00,-16.00"/>
  <polygon id="C-04" class="puesto" data-codigo="C-04" data-tipo="carro" points="58.00,-12.00 54.94,-14.57 54.94,-16.57 58.00,-14.00"/>
  <polygon id="C-05" class="puesto" data-codigo="C-05" data-tipo="carro" points="58.00,-10.00 54.94,-12.57 54.94,-14.57 58.00,-12.00"/>
  <polygon id="C-06" class="puesto" data-codigo="C-06" data-tipo="carro" points="58.00,-8.00 54.94,-10.57 54.94,-12.57 58.00,-10.00"/>
  <polygon id="C-07" class="puesto" data-codigo="C-07" data-tipo="carro" points="58.00,-6.00 54.94,-8.57 54.94,-10.57 58.00,-8.00"/>
  <polygon id="C-08" class="puesto" data-codigo="C-08" data-tipo="carro" points="58.00,-4.00 54.94,-6.57 54.94,-8.57 58.00,-6.00"/>
  <polygon id="C-09" class="puesto" data-codigo="C-09" data-tipo="carro" points="58.00,-2.00 54.94,-4.57 54.94,-6.57 58.00,-4.00"/>
  <polygon id="C-10" class="puesto" data-codigo="C-10" data-tipo="carro" points="58.00,-0.00 54.94,-2.57 54.94,-4.57 58.00,-2.00"/>
  <polygon id="C-11" class="puesto" data-codigo="C-11" data-tipo="carro" points="0.00,-0.00 2.57,3.06 4.57,3.06 2.00,-0.00"/>
  <polygon id="C-12" class="puesto" data-codigo="C-12" data-tipo="carro" points="2.00,-0.00 4.57,3.06 6.57,3.06 4.00,-0.00"/>
  <polygon id="C-13" class="puesto" data-codigo="C-13" data-tipo="carro" points="4.00,-0.00 6.57,3.06 8.57,3.06 6.00,-0.00"/>
  <polygon id="C-14" class="puesto" data-codigo="C-14" data-tipo="carro" points="6.00,-0.00 8.57,3.06 10.57,3.06 8.00,-0.00"/>
  <polygon id="C-15" class="puesto" data-codigo="C-15" data-tipo="carro" points="8.00,-0.00 10.57,3.06 12.57,3.06 10.00,-0.00"/>
  <polygon id="C-16" class="puesto" data-codigo="C-16" data-tipo="carro" points="10.00,-0.00 12.57,3.06 14.57,3.06 12.00,-0.00"/>
  <polygon id="C-17" class="puesto" data-codigo="C-17" data-tipo="carro" points="12.00,-0.00 14.57,3.06 16.57,3.06 14.00,-0.00"/>
  <polygon id="C-18" class="puesto" data-codigo="C-18" data-tipo="carro" points="14.00,-0.00 16.57,3.06 18.57,3.06 16.00,-0.00"/>
  <polygon id="C-19" class="puesto" data-codigo="C-19" data-tipo="carro" points="16.00,-0.00 18.57,3.06 20.57,3.06 18.00,-0.00"/>
  <polygon id="C-20" class="puesto" data-codigo="C-20" data-tipo="carro" points="18.00,-0.00 20.57,3.06 22.57,3.06 20.00,-0.00"/>
  <polygon id="C-21" class="puesto" data-codigo="C-21" data-tipo="carro" points="20.00,-0.00 22.57,3.06 24.57,3.06 22.00,-0.00"/>
  <polygon id="C-22" class="puesto" data-codigo="C-22" data-tipo="carro" points="22.00,-0.00 24.57,3.06 26.57,3.06 24.00,-0.00"/>
  <polygon id="C-23" class="puesto" data-codigo="C-23" data-tipo="carro" points="24.00,-0.00 26.57,3.06 26.57,1.06 24.00,-2.00"/>
  <polygon id="C-24" class="puesto" data-codigo="C-24" data-tipo="carro" points="24.00,-2.00 26.57,1.06 26.57,-0.94 24.00,-4.00"/>
  <polygon id="C-25" class="puesto" data-codigo="C-25" data-tipo="carro" points="24.00,-8.00 26.57,-4.94 26.57,-6.94 24.00,-10.00"/>
  <polygon id="C-26" class="puesto" data-codigo="C-26" data-tipo="carro" points="24.00,-10.00 26.57,-6.94 26.57,-8.94 24.00,-12.00"/>
  <polygon id="C-27" class="puesto" data-codigo="C-27" data-tipo="carro" points="24.00,-4.00 26.57,-0.94 26.57,-2.94 24.00,-6.00"/>
  <polygon id="C-28" class="puesto" data-codigo="C-28" data-tipo="carro" points="24.00,-6.00 26.57,-2.94 26.57,-4.94 24.00,-8.00"/>
  <polygon id="C-29" class="puesto" data-codigo="C-29" data-tipo="carro" points="35.00,-6.00 37.57,-9.06 37.57,-11.06 35.00,-8.00"/>
  <polygon id="C-30" class="puesto" data-codigo="C-30" data-tipo="carro" points="35.00,-6.00 37.57,-9.06 37.57,-7.06 35.00,-4.00"/>
  <polygon id="C-31" class="puesto" data-codigo="C-31" data-tipo="carro" points="35.00,-4.00 37.57,-7.06 37.57,-5.06 35.00,-2.00"/>
  <polygon id="C-32" class="puesto" data-codigo="C-32" data-tipo="carro" points="35.00,-2.00 37.57,-5.06 37.57,-3.06 35.00,-0.00"/>
  <polygon id="C-33" class="puesto" data-codigo="C-33" data-tipo="carro" points="35.00,-0.00 37.57,-3.06 37.57,-1.06 35.00,2.00"/>
  <polygon id="C-34" class="puesto" data-codigo="C-34" data-tipo="carro" points="35.00,2.00 37.57,-1.06 37.57,0.94 35.00,4.00"/>
  <polygon id="C-35" class="puesto preferencial" data-codigo="C-35" data-tipo="discapacitado" points="35.00,4.00 37.57,0.94 37.57,2.94 35.00,6.00"/>
  <path class="marcaX" d="M 35.00 4.00 L 37.57 2.94 M 37.57 0.94 L 35.00 6.00"/>
  <polygon id="C-36" class="puesto preferencial" data-codigo="C-36" data-tipo="discapacitado" points="35.00,6.00 37.57,2.94 37.57,4.94 35.00,8.00"/>
  <path class="marcaX" d="M 35.00 6.00 L 37.57 4.94 M 37.57 2.94 L 35.00 8.00"/>
  <polygon id="C-37" class="puesto" data-codigo="C-37" data-tipo="carro" points="47.00,-6.00 49.57,-9.06 49.57,-11.06 47.00,-8.00"/>
  <polygon id="C-38" class="puesto" data-codigo="C-38" data-tipo="carro" points="47.00,-4.00 49.57,-7.06 49.57,-9.06 47.00,-6.00"/>
  <polygon id="C-39" class="puesto" data-codigo="C-39" data-tipo="carro" points="47.00,-2.00 49.57,-5.06 49.57,-7.06 47.00,-4.00"/>
  <polygon id="C-40" class="puesto" data-codigo="C-40" data-tipo="carro" points="47.00,-0.00 49.57,-3.06 49.57,-5.06 47.00,-2.00"/>
  <polygon id="C-41" class="puesto" data-codigo="C-41" data-tipo="carro" points="47.00,2.00 49.57,-1.06 49.57,-3.06 47.00,-0.00"/>
  <polygon id="C-42" class="puesto" data-codigo="C-42" data-tipo="carro" points="47.00,4.00 49.57,0.94 49.57,-1.06 47.00,2.00"/>
  <polygon id="C-43" class="puesto" data-codigo="C-43" data-tipo="carro" points="47.00,6.00 49.57,2.94 49.57,0.94 47.00,4.00"/>
  <polygon id="C-44" class="puesto" data-codigo="C-44" data-tipo="carro" points="47.00,8.00 49.57,4.94 49.57,2.94 47.00,6.00"/>
  <polygon id="C-45" class="puesto" data-codigo="C-45" data-tipo="carro" points="34.00,-9.00 30.94,-6.43 30.94,-4.43 34.00,-7.00"/>
  <polygon id="C-46" class="puesto" data-codigo="C-46" data-tipo="carro" points="34.00,-7.00 30.94,-4.43 30.94,-2.43 34.00,-5.00"/>
  <polygon id="C-47" class="puesto" data-codigo="C-47" data-tipo="carro" points="34.00,-5.00 30.94,-2.43 30.94,-0.43 34.00,-3.00"/>
  <polygon id="C-48" class="puesto" data-codigo="C-48" data-tipo="carro" points="34.00,-3.00 30.94,-0.43 30.94,1.57 34.00,-1.00"/>
  <polygon id="C-49" class="puesto" data-codigo="C-49" data-tipo="carro" points="34.00,-1.00 30.94,1.57 30.94,3.57 34.00,1.00"/>
  <polygon id="C-50" class="puesto" data-codigo="C-50" data-tipo="carro" points="34.00,1.00 30.94,3.57 30.94,5.57 34.00,3.00"/>
  <polygon id="C-51" class="puesto" data-codigo="C-51" data-tipo="carro" points="34.00,3.00 30.94,5.57 30.94,7.57 34.00,5.00"/>
  <polygon id="C-52" class="puesto" data-codigo="C-52" data-tipo="carro" points="34.00,5.00 30.94,7.57 30.94,9.57 34.00,7.00"/>
  <polygon id="C-53" class="puesto" data-codigo="C-53" data-tipo="carro" points="46.00,-9.00 43.43,-5.94 43.43,-3.94 46.00,-7.00"/>
  <polygon id="C-54" class="puesto" data-codigo="C-54" data-tipo="carro" points="46.00,-7.00 43.43,-3.94 43.43,-1.94 46.00,-5.00"/>
  <polygon id="C-55" class="puesto" data-codigo="C-55" data-tipo="carro" points="46.00,-5.00 43.43,-1.94 43.43,0.06 46.00,-3.00"/>
  <polygon id="C-56" class="puesto" data-codigo="C-56" data-tipo="carro" points="46.00,-3.00 43.43,0.06 43.43,2.06 46.00,-1.00"/>
  <polygon id="C-57" class="puesto" data-codigo="C-57" data-tipo="carro" points="46.00,-1.00 43.43,2.06 43.43,4.06 46.00,1.00"/>
  <polygon id="C-58" class="puesto" data-codigo="C-58" data-tipo="carro" points="46.00,1.00 43.43,4.06 43.43,6.06 46.00,3.00"/>
  <polygon id="C-59" class="puesto" data-codigo="C-59" data-tipo="carro" points="46.00,3.00 43.43,6.06 43.43,8.06 46.00,5.00"/>
  <polygon id="C-60" class="puesto" data-codigo="C-60" data-tipo="carro" points="46.00,5.00 43.43,8.06 43.43,10.06 46.00,7.00"/>
  <polygon id="C-61" class="puesto" data-codigo="C-61" data-tipo="carro" points="58.00,-0.00 54.94,2.57 56.94,2.57 60.00,-0.00"/>
  <polygon id="C-62" class="puesto" data-codigo="C-62" data-tipo="carro" points="60.00,-0.00 56.94,2.57 58.94,2.57 62.00,-0.00"/>
  <polygon id="C-63" class="puesto" data-codigo="C-63" data-tipo="carro" points="62.00,-0.00 58.94,2.57 60.94,2.57 64.00,-0.00"/>
  <polygon id="C-64" class="puesto" data-codigo="C-64" data-tipo="carro" points="64.00,-0.00 60.94,2.57 62.94,2.57 66.00,-0.00"/>
  <polygon id="C-65" class="puesto" data-codigo="C-65" data-tipo="carro" points="66.00,-0.00 62.94,2.57 64.94,2.57 68.00,-0.00"/>
  <polygon id="C-66" class="puesto" data-codigo="C-66" data-tipo="carro" points="68.00,-0.00 64.94,2.57 66.94,2.57 70.00,-0.00"/>
  <polygon id="C-67" class="puesto" data-codigo="C-67" data-tipo="carro" points="70.00,-0.00 66.94,2.57 68.94,2.57 72.00,-0.00"/>
  <polygon id="C-68" class="puesto" data-codigo="C-68" data-tipo="carro" points="72.00,-0.00 68.94,2.57 70.94,2.57 74.00,-0.00"/>
  <polygon id="C-69" class="puesto" data-codigo="C-69" data-tipo="carro" points="74.00,-0.00 70.94,2.57 72.94,2.57 76.00,-0.00"/>
  <polygon id="C-70" class="puesto" data-codigo="C-70" data-tipo="carro" points="78.00,-0.00 74.94,2.57 76.94,2.57 80.00,-0.00"/>
  <polygon id="C-71" class="puesto" data-codigo="C-71" data-tipo="carro" points="80.00,-0.00 76.94,2.57 78.94,2.57 82.00,-0.00"/>
  <polygon id="C-72" class="puesto" data-codigo="C-72" data-tipo="carro" points="82.00,-0.00 78.94,2.57 80.94,2.57 84.00,-0.00"/>
  <polygon id="C-73" class="puesto" data-codigo="C-73" data-tipo="carro" points="84.00,-0.00 80.94,2.57 82.94,2.57 86.00,-0.00"/>
  <polygon id="C-74" class="puesto" data-codigo="C-74" data-tipo="carro" points="86.00,-0.00 82.94,2.57 84.94,2.57 88.00,-0.00"/>
  <polygon id="C-75" class="puesto" data-codigo="C-75" data-tipo="carro" points="88.00,-0.00 84.94,2.57 86.94,2.57 90.00,-0.00"/>
  <polygon id="C-76" class="puesto" data-codigo="C-76" data-tipo="carro" points="90.00,-0.00 86.94,2.57 88.94,2.57 92.00,-0.00"/>
  <polygon id="C-77" class="puesto" data-codigo="C-77" data-tipo="carro" points="92.00,-0.00 88.94,2.57 90.94,2.57 94.00,-0.00"/>
  <polygon id="C-78" class="puesto" data-codigo="C-78" data-tipo="carro" points="94.00,-0.00 90.94,2.57 92.94,2.57 96.00,-0.00"/>
  <polygon id="C-79" class="puesto" data-codigo="C-79" data-tipo="carro" points="-2.00,4.00 2.00,4.00 2.00,6.00 -2.00,6.00"/>
  <polygon id="C-80" class="puesto" data-codigo="C-80" data-tipo="carro" points="-2.00,6.00 2.00,6.00 2.00,8.00 -2.00,8.00"/>
  <polygon id="C-81" class="puesto" data-codigo="C-81" data-tipo="carro" points="-2.00,8.00 2.00,8.00 2.00,10.00 -2.00,10.00"/>
  <polygon id="C-82" class="puesto" data-codigo="C-82" data-tipo="carro" points="-2.00,10.00 2.00,10.00 2.00,12.00 -2.00,12.00"/>
  <polygon id="C-83" class="puesto" data-codigo="C-83" data-tipo="carro" points="0.00,16.00 2.57,12.94 4.57,12.94 2.00,16.00"/>
  <polygon id="C-84" class="puesto" data-codigo="C-84" data-tipo="carro" points="2.00,16.00 4.57,12.94 6.57,12.94 4.00,16.00"/>
  <polygon id="C-85" class="puesto" data-codigo="C-85" data-tipo="carro" points="4.00,16.00 6.57,12.94 8.57,12.94 6.00,16.00"/>
  <polygon id="C-86" class="puesto" data-codigo="C-86" data-tipo="carro" points="6.00,16.00 8.57,12.94 10.57,12.94 8.00,16.00"/>
  <polygon id="C-87" class="puesto" data-codigo="C-87" data-tipo="carro" points="8.00,16.00 10.57,12.94 12.57,12.94 10.00,16.00"/>
  <polygon id="C-88" class="puesto" data-codigo="C-88" data-tipo="carro" points="10.00,16.00 12.57,12.94 14.57,12.94 12.00,16.00"/>
  <polygon id="C-89" class="puesto" data-codigo="C-89" data-tipo="carro" points="12.00,16.00 14.57,12.94 16.57,12.94 14.00,16.00"/>
  <polygon id="C-90" class="puesto" data-codigo="C-90" data-tipo="carro" points="14.00,16.00 16.57,12.94 18.57,12.94 16.00,16.00"/>
  <polygon id="C-91" class="puesto" data-codigo="C-91" data-tipo="carro" points="16.00,16.00 18.57,12.94 20.57,12.94 18.00,16.00"/>
  <polygon id="C-92" class="puesto" data-codigo="C-92" data-tipo="carro" points="18.00,16.00 20.57,12.94 22.57,12.94 20.00,16.00"/>
  <polygon id="C-93" class="puesto" data-codigo="C-93" data-tipo="carro" points="20.00,16.00 22.57,12.94 24.57,12.94 22.00,16.00"/>
  <polygon id="C-94" class="puesto" data-codigo="C-94" data-tipo="carro" points="22.00,16.00 24.57,12.94 26.57,12.94 24.00,16.00"/>
  <polygon id="C-95" class="puesto" data-codigo="C-95" data-tipo="carro" points="24.00,16.00 26.57,12.94 28.57,12.94 26.00,16.00"/>
  <polygon id="C-96" class="puesto" data-codigo="C-96" data-tipo="carro" points="26.00,16.00 28.57,12.94 30.57,12.94 28.00,16.00"/>
  <polygon id="C-97" class="puesto" data-codigo="C-97" data-tipo="carro" points="60.00,16.00 57.43,12.94 59.43,12.94 62.00,16.00"/>
  <polygon id="C-98" class="puesto" data-codigo="C-98" data-tipo="carro" points="62.00,16.00 59.43,12.94 61.43,12.94 64.00,16.00"/>
  <polygon id="C-99" class="puesto" data-codigo="C-99" data-tipo="carro" points="64.00,16.00 61.43,12.94 63.43,12.94 66.00,16.00"/>
  <polygon id="C-100" class="puesto" data-codigo="C-100" data-tipo="carro" points="66.00,16.00 63.43,12.94 65.43,12.94 68.00,16.00"/>
  <polygon id="C-101" class="puesto" data-codigo="C-101" data-tipo="carro" points="68.00,16.00 65.43,12.94 67.43,12.94 70.00,16.00"/>
  <polygon id="C-102" class="puesto" data-codigo="C-102" data-tipo="carro" points="70.00,16.00 67.43,12.94 69.43,12.94 72.00,16.00"/>
  <polygon id="C-103" class="puesto" data-codigo="C-103" data-tipo="carro" points="72.00,16.00 69.43,12.94 71.43,12.94 74.00,16.00"/>
  <polygon id="C-104" class="puesto" data-codigo="C-104" data-tipo="carro" points="74.00,16.00 71.43,12.94 73.43,12.94 76.00,16.00"/>
  <polygon id="C-105" class="puesto" data-codigo="C-105" data-tipo="carro" points="76.00,16.00 73.43,12.94 75.43,12.94 78.00,16.00"/>
  <polygon id="C-106" class="puesto" data-codigo="C-106" data-tipo="carro" points="78.00,16.00 75.43,12.94 77.43,12.94 80.00,16.00"/>
  <polygon id="C-107" class="puesto" data-codigo="C-107" data-tipo="carro" points="80.00,16.00 77.43,12.94 79.43,12.94 82.00,16.00"/>
  <polygon id="C-108" class="puesto" data-codigo="C-108" data-tipo="carro" points="82.00,16.00 79.43,12.94 81.43,12.94 84.00,16.00"/>
  <polygon id="C-109" class="puesto" data-codigo="C-109" data-tipo="carro" points="84.00,16.00 81.43,12.94 83.43,12.94 86.00,16.00"/>
  <polygon id="C-110" class="puesto" data-codigo="C-110" data-tipo="carro" points="86.00,16.00 83.43,12.94 85.43,12.94 88.00,16.00"/>
  <polygon id="C-111" class="puesto" data-codigo="C-111" data-tipo="carro" points="88.00,16.00 85.43,12.94 87.43,12.94 90.00,16.00"/>
  <polygon id="C-112" class="puesto" data-codigo="C-112" data-tipo="carro" points="90.00,16.00 87.43,12.94 89.43,12.94 92.00,16.00"/>
  <polygon id="C-113" class="puesto" data-codigo="C-113" data-tipo="carro" points="92.00,16.00 89.43,12.94 91.43,12.94 94.00,16.00"/>
  <polygon id="C-114" class="puesto" data-codigo="C-114" data-tipo="carro" points="94.00,16.00 91.43,12.94 93.43,12.94 96.00,16.00"/>
  <polygon id="C-115" class="puesto" data-codigo="C-115" data-tipo="carro" points="96.00,16.00 93.43,12.94 95.43,12.94 98.00,16.00"/>
  <polygon id="C-116" class="puesto" data-codigo="C-116" data-tipo="carro" points="98.00,16.00 95.43,12.94 97.43,12.94 100.00,16.00"/>
  <polygon id="C-117" class="puesto" data-codigo="C-117" data-tipo="carro" points="100.00,16.00 97.43,12.94 99.43,12.94 102.00,16.00"/>
  <polygon id="C-118" class="puesto" data-codigo="C-118" data-tipo="carro" points="102.00,16.00 99.43,12.94 101.43,12.94 104.00,16.00"/>
</g>
<g class="base"><line x1="76.00" y1="-0.00" x2="78.00" y2="-0.00"/><line x1="72.94" y1="2.57" x2="74.94" y2="2.57"/><line x1="75.62" y1="0.32" x2="77.62" y2="0.32"/><line x1="75.23" y1="0.64" x2="77.23" y2="0.64"/><line x1="74.85" y1="0.96" x2="76.85" y2="0.96"/><line x1="74.47" y1="1.29" x2="76.47" y2="1.29"/><line x1="74.09" y1="1.61" x2="76.09" y2="1.61"/><line x1="73.70" y1="1.93" x2="75.70" y2="1.93"/><line x1="73.32" y1="2.25" x2="75.32" y2="2.25"/></g>
</svg>$svg$, true);

  INSERT INTO secciones(nombre, descripcion, capacidad, cupos_disponibles, tipo_vehiculo, es_preferencial, id_parqueadero) VALUES
    ('C-01', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-02', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-03', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-04', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-05', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-06', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-07', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-08', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-09', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-10', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-11', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-12', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-13', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-14', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-15', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-16', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-17', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-18', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-19', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-20', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-21', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-22', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-23', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-24', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-25', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-26', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-27', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-28', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-29', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-30', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-31', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-32', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-33', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-34', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-35', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', true, 1),
    ('C-36', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', true, 1),
    ('C-37', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-38', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-39', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-40', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-41', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-42', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-43', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-44', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-45', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-46', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-47', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-48', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-49', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-50', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-51', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-52', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-53', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-54', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-55', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-56', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-57', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-58', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-59', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-60', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-61', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-62', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-63', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-64', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-65', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-66', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-67', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-68', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-69', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-70', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-71', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-72', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-73', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-74', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-75', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-76', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-77', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-78', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-79', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-80', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-81', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-82', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-83', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-84', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-85', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-86', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-87', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-88', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-89', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-90', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-91', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-92', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-93', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-94', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-95', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-96', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-97', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-98', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-99', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-100', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-101', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-102', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-103', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-104', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-105', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-106', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-107', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-108', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-109', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-110', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-111', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-112', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-113', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-114', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-115', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-116', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-117', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1),
    ('C-118', 'Cupo real del plano P1 - Central (Carros)', 1, 1, 'CARRO', false, 1);

  -- P2 - Central (Motos): limpiar historial/estructura previa
  DELETE FROM ocupaciones WHERE id_parqueadero=2;
  DELETE FROM movimientos WHERE id_parqueadero=2;
  DELETE FROM coordenadas_seccion WHERE id_seccion IN (SELECT id FROM secciones WHERE id_parqueadero=2);
  DELETE FROM planos_parqueadero WHERE id_parqueadero=2;
  DELETE FROM secciones WHERE id_parqueadero=2;

  UPDATE parqueaderos SET nombre='P2 - Central (Motos)', ubicacion='Acceso central, zona de motos', capacidad_total=147, cupos_disponibles=147 WHERE id=2;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo) VALUES (2, $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3.73 -17.39 79.73 44.85">
<style>
  .base{fill:none;stroke:var(--border);stroke-width:.09}
  .puesto{fill:var(--surface-2);stroke:var(--border);stroke-width:.12;cursor:pointer;transition:fill .15s}
  .puesto.preferencial{fill:var(--surface-2)}
  .marcaX{fill:none;stroke:var(--gold);stroke-width:.14;pointer-events:none}
  .puesto.libre{fill:#4caf50}
  .puesto.ocupado{fill:#ef5350}
  .puesto.selected{fill:#1565c0}
  .readonly .puesto{cursor:default}
</style>
<rect x="-3.73" y="-17.39" width="79.73" height="44.85" fill="var(--card)" stroke="var(--border)" stroke-width=".12"/>
<g id="puestos">
  <polygon id="M-01" class="puesto" data-codigo="M-01" data-tipo="moto" points="17.39,-3.64 15.97,-2.23 15.27,-2.94 16.68,-4.35"/>
  <polygon id="M-02" class="puesto" data-codigo="M-02" data-tipo="moto" points="18.09,-2.94 16.68,-1.52 15.97,-2.23 17.39,-3.64"/>
  <polygon id="M-03" class="puesto" data-codigo="M-03" data-tipo="moto" points="18.80,-2.23 17.39,-0.81 16.68,-1.52 18.09,-2.94"/>
  <polygon id="M-04" class="puesto" data-codigo="M-04" data-tipo="moto" points="20.92,-2.94 19.51,-1.52 18.80,-2.23 20.22,-3.64"/>
  <polygon id="M-05" class="puesto" data-codigo="M-05" data-tipo="moto" points="21.63,-2.23 20.22,-0.81 19.51,-1.52 20.92,-2.94"/>
  <polygon id="M-06" class="puesto" data-codigo="M-06" data-tipo="moto" points="22.34,-1.52 20.92,-0.11 20.22,-0.81 21.63,-2.23"/>
  <polygon id="M-07" class="puesto" data-codigo="M-07" data-tipo="moto" points="0.27,-2.94 0.27,-0.94 -0.73,-0.94 -0.73,-2.94"/>
  <polygon id="M-08" class="puesto" data-codigo="M-08" data-tipo="moto" points="1.27,-2.94 1.27,-0.94 0.27,-0.94 0.27,-2.94"/>
  <polygon id="M-09" class="puesto" data-codigo="M-09" data-tipo="moto" points="2.27,-2.94 2.27,-0.94 1.27,-0.94 1.27,-2.94"/>
  <polygon id="M-10" class="puesto" data-codigo="M-10" data-tipo="moto" points="3.27,-2.94 3.27,-0.94 2.27,-0.94 2.27,-2.94"/>
  <polygon id="M-11" class="puesto" data-codigo="M-11" data-tipo="moto" points="4.27,-2.94 4.27,-0.94 3.27,-0.94 3.27,-2.94"/>
  <polygon id="M-12" class="puesto" data-codigo="M-12" data-tipo="moto" points="5.27,-2.94 5.27,-0.94 4.27,-0.94 4.27,-2.94"/>
  <polygon id="M-13" class="puesto" data-codigo="M-13" data-tipo="moto" points="6.27,-2.94 6.27,-0.94 5.27,-0.94 5.27,-2.94"/>
  <polygon id="M-14" class="puesto" data-codigo="M-14" data-tipo="moto" points="7.27,-2.94 7.27,-0.94 6.27,-0.94 6.27,-2.94"/>
  <polygon id="M-15" class="puesto" data-codigo="M-15" data-tipo="moto" points="8.27,-2.94 8.27,-0.94 7.27,-0.94 7.27,-2.94"/>
  <polygon id="M-16" class="puesto" data-codigo="M-16" data-tipo="moto" points="9.27,-2.94 9.27,-0.94 8.27,-0.94 8.27,-2.94"/>
  <polygon id="M-17" class="puesto" data-codigo="M-17" data-tipo="moto" points="10.27,-2.94 10.27,-0.94 9.27,-0.94 9.27,-2.94"/>
  <polygon id="M-18" class="puesto" data-codigo="M-18" data-tipo="moto" points="11.27,-2.94 11.27,-0.94 10.27,-0.94 10.27,-2.94"/>
  <polygon id="M-19" class="puesto" data-codigo="M-19" data-tipo="moto" points="28.46,-2.23 27.04,-0.81 26.34,-1.52 27.75,-2.94"/>
  <polygon id="M-20" class="puesto" data-codigo="M-20" data-tipo="moto" points="29.16,-1.52 27.75,-0.11 27.04,-0.81 28.46,-2.23"/>
  <polygon id="M-21" class="puesto" data-codigo="M-21" data-tipo="moto" points="29.87,-0.81 28.46,0.60 27.75,-0.11 29.16,-1.52"/>
  <polygon id="M-22" class="puesto" data-codigo="M-22" data-tipo="moto" points="31.99,-1.52 30.58,-0.11 29.87,-0.81 31.29,-2.23"/>
  <polygon id="M-23" class="puesto" data-codigo="M-23" data-tipo="moto" points="32.70,-0.81 31.29,0.60 30.58,-0.11 31.99,-1.52"/>
  <polygon id="M-24" class="puesto" data-codigo="M-24" data-tipo="moto" points="33.41,-0.11 31.99,1.31 31.29,0.60 32.70,-0.81"/>
  <polygon id="M-25" class="puesto" data-codigo="M-25" data-tipo="moto" points="35.53,-0.81 34.11,0.60 33.41,-0.11 34.82,-1.52"/>
  <polygon id="M-26" class="puesto" data-codigo="M-26" data-tipo="moto" points="36.24,-0.11 34.82,1.31 34.11,0.60 35.53,-0.81"/>
  <polygon id="M-27" class="puesto" data-codigo="M-27" data-tipo="moto" points="36.94,0.60 35.53,2.01 34.82,1.31 36.24,-0.11"/>
  <polygon id="M-28" class="puesto" data-codigo="M-28" data-tipo="moto" points="39.06,-0.11 37.65,1.31 36.94,0.60 38.36,-0.81"/>
  <polygon id="M-29" class="puesto" data-codigo="M-29" data-tipo="moto" points="39.77,0.60 38.36,2.01 37.65,1.31 39.06,-0.11"/>
  <polygon id="M-30" class="puesto" data-codigo="M-30" data-tipo="moto" points="40.48,1.31 39.06,2.72 38.36,2.01 39.77,0.60"/>
  <polygon id="M-31" class="puesto" data-codigo="M-31" data-tipo="moto" points="42.59,0.59 41.17,2.00 40.48,1.31 41.89,-0.11"/>
  <polygon id="M-32" class="puesto" data-codigo="M-32" data-tipo="moto" points="43.29,1.29 41.88,2.71 41.17,2.00 42.59,0.59"/>
  <polygon id="M-33" class="puesto" data-codigo="M-33" data-tipo="moto" points="44.00,2.00 42.59,3.41 41.88,2.71 43.29,1.29"/>
  <polygon id="M-34" class="puesto" data-codigo="M-34" data-tipo="moto" points="45.00,4.00 45.00,2.00 44.00,2.00 44.00,4.00"/>
  <polygon id="M-35" class="puesto" data-codigo="M-35" data-tipo="moto" points="46.00,4.00 46.00,2.00 45.00,2.00 45.00,4.00"/>
  <polygon id="M-36" class="puesto" data-codigo="M-36" data-tipo="moto" points="47.00,4.00 47.00,2.00 46.00,2.00 46.00,4.00"/>
  <polygon id="M-37" class="puesto" data-codigo="M-37" data-tipo="moto" points="48.00,4.00 48.00,2.00 47.00,2.00 47.00,4.00"/>
  <polygon id="M-38" class="puesto" data-codigo="M-38" data-tipo="moto" points="49.00,4.00 49.00,2.00 48.00,2.00 48.00,4.00"/>
  <polygon id="M-39" class="puesto" data-codigo="M-39" data-tipo="moto" points="50.00,4.00 50.00,2.00 49.00,2.00 49.00,4.00"/>
  <polygon id="M-40" class="puesto" data-codigo="M-40" data-tipo="moto" points="51.00,4.00 51.00,2.00 50.00,2.00 50.00,4.00"/>
  <polygon id="M-41" class="puesto" data-codigo="M-41" data-tipo="moto" points="52.00,4.00 52.00,2.00 51.00,2.00 51.00,4.00"/>
  <polygon id="M-42" class="puesto" data-codigo="M-42" data-tipo="moto" points="52.00,4.00 52.00,2.00 53.00,2.00 53.00,4.00"/>
  <polygon id="M-43" class="puesto" data-codigo="M-43" data-tipo="moto" points="57.00,5.00 57.00,3.00 56.00,3.00 56.00,5.00"/>
  <polygon id="M-44" class="puesto" data-codigo="M-44" data-tipo="moto" points="58.00,5.00 58.00,3.00 57.00,3.00 57.00,5.00"/>
  <polygon id="M-45" class="puesto" data-codigo="M-45" data-tipo="moto" points="59.00,5.00 59.00,3.00 58.00,3.00 58.00,5.00"/>
  <polygon id="M-46" class="puesto" data-codigo="M-46" data-tipo="moto" points="60.00,5.00 60.00,3.00 59.00,3.00 59.00,5.00"/>
  <polygon id="M-47" class="puesto" data-codigo="M-47" data-tipo="moto" points="61.00,5.00 61.00,3.00 60.00,3.00 60.00,5.00"/>
  <polygon id="M-48" class="puesto" data-codigo="M-48" data-tipo="moto" points="62.00,5.00 62.00,3.00 61.00,3.00 61.00,5.00"/>
  <polygon id="M-49" class="puesto" data-codigo="M-49" data-tipo="moto" points="63.00,5.00 63.00,3.00 62.00,3.00 62.00,5.00"/>
  <polygon id="M-50" class="puesto" data-codigo="M-50" data-tipo="moto" points="64.00,5.00 64.00,3.00 63.00,3.00 63.00,5.00"/>
  <polygon id="M-51" class="puesto" data-codigo="M-51" data-tipo="moto" points="65.00,5.00 65.00,3.00 64.00,3.00 64.00,5.00"/>
  <polygon id="M-52" class="puesto" data-codigo="M-52" data-tipo="moto" points="66.00,5.00 66.00,3.00 65.00,3.00 65.00,5.00"/>
  <polygon id="M-53" class="puesto" data-codigo="M-53" data-tipo="moto" points="67.00,5.00 67.00,3.00 66.00,3.00 66.00,5.00"/>
  <polygon id="M-54" class="puesto" data-codigo="M-54" data-tipo="moto" points="68.00,5.00 68.00,3.00 67.00,3.00 67.00,5.00"/>
  <polygon id="M-55" class="puesto" data-codigo="M-55" data-tipo="moto" points="69.00,5.00 69.00,3.00 68.00,3.00 68.00,5.00"/>
  <polygon id="M-56" class="puesto" data-codigo="M-56" data-tipo="moto" points="70.00,5.00 70.00,3.00 69.00,3.00 69.00,5.00"/>
  <polygon id="M-57" class="puesto" data-codigo="M-57" data-tipo="moto" points="71.00,5.00 71.00,3.00 70.00,3.00 70.00,5.00"/>
  <polygon id="M-58" class="puesto" data-codigo="M-58" data-tipo="moto" points="71.00,5.00 71.00,3.00 72.00,3.00 72.00,5.00"/>
  <polygon id="M-59" class="puesto" data-codigo="M-59" data-tipo="moto" points="72.00,5.00 72.00,3.00 73.00,3.00 73.00,5.00"/>
  <polygon id="M-60" class="puesto" data-codigo="M-60" data-tipo="moto" points="57.00,9.00 57.00,7.00 56.00,7.00 56.00,9.00"/>
  <polygon id="M-61" class="puesto" data-codigo="M-61" data-tipo="moto" points="58.00,9.00 58.00,7.00 57.00,7.00 57.00,9.00"/>
  <polygon id="M-62" class="puesto" data-codigo="M-62" data-tipo="moto" points="59.00,9.00 59.00,7.00 58.00,7.00 58.00,9.00"/>
  <polygon id="M-63" class="puesto" data-codigo="M-63" data-tipo="moto" points="60.00,9.00 60.00,7.00 59.00,7.00 59.00,9.00"/>
  <polygon id="M-64" class="puesto" data-codigo="M-64" data-tipo="moto" points="63.00,11.00 63.00,9.00 64.00,9.00 64.00,11.00"/>
  <polygon id="M-65" class="puesto" data-codigo="M-65" data-tipo="moto" points="64.00,9.00 64.00,7.00 63.00,7.00 63.00,9.00"/>
  <polygon id="M-66" class="puesto" data-codigo="M-66" data-tipo="moto" points="64.00,11.00 64.00,9.00 65.00,9.00 65.00,11.00"/>
  <polygon id="M-67" class="puesto" data-codigo="M-67" data-tipo="moto" points="65.00,9.00 65.00,7.00 64.00,7.00 64.00,9.00"/>
  <polygon id="M-68" class="puesto" data-codigo="M-68" data-tipo="moto" points="65.00,11.00 65.00,9.00 66.00,9.00 66.00,11.00"/>
  <polygon id="M-69" class="puesto" data-codigo="M-69" data-tipo="moto" points="66.00,9.00 66.00,7.00 65.00,7.00 65.00,9.00"/>
  <polygon id="M-70" class="puesto" data-codigo="M-70" data-tipo="moto" points="66.00,11.00 66.00,9.00 67.00,9.00 67.00,11.00"/>
  <polygon id="M-71" class="puesto" data-codigo="M-71" data-tipo="moto" points="66.00,9.00 66.00,7.00 67.00,7.00 67.00,9.00"/>
  <polygon id="M-72" class="puesto" data-codigo="M-72" data-tipo="moto" points="67.00,11.00 67.00,9.00 68.00,9.00 68.00,11.00"/>
  <polygon id="M-73" class="puesto" data-codigo="M-73" data-tipo="moto" points="67.00,9.00 67.00,7.00 68.00,7.00 68.00,9.00"/>
  <polygon id="M-74" class="puesto" data-codigo="M-74" data-tipo="moto" points="68.00,11.00 68.00,9.00 69.00,9.00 69.00,11.00"/>
  <polygon id="M-75" class="puesto" data-codigo="M-75" data-tipo="moto" points="68.00,9.00 68.00,7.00 69.00,7.00 69.00,9.00"/>
  <polygon id="M-76" class="puesto" data-codigo="M-76" data-tipo="moto" points="69.00,11.00 69.00,9.00 70.00,9.00 70.00,11.00"/>
  <polygon id="M-77" class="puesto" data-codigo="M-77" data-tipo="moto" points="69.00,9.00 69.00,7.00 70.00,7.00 70.00,9.00"/>
  <polygon id="M-78" class="puesto" data-codigo="M-78" data-tipo="moto" points="70.00,11.00 70.00,9.00 71.00,9.00 71.00,11.00"/>
  <polygon id="M-79" class="puesto" data-codigo="M-79" data-tipo="moto" points="70.00,9.00 70.00,7.00 71.00,7.00 71.00,9.00"/>
  <polygon id="M-80" class="puesto" data-codigo="M-80" data-tipo="moto" points="71.00,11.00 71.00,9.00 72.00,9.00 72.00,11.00"/>
  <polygon id="M-81" class="puesto" data-codigo="M-81" data-tipo="moto" points="71.00,9.00 71.00,7.00 72.00,7.00 72.00,9.00"/>
  <polygon id="M-82" class="puesto" data-codigo="M-82" data-tipo="moto" points="72.00,11.00 72.00,9.00 73.00,9.00 73.00,11.00"/>
  <polygon id="M-83" class="puesto" data-codigo="M-83" data-tipo="moto" points="72.00,9.00 72.00,7.00 73.00,7.00 73.00,9.00"/>
  <polygon id="M-84" class="puesto" data-codigo="M-84" data-tipo="moto" points="0.00,10.00 0.00,8.00 1.00,8.00 1.00,10.00"/>
  <polygon id="M-85" class="puesto" data-codigo="M-85" data-tipo="moto" points="1.00,10.00 1.00,8.00 2.00,8.00 2.00,10.00"/>
  <polygon id="M-86" class="puesto" data-codigo="M-86" data-tipo="moto" points="2.00,10.00 2.00,8.00 3.00,8.00 3.00,10.00"/>
  <polygon id="M-87" class="puesto" data-codigo="M-87" data-tipo="moto" points="3.00,10.00 3.00,8.00 4.00,8.00 4.00,10.00"/>
  <polygon id="M-88" class="puesto" data-codigo="M-88" data-tipo="moto" points="4.00,10.00 4.00,8.00 5.00,8.00 5.00,10.00"/>
  <polygon id="M-89" class="puesto" data-codigo="M-89" data-tipo="moto" points="5.00,10.00 5.00,8.00 6.00,8.00 6.00,10.00"/>
  <polygon id="M-90" class="puesto" data-codigo="M-90" data-tipo="moto" points="6.00,10.00 6.00,8.00 7.00,8.00 7.00,10.00"/>
  <polygon id="M-91" class="puesto" data-codigo="M-91" data-tipo="moto" points="7.00,10.00 7.00,8.00 8.00,8.00 8.00,10.00"/>
  <polygon id="M-92" class="puesto" data-codigo="M-92" data-tipo="moto" points="8.00,10.00 8.00,8.00 9.00,8.00 9.00,10.00"/>
  <polygon id="M-93" class="puesto" data-codigo="M-93" data-tipo="moto" points="9.00,10.00 9.00,8.00 10.00,8.00 10.00,10.00"/>
  <polygon id="M-94" class="puesto" data-codigo="M-94" data-tipo="moto" points="10.00,10.00 10.00,8.00 11.00,8.00 11.00,10.00"/>
  <polygon id="M-95" class="puesto" data-codigo="M-95" data-tipo="moto" points="11.00,10.00 11.00,8.00 12.00,8.00 12.00,10.00"/>
  <polygon id="M-96" class="puesto" data-codigo="M-96" data-tipo="moto" points="12.00,10.00 12.00,8.00 13.00,8.00 13.00,10.00"/>
  <polygon id="M-97" class="puesto" data-codigo="M-97" data-tipo="moto" points="13.00,10.00 13.00,8.00 14.00,8.00 14.00,10.00"/>
  <polygon id="M-98" class="puesto" data-codigo="M-98" data-tipo="moto" points="14.00,10.00 14.00,8.00 15.00,8.00 15.00,10.00"/>
  <polygon id="M-99" class="puesto" data-codigo="M-99" data-tipo="moto" points="15.00,10.00 15.00,8.00 16.00,8.00 16.00,10.00"/>
  <polygon id="M-100" class="puesto" data-codigo="M-100" data-tipo="moto" points="16.00,10.00 16.00,8.00 17.00,8.00 17.00,10.00"/>
  <polygon id="M-101" class="puesto" data-codigo="M-101" data-tipo="moto" points="17.00,10.00 17.00,8.00 18.00,8.00 18.00,10.00"/>
  <polygon id="M-102" class="puesto" data-codigo="M-102" data-tipo="moto" points="18.00,10.00 18.00,8.00 19.00,8.00 19.00,10.00"/>
  <polygon id="M-103" class="puesto" data-codigo="M-103" data-tipo="moto" points="19.00,10.00 19.00,8.00 20.00,8.00 20.00,10.00"/>
  <polygon id="M-104" class="puesto" data-codigo="M-104" data-tipo="moto" points="20.00,10.00 20.00,8.00 21.00,8.00 21.00,10.00"/>
  <polygon id="M-105" class="puesto" data-codigo="M-105" data-tipo="moto" points="21.00,10.00 21.00,8.00 22.00,8.00 22.00,10.00"/>
  <polygon id="M-106" class="puesto" data-codigo="M-106" data-tipo="moto" points="22.00,10.00 22.00,8.00 23.00,8.00 23.00,10.00"/>
  <polygon id="M-107" class="puesto" data-codigo="M-107" data-tipo="moto" points="23.00,10.00 23.00,8.00 24.00,8.00 24.00,10.00"/>
  <polygon id="M-108" class="puesto" data-codigo="M-108" data-tipo="moto" points="24.00,10.00 24.00,8.00 25.00,8.00 25.00,10.00"/>
  <polygon id="M-109" class="puesto" data-codigo="M-109" data-tipo="moto" points="25.00,10.00 25.00,8.00 26.00,8.00 26.00,10.00"/>
  <polygon id="M-110" class="puesto" data-codigo="M-110" data-tipo="moto" points="26.00,10.00 26.00,8.00 27.00,8.00 27.00,10.00"/>
  <polygon id="M-111" class="puesto" data-codigo="M-111" data-tipo="moto" points="27.00,10.00 27.00,8.00 28.00,8.00 28.00,10.00"/>
  <polygon id="M-112" class="puesto" data-codigo="M-112" data-tipo="moto" points="28.00,10.00 28.00,8.00 29.00,8.00 29.00,10.00"/>
  <polygon id="M-113" class="puesto" data-codigo="M-113" data-tipo="moto" points="29.00,10.00 29.00,8.00 30.00,8.00 30.00,10.00"/>
  <polygon id="M-114" class="puesto" data-codigo="M-114" data-tipo="moto" points="30.00,10.00 30.00,8.00 31.00,8.00 31.00,10.00"/>
  <polygon id="M-115" class="puesto" data-codigo="M-115" data-tipo="moto" points="31.00,10.00 31.00,8.00 32.00,8.00 32.00,10.00"/>
  <polygon id="M-116" class="puesto" data-codigo="M-116" data-tipo="moto" points="32.00,10.00 32.00,8.00 33.00,8.00 33.00,10.00"/>
  <polygon id="M-117" class="puesto" data-codigo="M-117" data-tipo="moto" points="33.00,10.00 33.00,8.00 34.00,8.00 34.00,10.00"/>
  <polygon id="M-118" class="puesto" data-codigo="M-118" data-tipo="moto" points="34.00,10.00 34.00,8.00 35.00,8.00 35.00,10.00"/>
  <polygon id="M-119" class="puesto" data-codigo="M-119" data-tipo="moto" points="35.00,10.00 35.00,8.00 36.00,8.00 36.00,10.00"/>
  <polygon id="M-120" class="puesto" data-codigo="M-120" data-tipo="moto" points="36.00,10.00 36.00,8.00 37.00,8.00 37.00,10.00"/>
  <polygon id="M-121" class="puesto" data-codigo="M-121" data-tipo="moto" points="37.00,10.00 37.00,8.00 38.00,8.00 38.00,10.00"/>
  <polygon id="M-122" class="puesto" data-codigo="M-122" data-tipo="moto" points="38.00,10.00 38.00,8.00 39.00,8.00 39.00,10.00"/>
  <polygon id="M-123" class="puesto" data-codigo="M-123" data-tipo="moto" points="39.00,10.00 39.00,8.00 40.00,8.00 40.00,10.00"/>
  <polygon id="M-124" class="puesto" data-codigo="M-124" data-tipo="moto" points="40.00,10.00 40.00,8.00 41.00,8.00 41.00,10.00"/>
  <polygon id="M-125" class="puesto" data-codigo="M-125" data-tipo="moto" points="41.00,10.00 41.00,8.00 42.00,8.00 42.00,10.00"/>
  <polygon id="M-126" class="puesto" data-codigo="M-126" data-tipo="moto" points="42.00,10.00 42.00,8.00 43.00,8.00 43.00,10.00"/>
  <polygon id="M-127" class="puesto" data-codigo="M-127" data-tipo="moto" points="43.00,10.00 43.00,8.00 44.00,8.00 44.00,10.00"/>
  <polygon id="M-128" class="puesto" data-codigo="M-128" data-tipo="moto" points="44.00,10.00 44.00,8.00 45.00,8.00 45.00,10.00"/>
  <polygon id="M-129" class="puesto" data-codigo="M-129" data-tipo="moto" points="45.00,10.00 45.00,8.00 46.00,8.00 46.00,10.00"/>
  <polygon id="M-130" class="puesto" data-codigo="M-130" data-tipo="moto" points="46.00,10.00 46.00,8.00 47.00,8.00 47.00,10.00"/>
  <polygon id="M-131" class="puesto" data-codigo="M-131" data-tipo="moto" points="47.00,10.00 47.00,8.00 48.00,8.00 48.00,10.00"/>
  <polygon id="M-132" class="puesto" data-codigo="M-132" data-tipo="moto" points="48.00,10.00 48.00,8.00 49.00,8.00 49.00,10.00"/>
  <polygon id="M-133" class="puesto" data-codigo="M-133" data-tipo="moto" points="49.00,10.00 49.00,8.00 50.00,8.00 50.00,10.00"/>
  <polygon id="M-134" class="puesto" data-codigo="M-134" data-tipo="moto" points="50.00,10.00 50.00,8.00 51.00,8.00 51.00,10.00"/>
  <polygon id="M-135" class="puesto" data-codigo="M-135" data-tipo="moto" points="51.00,10.00 51.00,8.00 52.00,8.00 52.00,10.00"/>
  <polygon id="M-136" class="puesto" data-codigo="M-136" data-tipo="moto" points="52.00,10.00 52.00,8.00 53.00,8.00 53.00,10.00"/>
  <polygon id="M-137" class="puesto" data-codigo="M-137" data-tipo="moto" points="53.00,10.00 53.00,8.00 54.00,8.00 54.00,10.00"/>
  <polygon id="M-138" class="puesto" data-codigo="M-138" data-tipo="moto" points="63.00,15.00 63.00,13.00 64.00,13.00 64.00,15.00"/>
  <polygon id="M-139" class="puesto" data-codigo="M-139" data-tipo="moto" points="64.00,15.00 64.00,13.00 65.00,13.00 65.00,15.00"/>
  <polygon id="M-140" class="puesto" data-codigo="M-140" data-tipo="moto" points="65.00,15.00 65.00,13.00 66.00,13.00 66.00,15.00"/>
  <polygon id="M-141" class="puesto" data-codigo="M-141" data-tipo="moto" points="66.00,15.00 66.00,13.00 67.00,13.00 67.00,15.00"/>
  <polygon id="M-142" class="puesto" data-codigo="M-142" data-tipo="moto" points="67.00,15.00 67.00,13.00 68.00,13.00 68.00,15.00"/>
  <polygon id="M-143" class="puesto" data-codigo="M-143" data-tipo="moto" points="68.00,15.00 68.00,13.00 69.00,13.00 69.00,15.00"/>
  <polygon id="M-144" class="puesto" data-codigo="M-144" data-tipo="moto" points="69.00,15.00 69.00,13.00 70.00,13.00 70.00,15.00"/>
  <polygon id="M-145" class="puesto" data-codigo="M-145" data-tipo="moto" points="70.00,15.00 70.00,13.00 71.00,13.00 71.00,15.00"/>
  <polygon id="M-146" class="puesto" data-codigo="M-146" data-tipo="moto" points="71.00,15.00 71.00,13.00 72.00,13.00 72.00,15.00"/>
  <polygon id="M-147" class="puesto" data-codigo="M-147" data-tipo="moto" points="72.00,15.00 72.00,13.00 73.00,13.00 73.00,15.00"/>
</g>
<g class="base"><line x1="26.34" y1="-1.52" x2="22.34" y2="-1.52"/><line x1="26.34" y1="-1.52" x2="26.34" y2="-2.02"/><line x1="26.34" y1="-2.02" x2="26.34" y2="-2.52"/><line x1="26.34" y1="-2.52" x2="26.34" y2="-3.02"/><line x1="26.34" y1="-3.02" x2="26.34" y2="-3.52"/><line x1="22.34" y1="-1.52" x2="22.34" y2="-2.02"/><line x1="22.34" y1="-2.02" x2="22.34" y2="-2.52"/><line x1="22.34" y1="-2.52" x2="22.34" y2="-3.02"/><line x1="22.34" y1="-3.02" x2="22.34" y2="-3.52"/><line x1="22.34" y1="-3.52" x2="26.34" y2="-3.52"/><line x1="22.34" y1="-3.02" x2="26.34" y2="-3.02"/><line x1="22.34" y1="-2.02" x2="26.34" y2="-2.02"/><line x1="22.34" y1="-2.52" x2="26.34" y2="-2.52"/><line x1="15.27" y1="-2.94" x2="11.27" y2="-2.94"/><line x1="15.27" y1="-2.94" x2="15.27" y2="-3.44"/><line x1="15.27" y1="-3.44" x2="15.27" y2="-3.94"/><line x1="15.27" y1="-3.94" x2="15.27" y2="-4.44"/><line x1="15.27" y1="-4.44" x2="15.27" y2="-4.94"/><line x1="11.27" y1="-2.94" x2="11.27" y2="-3.44"/><line x1="11.27" y1="-3.44" x2="11.27" y2="-3.94"/><line x1="11.27" y1="-3.94" x2="11.27" y2="-4.44"/><line x1="11.27" y1="-4.44" x2="11.27" y2="-4.94"/><line x1="11.27" y1="-4.94" x2="15.27" y2="-4.94"/><line x1="11.27" y1="-4.44" x2="15.27" y2="-4.44"/><line x1="15.27" y1="-3.94" x2="11.27" y2="-3.94"/><line x1="11.27" y1="-3.44" x2="15.27" y2="-3.44"/></g>
</svg>$svg$, true);

  INSERT INTO secciones(nombre, descripcion, capacidad, cupos_disponibles, tipo_vehiculo, es_preferencial, id_parqueadero) VALUES
    ('M-01', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-02', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-03', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-04', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-05', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-06', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-07', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-08', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-09', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-10', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-11', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-12', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-13', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-14', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-15', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-16', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-17', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-18', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-19', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-20', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-21', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-22', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-23', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-24', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-25', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-26', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-27', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-28', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-29', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-30', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-31', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-32', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-33', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-34', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-35', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-36', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-37', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-38', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-39', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-40', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-41', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-42', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-43', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-44', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-45', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-46', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-47', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-48', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-49', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-50', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-51', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-52', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-53', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-54', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-55', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-56', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-57', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-58', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-59', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-60', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-61', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-62', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-63', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-64', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-65', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-66', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-67', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-68', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-69', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-70', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-71', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-72', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-73', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-74', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-75', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-76', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-77', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-78', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-79', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-80', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-81', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-82', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-83', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-84', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-85', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-86', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-87', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-88', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-89', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-90', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-91', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-92', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-93', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-94', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-95', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-96', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-97', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-98', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-99', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-100', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-101', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-102', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-103', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-104', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-105', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-106', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-107', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-108', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-109', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-110', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-111', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-112', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-113', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-114', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-115', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-116', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-117', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-118', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-119', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-120', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-121', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-122', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-123', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-124', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-125', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-126', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-127', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-128', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-129', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-130', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-131', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-132', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-133', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-134', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-135', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-136', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-137', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-138', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-139', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-140', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-141', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-142', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-143', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-144', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-145', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-146', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2),
    ('M-147', 'Cupo real del plano P2 - Central (Motos)', 1, 1, 'MOTO', false, 2);

  -- P3 - Facultad de Ingeniería: limpiar historial/estructura previa
  DELETE FROM ocupaciones WHERE id_parqueadero=3;
  DELETE FROM movimientos WHERE id_parqueadero=3;
  DELETE FROM coordenadas_seccion WHERE id_seccion IN (SELECT id FROM secciones WHERE id_parqueadero=3);
  DELETE FROM planos_parqueadero WHERE id_parqueadero=3;
  DELETE FROM secciones WHERE id_parqueadero=3;

  UPDATE parqueaderos SET nombre='P3 - Facultad de Ingeniería', ubicacion='Facultad de Ingeniería', capacidad_total=39, cupos_disponibles=39 WHERE id=3;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo) VALUES (3, $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14.32 28.74 81.82 46.02">
<style>
  .base{fill:none;stroke:var(--border);stroke-width:.09}
  .puesto{fill:var(--surface-2);stroke:var(--border);stroke-width:.12;cursor:pointer;transition:fill .15s}
  .puesto.preferencial{fill:var(--surface-2)}
  .marcaX{fill:none;stroke:var(--gold);stroke-width:.14;pointer-events:none}
  .puesto.libre{fill:#4caf50}
  .puesto.ocupado{fill:#ef5350}
  .puesto.selected{fill:#1565c0}
  .readonly .puesto{cursor:default}
</style>
<rect x="-14.32" y="28.74" width="81.82" height="46.02" fill="var(--card)" stroke="var(--border)" stroke-width=".12"/>
<g id="puestos">
  <polygon id="C-01" class="puesto" data-codigo="C-01" data-tipo="carro" points="40.60,38.72 39.90,42.66 37.93,42.31 38.63,38.37"/>
  <polygon id="C-02" class="puesto" data-codigo="C-02" data-tipo="carro" points="42.56,39.07 41.87,43.01 39.90,42.66 40.60,38.72"/>
  <polygon id="C-03" class="puesto" data-codigo="C-03" data-tipo="carro" points="44.53,39.41 43.84,43.35 41.87,43.01 42.56,39.07"/>
  <polygon id="C-04" class="puesto" data-codigo="C-04" data-tipo="carro" points="46.50,39.76 45.81,43.70 43.84,43.35 44.53,39.41"/>
  <polygon id="C-05" class="puesto" data-codigo="C-05" data-tipo="carro" points="48.47,40.11 47.78,44.05 45.81,43.70 46.50,39.76"/>
  <polygon id="C-06" class="puesto" data-codigo="C-06" data-tipo="carro" points="50.44,40.46 49.75,44.40 47.78,44.05 48.47,40.11"/>
  <polygon id="C-07" class="puesto" data-codigo="C-07" data-tipo="carro" points="52.41,40.80 51.72,44.74 49.75,44.40 50.44,40.46"/>
  <polygon id="C-08" class="puesto" data-codigo="C-08" data-tipo="carro" points="57.59,43.59 54.76,46.41 53.34,45.00 56.17,42.17"/>
  <polygon id="C-09" class="puesto" data-codigo="C-09" data-tipo="carro" points="59.00,45.00 56.17,47.83 54.76,46.41 57.59,43.59"/>
  <polygon id="C-10" class="puesto" data-codigo="C-10" data-tipo="carro" points="60.34,46.34 57.51,49.17 56.17,47.83 59.00,45.00"/>
  <polygon id="C-11" class="puesto" data-codigo="C-11" data-tipo="carro" points="61.76,47.76 58.93,50.59 57.51,49.17 60.34,46.34"/>
  <polygon id="C-12" class="puesto" data-codigo="C-12" data-tipo="carro" points="61.76,47.76 58.93,50.59 60.34,52.00 63.17,49.17"/>
  <polygon id="C-13" class="puesto" data-codigo="C-13" data-tipo="carro" points="64.50,52.50 60.50,52.50 60.50,54.50 64.50,54.50"/>
  <polygon id="C-14" class="puesto" data-codigo="C-14" data-tipo="carro" points="64.50,54.50 60.50,54.50 60.50,56.50 64.50,56.50"/>
  <polygon id="C-15" class="puesto" data-codigo="C-15" data-tipo="carro" points="64.50,56.50 60.50,56.50 60.50,58.50 64.50,58.50"/>
  <polygon id="C-16" class="puesto" data-codigo="C-16" data-tipo="carro" points="64.50,58.50 60.50,58.50 60.50,60.50 64.50,60.50"/>
  <polygon id="C-17" class="puesto" data-codigo="C-17" data-tipo="carro" points="37.72,58.40 40.19,55.24 38.31,54.56 35.84,57.71"/>
  <polygon id="C-18" class="puesto" data-codigo="C-18" data-tipo="carro" points="39.60,59.08 42.07,55.93 40.19,55.24 37.72,58.40"/>
  <polygon id="C-19" class="puesto" data-codigo="C-19" data-tipo="carro" points="41.48,59.76 43.95,56.61 42.07,55.93 39.60,59.08"/>
  <polygon id="C-20" class="puesto" data-codigo="C-20" data-tipo="carro" points="43.36,60.45 45.82,57.30 43.95,56.61 41.48,59.76"/>
  <polygon id="C-21" class="puesto" data-codigo="C-21" data-tipo="carro" points="45.24,61.13 47.70,57.98 45.82,57.30 43.36,60.45"/>
  <polygon id="C-22" class="puesto" data-codigo="C-22" data-tipo="carro" points="47.12,61.82 49.58,58.66 47.70,57.98 45.24,61.13"/>
  <polygon id="C-23" class="puesto" data-codigo="C-23" data-tipo="carro" points="49.00,62.50 51.46,59.35 49.58,58.66 47.12,61.82"/>
  <polygon id="C-24" class="puesto" data-codigo="C-24" data-tipo="carro" points="50.60,63.08 53.07,59.93 51.46,59.35 49.00,62.50"/>
  <polygon id="C-25" class="puesto" data-codigo="C-25" data-tipo="carro" points="52.48,63.76 54.95,60.61 53.07,59.93 50.60,63.08"/>
  <polygon id="C-26" class="puesto" data-codigo="C-26" data-tipo="carro" points="54.36,64.45 56.82,61.30 54.95,60.61 52.48,63.76"/>
  <polygon id="C-27" class="puesto" data-codigo="C-27" data-tipo="carro" points="54.36,64.45 56.82,61.30 58.70,61.98 56.24,65.13"/>
  <polygon id="C-28" class="puesto" data-codigo="C-28" data-tipo="carro" points="-11.32,64.99 -11.32,62.99 -7.34,62.64 -7.34,64.64"/>
  <polygon id="C-29" class="puesto" data-codigo="C-29" data-tipo="carro" points="-7.34,64.64 -7.34,62.64 -3.40,61.95 -3.40,63.95"/>
  <polygon id="C-30" class="puesto" data-codigo="C-30" data-tipo="carro" points="-3.40,63.95 -3.40,61.95 0.47,60.91 0.47,62.91"/>
  <polygon id="C-31" class="puesto" data-codigo="C-31" data-tipo="carro" points="4.33,61.88 4.33,59.88 0.47,60.91 0.47,62.91"/>
  <polygon id="C-32" class="puesto" data-codigo="C-32" data-tipo="carro" points="8.27,61.18 8.27,59.18 4.33,59.88 4.33,61.88"/>
  <polygon id="C-33" class="puesto" data-codigo="C-33" data-tipo="carro" points="12.21,60.49 12.21,58.49 8.27,59.18 8.27,61.18"/>
  <polygon id="C-34" class="puesto" data-codigo="C-34" data-tipo="carro" points="16.15,59.80 16.15,57.80 12.21,58.49 12.21,60.49"/>
  <polygon id="C-35" class="puesto" data-codigo="C-35" data-tipo="carro" points="20.09,59.10 20.09,57.10 16.15,57.80 16.15,59.80"/>
  <polygon id="C-36" class="puesto" data-codigo="C-36" data-tipo="carro" points="24.03,58.41 24.03,56.41 20.09,57.10 20.09,59.10"/>
  <polygon id="C-37" class="puesto" data-codigo="C-37" data-tipo="carro" points="24.03,58.41 24.03,56.41 27.97,55.71 27.97,57.71"/>
  <polygon id="C-38" class="puesto" data-codigo="C-38" data-tipo="carro" points="31.91,57.02 31.91,55.02 27.97,55.71 27.97,57.71"/>
  <polygon id="C-39" class="puesto" data-codigo="C-39" data-tipo="carro" points="31.91,57.02 31.91,55.02 35.84,55.71 35.84,57.71"/>
</g>
<g class="base"></g>
</svg>$svg$, true);

  INSERT INTO secciones(nombre, descripcion, capacidad, cupos_disponibles, tipo_vehiculo, es_preferencial, id_parqueadero) VALUES
    ('C-01', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-02', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-03', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-04', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-05', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-06', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-07', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-08', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-09', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-10', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-11', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-12', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-13', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-14', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-15', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-16', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-17', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-18', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-19', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-20', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-21', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-22', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-23', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-24', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-25', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-26', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-27', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-28', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-29', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-30', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-31', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-32', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-33', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-34', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-35', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-36', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-37', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-38', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3),
    ('C-39', 'Cupo real del plano P3 - Facultad de Ingeniería', 1, 1, 'CARRO', false, 3);

  -- P4 - Facultad de Economía: limpiar historial/estructura previa
  DELETE FROM ocupaciones WHERE id_parqueadero=4;
  DELETE FROM movimientos WHERE id_parqueadero=4;
  DELETE FROM coordenadas_seccion WHERE id_seccion IN (SELECT id FROM secciones WHERE id_parqueadero=4);
  DELETE FROM planos_parqueadero WHERE id_parqueadero=4;
  DELETE FROM secciones WHERE id_parqueadero=4;

  UPDATE parqueaderos SET nombre='P4 - Facultad de Economía', ubicacion='Facultad de Economía', capacidad_total=227, cupos_disponibles=227 WHERE id=4;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo) VALUES (4, $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="-17.83 -5.00 90.67 51.00">
<style>
  .base{fill:none;stroke:var(--border);stroke-width:.09}
  .puesto{fill:var(--surface-2);stroke:var(--border);stroke-width:.12;cursor:pointer;transition:fill .15s}
  .puesto.preferencial{fill:var(--surface-2)}
  .marcaX{fill:none;stroke:var(--gold);stroke-width:.14;pointer-events:none}
  .puesto.libre{fill:#4caf50}
  .puesto.ocupado{fill:#ef5350}
  .puesto.selected{fill:#1565c0}
  .readonly .puesto{cursor:default}
</style>
<rect x="-17.83" y="-5.00" width="90.67" height="51.00" fill="var(--card)" stroke="var(--border)" stroke-width=".12"/>
<g id="puestos">
  <polygon id="C-01" class="puesto preferencial" data-codigo="C-01" data-tipo="discapacitado" points="21.00,-2.00 25.00,-2.00 25.00,-0.00 21.00,-0.00"/>
  <path class="marcaX" d="M 21.00 -2.00 L 25.00 -0.00 M 25.00 -2.00 L 21.00 -0.00"/>
  <polygon id="C-02" class="puesto preferencial" data-codigo="C-02" data-tipo="discapacitado" points="21.00,-0.00 25.00,-0.00 25.00,2.00 21.00,2.00"/>
  <path class="marcaX" d="M 21.00 -0.00 L 25.00 2.00 M 25.00 -0.00 L 21.00 2.00"/>
  <polygon id="C-03" class="puesto preferencial" data-codigo="C-03" data-tipo="discapacitado" points="21.00,2.00 25.00,2.00 25.00,4.00 21.00,4.00"/>
  <path class="marcaX" d="M 21.00 2.00 L 25.00 4.00 M 25.00 2.00 L 21.00 4.00"/>
  <polygon id="C-04" class="puesto" data-codigo="C-04" data-tipo="carro" points="21.00,4.00 25.00,4.00 25.00,6.00 21.00,6.00"/>
  <polygon id="C-05" class="puesto" data-codigo="C-05" data-tipo="carro" points="21.00,6.00 25.00,6.00 25.00,8.00 21.00,8.00"/>
  <polygon id="C-06" class="puesto" data-codigo="C-06" data-tipo="carro" points="21.00,8.00 25.00,8.00 25.00,10.00 21.00,10.00"/>
  <polygon id="C-07" class="puesto" data-codigo="C-07" data-tipo="carro" points="21.00,10.00 25.00,10.00 25.00,12.00 21.00,12.00"/>
  <polygon id="C-08" class="puesto" data-codigo="C-08" data-tipo="carro" points="21.00,12.00 25.00,12.00 25.00,14.00 21.00,14.00"/>
  <polygon id="C-09" class="puesto" data-codigo="C-09" data-tipo="carro" points="21.00,14.00 25.00,14.00 25.00,16.00 21.00,16.00"/>
  <polygon id="C-10" class="puesto" data-codigo="C-10" data-tipo="carro" points="21.00,16.00 25.00,16.00 25.00,18.00 21.00,18.00"/>
  <polygon id="C-11" class="puesto" data-codigo="C-11" data-tipo="carro" points="21.00,18.00 25.00,18.00 25.00,20.00 21.00,20.00"/>
  <polygon id="C-12" class="puesto" data-codigo="C-12" data-tipo="carro" points="21.00,20.00 25.00,20.00 25.00,22.00 21.00,22.00"/>
  <polygon id="C-13" class="puesto" data-codigo="C-13" data-tipo="carro" points="21.00,22.00 25.00,22.00 25.00,24.00 21.00,24.00"/>
  <polygon id="C-14" class="puesto" data-codigo="C-14" data-tipo="carro" points="21.00,24.00 25.00,24.00 25.00,26.00 21.00,26.00"/>
  <polygon id="C-15" class="puesto" data-codigo="C-15" data-tipo="carro" points="21.00,26.00 25.00,26.00 25.00,28.00 21.00,28.00"/>
  <polygon id="C-16" class="puesto" data-codigo="C-16" data-tipo="carro" points="21.00,28.00 25.00,28.00 25.00,30.00 21.00,30.00"/>
  <polygon id="C-17" class="puesto" data-codigo="C-17" data-tipo="carro" points="12.00,2.00 16.00,2.00 16.00,4.00 12.00,4.00"/>
  <polygon id="C-18" class="puesto" data-codigo="C-18" data-tipo="carro" points="12.00,4.00 16.00,4.00 16.00,6.00 12.00,6.00"/>
  <polygon id="C-19" class="puesto" data-codigo="C-19" data-tipo="carro" points="12.00,6.00 16.00,6.00 16.00,8.00 12.00,8.00"/>
  <polygon id="C-20" class="puesto" data-codigo="C-20" data-tipo="carro" points="12.00,8.00 16.00,8.00 16.00,10.00 12.00,10.00"/>
  <polygon id="C-21" class="puesto" data-codigo="C-21" data-tipo="carro" points="12.00,10.00 16.00,10.00 16.00,12.00 12.00,12.00"/>
  <polygon id="C-22" class="puesto" data-codigo="C-22" data-tipo="carro" points="12.00,12.00 16.00,12.00 16.00,14.00 12.00,14.00"/>
  <polygon id="C-23" class="puesto" data-codigo="C-23" data-tipo="carro" points="12.00,14.00 16.00,14.00 16.00,16.00 12.00,16.00"/>
  <polygon id="C-24" class="puesto" data-codigo="C-24" data-tipo="carro" points="12.00,16.00 16.00,16.00 16.00,18.00 12.00,18.00"/>
  <polygon id="C-25" class="puesto" data-codigo="C-25" data-tipo="carro" points="12.00,18.00 16.00,18.00 16.00,20.00 12.00,20.00"/>
  <polygon id="C-26" class="puesto" data-codigo="C-26" data-tipo="carro" points="12.00,20.00 16.00,20.00 16.00,22.00 12.00,22.00"/>
  <polygon id="C-27" class="puesto" data-codigo="C-27" data-tipo="carro" points="12.00,22.00 16.00,22.00 16.00,24.00 12.00,24.00"/>
  <polygon id="C-28" class="puesto" data-codigo="C-28" data-tipo="carro" points="12.00,24.00 16.00,24.00 16.00,26.00 12.00,26.00"/>
  <polygon id="C-29" class="puesto" data-codigo="C-29" data-tipo="carro" points="12.00,26.00 16.00,26.00 16.00,28.00 12.00,28.00"/>
  <polygon id="C-30" class="puesto" data-codigo="C-30" data-tipo="carro" points="12.00,28.00 16.00,28.00 16.00,30.00 12.00,30.00"/>
  <polygon id="C-31" class="puesto" data-codigo="C-31" data-tipo="carro" points="12.00,30.00 16.00,30.00 16.00,32.00 12.00,32.00"/>
  <polygon id="C-32" class="puesto" data-codigo="C-32" data-tipo="carro" points="12.00,32.00 16.00,32.00 16.00,34.00 12.00,34.00"/>
  <polygon id="C-33" class="puesto" data-codigo="C-33" data-tipo="carro" points="12.00,34.00 16.00,34.00 16.00,36.00 12.00,36.00"/>
  <polygon id="C-34" class="puesto" data-codigo="C-34" data-tipo="carro" points="25.00,34.00 25.00,30.00 27.00,30.00 27.00,34.00"/>
  <polygon id="C-35" class="puesto" data-codigo="C-35" data-tipo="carro" points="27.00,34.00 27.00,30.00 29.00,30.00 29.00,34.00"/>
  <polygon id="C-36" class="puesto" data-codigo="C-36" data-tipo="carro" points="29.00,34.00 29.00,30.00 31.00,30.00 31.00,34.00"/>
  <polygon id="C-37" class="puesto" data-codigo="C-37" data-tipo="carro" points="31.00,34.00 31.00,30.00 33.00,30.00 33.00,34.00"/>
  <polygon id="C-38" class="puesto" data-codigo="C-38" data-tipo="carro" points="33.00,34.00 33.00,30.00 35.00,30.00 35.00,34.00"/>
  <polygon id="C-39" class="puesto" data-codigo="C-39" data-tipo="carro" points="35.00,34.00 35.00,30.00 37.00,30.00 37.00,34.00"/>
  <polygon id="C-40" class="puesto" data-codigo="C-40" data-tipo="carro" points="37.00,34.00 37.00,30.00 39.00,30.00 39.00,34.00"/>
  <polygon id="C-41" class="puesto" data-codigo="C-41" data-tipo="carro" points="39.00,34.00 39.00,30.00 41.00,30.00 41.00,34.00"/>
  <polygon id="C-42" class="puesto" data-codigo="C-42" data-tipo="carro" points="41.00,34.00 41.00,30.00 43.00,30.00 43.00,34.00"/>
  <polygon id="C-43" class="puesto" data-codigo="C-43" data-tipo="carro" points="43.00,34.00 43.00,30.00 45.00,30.00 45.00,34.00"/>
  <polygon id="C-44" class="puesto preferencial" data-codigo="C-44" data-tipo="discapacitado" points="45.00,34.00 45.00,30.00 47.00,30.00 47.00,34.00"/>
  <path class="marcaX" d="M 45.00 34.00 L 47.00 30.00 M 45.00 30.00 L 47.00 34.00"/>
  <polygon id="C-45" class="puesto preferencial" data-codigo="C-45" data-tipo="discapacitado" points="47.00,34.00 47.00,30.00 49.00,30.00 49.00,34.00"/>
  <path class="marcaX" d="M 47.00 34.00 L 49.00 30.00 M 47.00 30.00 L 49.00 34.00"/>
  <polygon id="C-46" class="puesto" data-codigo="C-46" data-tipo="carro" points="21.00,43.00 21.00,39.00 19.00,39.00 19.00,43.00"/>
  <polygon id="C-47" class="puesto" data-codigo="C-47" data-tipo="carro" points="23.00,43.00 23.00,39.00 21.00,39.00 21.00,43.00"/>
  <polygon id="C-48" class="puesto" data-codigo="C-48" data-tipo="carro" points="25.00,43.00 25.00,39.00 23.00,39.00 23.00,43.00"/>
  <polygon id="C-49" class="puesto" data-codigo="C-49" data-tipo="carro" points="25.00,43.00 25.00,39.00 27.00,39.00 27.00,43.00"/>
  <polygon id="C-50" class="puesto" data-codigo="C-50" data-tipo="carro" points="27.00,43.00 27.00,39.00 29.00,39.00 29.00,43.00"/>
  <polygon id="C-51" class="puesto" data-codigo="C-51" data-tipo="carro" points="29.00,43.00 29.00,39.00 31.00,39.00 31.00,43.00"/>
  <polygon id="C-52" class="puesto" data-codigo="C-52" data-tipo="carro" points="31.00,43.00 31.00,39.00 33.00,39.00 33.00,43.00"/>
  <polygon id="C-53" class="puesto" data-codigo="C-53" data-tipo="carro" points="33.00,43.00 33.00,39.00 35.00,39.00 35.00,43.00"/>
  <polygon id="C-54" class="puesto" data-codigo="C-54" data-tipo="carro" points="35.00,43.00 35.00,39.00 37.00,39.00 37.00,43.00"/>
  <polygon id="C-55" class="puesto" data-codigo="C-55" data-tipo="carro" points="37.00,43.00 37.00,39.00 39.00,39.00 39.00,43.00"/>
  <polygon id="C-56" class="puesto" data-codigo="C-56" data-tipo="carro" points="39.00,43.00 39.00,39.00 41.00,39.00 41.00,43.00"/>
  <polygon id="C-57" class="puesto" data-codigo="C-57" data-tipo="carro" points="41.00,43.00 41.00,39.00 43.00,39.00 43.00,43.00"/>
  <polygon id="C-58" class="puesto" data-codigo="C-58" data-tipo="carro" points="43.00,43.00 43.00,39.00 45.00,39.00 45.00,43.00"/>
  <polygon id="C-59" class="puesto" data-codigo="C-59" data-tipo="carro" points="45.00,43.00 45.00,39.00 47.00,39.00 47.00,43.00"/>
  <polygon id="C-60" class="puesto" data-codigo="C-60" data-tipo="carro" points="47.00,43.00 47.00,39.00 49.00,39.00 49.00,43.00"/>
  <polygon id="C-61" class="puesto" data-codigo="C-61" data-tipo="carro" points="49.00,43.00 49.00,39.00 51.00,39.00 51.00,43.00"/>
  <polygon id="C-62" class="puesto" data-codigo="C-62" data-tipo="carro" points="51.00,43.00 51.00,39.00 53.00,39.00 53.00,43.00"/>
  <polygon id="C-63" class="puesto" data-codigo="C-63" data-tipo="carro" points="53.00,43.00 53.00,39.00 55.00,39.00 55.00,43.00"/>
  <polygon id="M-01" class="puesto" data-codigo="M-01" data-tipo="moto" points="3.00,1.00 3.00,-1.00 4.00,-1.00 4.00,1.00"/>
  <polygon id="M-02" class="puesto" data-codigo="M-02" data-tipo="moto" points="4.00,1.00 4.00,-1.00 5.00,-1.00 5.00,1.00"/>
  <polygon id="M-03" class="puesto" data-codigo="M-03" data-tipo="moto" points="5.00,1.00 5.00,-1.00 6.00,-1.00 6.00,1.00"/>
  <polygon id="M-04" class="puesto" data-codigo="M-04" data-tipo="moto" points="6.00,1.00 6.00,-1.00 7.00,-1.00 7.00,1.00"/>
  <polygon id="M-05" class="puesto" data-codigo="M-05" data-tipo="moto" points="7.00,1.00 7.00,-1.00 8.00,-1.00 8.00,1.00"/>
  <polygon id="M-06" class="puesto" data-codigo="M-06" data-tipo="moto" points="8.00,1.00 8.00,-1.00 9.00,-1.00 9.00,1.00"/>
  <polygon id="M-07" class="puesto" data-codigo="M-07" data-tipo="moto" points="9.00,1.00 9.00,-1.00 10.00,-1.00 10.00,1.00"/>
  <polygon id="M-08" class="puesto" data-codigo="M-08" data-tipo="moto" points="10.00,1.00 10.00,-1.00 11.00,-1.00 11.00,1.00"/>
  <polygon id="M-09" class="puesto" data-codigo="M-09" data-tipo="moto" points="11.00,1.00 11.00,-1.00 12.00,-1.00 12.00,1.00"/>
  <polygon id="M-10" class="puesto" data-codigo="M-10" data-tipo="moto" points="12.00,1.00 12.00,-1.00 13.00,-1.00 13.00,1.00"/>
  <polygon id="M-11" class="puesto" data-codigo="M-11" data-tipo="moto" points="13.00,1.00 13.00,-1.00 14.00,-1.00 14.00,1.00"/>
  <polygon id="M-12" class="puesto" data-codigo="M-12" data-tipo="moto" points="14.00,1.00 14.00,-1.00 15.00,-1.00 15.00,1.00"/>
  <polygon id="M-13" class="puesto" data-codigo="M-13" data-tipo="moto" points="0.00,2.00 2.00,2.00 2.00,3.00 0.00,3.00"/>
  <polygon id="M-14" class="puesto" data-codigo="M-14" data-tipo="moto" points="0.00,3.00 2.00,3.00 2.00,4.00 0.00,4.00"/>
  <polygon id="M-15" class="puesto" data-codigo="M-15" data-tipo="moto" points="0.00,4.00 2.00,4.00 2.00,5.00 0.00,5.00"/>
  <polygon id="M-16" class="puesto" data-codigo="M-16" data-tipo="moto" points="0.00,5.00 2.00,5.00 2.00,6.00 0.00,6.00"/>
  <polygon id="M-17" class="puesto" data-codigo="M-17" data-tipo="moto" points="0.00,6.00 2.00,6.00 2.00,7.00 0.00,7.00"/>
  <polygon id="M-18" class="puesto" data-codigo="M-18" data-tipo="moto" points="0.00,7.00 2.00,7.00 2.00,8.00 0.00,8.00"/>
  <polygon id="M-19" class="puesto" data-codigo="M-19" data-tipo="moto" points="0.00,8.00 2.00,8.00 2.00,9.00 0.00,9.00"/>
  <polygon id="M-20" class="puesto" data-codigo="M-20" data-tipo="moto" points="0.00,9.00 2.00,9.00 2.00,10.00 0.00,10.00"/>
  <polygon id="M-21" class="puesto" data-codigo="M-21" data-tipo="moto" points="0.00,10.00 2.00,10.00 2.00,11.00 0.00,11.00"/>
  <polygon id="M-22" class="puesto" data-codigo="M-22" data-tipo="moto" points="0.00,11.00 2.00,11.00 2.00,12.00 0.00,12.00"/>
  <polygon id="M-23" class="puesto" data-codigo="M-23" data-tipo="moto" points="0.00,12.00 2.00,12.00 2.00,13.00 0.00,13.00"/>
  <polygon id="M-24" class="puesto" data-codigo="M-24" data-tipo="moto" points="0.00,13.00 2.00,13.00 2.00,14.00 0.00,14.00"/>
  <polygon id="M-25" class="puesto" data-codigo="M-25" data-tipo="moto" points="0.00,14.00 2.00,14.00 2.00,15.00 0.00,15.00"/>
  <polygon id="M-26" class="puesto" data-codigo="M-26" data-tipo="moto" points="0.00,15.00 2.00,15.00 2.00,16.00 0.00,16.00"/>
  <polygon id="M-27" class="puesto" data-codigo="M-27" data-tipo="moto" points="0.00,16.00 2.00,16.00 2.00,17.00 0.00,17.00"/>
  <polygon id="M-28" class="puesto" data-codigo="M-28" data-tipo="moto" points="0.00,17.00 2.00,17.00 2.00,18.00 0.00,18.00"/>
  <polygon id="M-29" class="puesto" data-codigo="M-29" data-tipo="moto" points="0.00,18.00 2.00,18.00 2.00,19.00 0.00,19.00"/>
  <polygon id="M-30" class="puesto" data-codigo="M-30" data-tipo="moto" points="0.00,19.00 2.00,19.00 2.00,20.00 0.00,20.00"/>
  <polygon id="M-31" class="puesto" data-codigo="M-31" data-tipo="moto" points="0.00,20.00 2.00,20.00 2.00,21.00 0.00,21.00"/>
  <polygon id="M-32" class="puesto" data-codigo="M-32" data-tipo="moto" points="0.00,21.00 2.00,21.00 2.00,22.00 0.00,22.00"/>
  <polygon id="M-33" class="puesto" data-codigo="M-33" data-tipo="moto" points="0.00,22.00 2.00,22.00 2.00,23.00 0.00,23.00"/>
  <polygon id="M-34" class="puesto" data-codigo="M-34" data-tipo="moto" points="0.00,23.00 2.00,23.00 2.00,24.00 0.00,24.00"/>
  <polygon id="M-35" class="puesto" data-codigo="M-35" data-tipo="moto" points="0.00,24.00 2.00,24.00 2.00,25.00 0.00,25.00"/>
  <polygon id="M-36" class="puesto" data-codigo="M-36" data-tipo="moto" points="0.00,25.00 2.00,25.00 2.00,26.00 0.00,26.00"/>
  <polygon id="M-37" class="puesto" data-codigo="M-37" data-tipo="moto" points="0.00,26.00 2.00,26.00 2.00,27.00 0.00,27.00"/>
  <polygon id="M-38" class="puesto" data-codigo="M-38" data-tipo="moto" points="0.00,27.00 2.00,27.00 2.00,28.00 0.00,28.00"/>
  <polygon id="M-39" class="puesto" data-codigo="M-39" data-tipo="moto" points="0.00,28.00 2.00,28.00 2.00,29.00 0.00,29.00"/>
  <polygon id="M-40" class="puesto" data-codigo="M-40" data-tipo="moto" points="0.00,29.00 2.00,29.00 2.00,30.00 0.00,30.00"/>
  <polygon id="M-41" class="puesto" data-codigo="M-41" data-tipo="moto" points="0.00,30.00 2.00,30.00 2.00,31.00 0.00,31.00"/>
  <polygon id="M-42" class="puesto" data-codigo="M-42" data-tipo="moto" points="0.00,31.00 2.00,31.00 2.00,32.00 0.00,32.00"/>
  <polygon id="M-43" class="puesto" data-codigo="M-43" data-tipo="moto" points="0.00,32.00 2.00,32.00 2.00,33.00 0.00,33.00"/>
  <polygon id="M-44" class="puesto" data-codigo="M-44" data-tipo="moto" points="0.00,33.00 2.00,33.00 2.00,34.00 0.00,34.00"/>
  <polygon id="M-45" class="puesto" data-codigo="M-45" data-tipo="moto" points="0.00,34.00 2.00,34.00 2.00,35.00 0.00,35.00"/>
  <polygon id="M-46" class="puesto" data-codigo="M-46" data-tipo="moto" points="0.00,35.00 2.00,35.00 2.00,36.00 0.00,36.00"/>
  <polygon id="M-47" class="puesto" data-codigo="M-47" data-tipo="moto" points="0.00,36.00 2.00,36.00 2.00,37.00 0.00,37.00"/>
  <polygon id="M-48" class="puesto" data-codigo="M-48" data-tipo="moto" points="0.00,38.00 2.00,38.00 2.00,37.00 0.00,37.00"/>
  <polygon id="M-49" class="puesto" data-codigo="M-49" data-tipo="moto" points="0.00,38.00 2.00,38.00 2.00,39.00 0.00,39.00"/>
  <polygon id="M-50" class="puesto" data-codigo="M-50" data-tipo="moto" points="0.00,39.00 2.00,39.00 2.00,40.00 0.00,40.00"/>
  <polygon id="M-51" class="puesto" data-codigo="M-51" data-tipo="moto" points="0.00,40.00 2.00,40.00 2.00,41.00 0.00,41.00"/>
  <polygon id="M-52" class="puesto" data-codigo="M-52" data-tipo="moto" points="0.00,41.00 2.00,41.00 2.00,42.00 0.00,42.00"/>
  <polygon id="M-53" class="puesto" data-codigo="M-53" data-tipo="moto" points="9.00,2.00 11.00,2.00 11.00,3.00 9.00,3.00"/>
  <polygon id="M-54" class="puesto" data-codigo="M-54" data-tipo="moto" points="9.00,3.00 11.00,3.00 11.00,4.00 9.00,4.00"/>
  <polygon id="M-55" class="puesto" data-codigo="M-55" data-tipo="moto" points="9.00,4.00 11.00,4.00 11.00,5.00 9.00,5.00"/>
  <polygon id="M-56" class="puesto" data-codigo="M-56" data-tipo="moto" points="9.00,5.00 11.00,5.00 11.00,6.00 9.00,6.00"/>
  <polygon id="M-57" class="puesto" data-codigo="M-57" data-tipo="moto" points="9.00,6.00 11.00,6.00 11.00,7.00 9.00,7.00"/>
  <polygon id="M-58" class="puesto" data-codigo="M-58" data-tipo="moto" points="9.00,7.00 11.00,7.00 11.00,8.00 9.00,8.00"/>
  <polygon id="M-59" class="puesto" data-codigo="M-59" data-tipo="moto" points="9.00,8.00 11.00,8.00 11.00,9.00 9.00,9.00"/>
  <polygon id="M-60" class="puesto" data-codigo="M-60" data-tipo="moto" points="9.00,9.00 11.00,9.00 11.00,10.00 9.00,10.00"/>
  <polygon id="M-61" class="puesto" data-codigo="M-61" data-tipo="moto" points="9.00,10.00 11.00,10.00 11.00,11.00 9.00,11.00"/>
  <polygon id="M-62" class="puesto" data-codigo="M-62" data-tipo="moto" points="9.00,11.00 11.00,11.00 11.00,12.00 9.00,12.00"/>
  <polygon id="M-63" class="puesto" data-codigo="M-63" data-tipo="moto" points="9.00,12.00 11.00,12.00 11.00,13.00 9.00,13.00"/>
  <polygon id="M-64" class="puesto" data-codigo="M-64" data-tipo="moto" points="9.00,13.00 11.00,13.00 11.00,14.00 9.00,14.00"/>
  <polygon id="M-65" class="puesto" data-codigo="M-65" data-tipo="moto" points="9.00,14.00 11.00,14.00 11.00,15.00 9.00,15.00"/>
  <polygon id="M-66" class="puesto" data-codigo="M-66" data-tipo="moto" points="9.00,15.00 11.00,15.00 11.00,16.00 9.00,16.00"/>
  <polygon id="M-67" class="puesto" data-codigo="M-67" data-tipo="moto" points="9.00,16.00 11.00,16.00 11.00,17.00 9.00,17.00"/>
  <polygon id="M-68" class="puesto" data-codigo="M-68" data-tipo="moto" points="9.00,17.00 11.00,17.00 11.00,18.00 9.00,18.00"/>
  <polygon id="M-69" class="puesto" data-codigo="M-69" data-tipo="moto" points="9.00,18.00 11.00,18.00 11.00,19.00 9.00,19.00"/>
  <polygon id="M-70" class="puesto" data-codigo="M-70" data-tipo="moto" points="9.00,19.00 11.00,19.00 11.00,20.00 9.00,20.00"/>
  <polygon id="M-71" class="puesto" data-codigo="M-71" data-tipo="moto" points="9.00,20.00 11.00,20.00 11.00,21.00 9.00,21.00"/>
  <polygon id="M-72" class="puesto" data-codigo="M-72" data-tipo="moto" points="9.00,21.00 11.00,21.00 11.00,22.00 9.00,22.00"/>
  <polygon id="M-73" class="puesto" data-codigo="M-73" data-tipo="moto" points="9.00,22.00 11.00,22.00 11.00,23.00 9.00,23.00"/>
  <polygon id="M-74" class="puesto" data-codigo="M-74" data-tipo="moto" points="9.00,23.00 11.00,23.00 11.00,24.00 9.00,24.00"/>
  <polygon id="M-75" class="puesto" data-codigo="M-75" data-tipo="moto" points="9.00,24.00 11.00,24.00 11.00,25.00 9.00,25.00"/>
  <polygon id="M-76" class="puesto" data-codigo="M-76" data-tipo="moto" points="9.00,25.00 11.00,25.00 11.00,26.00 9.00,26.00"/>
  <polygon id="M-77" class="puesto" data-codigo="M-77" data-tipo="moto" points="9.00,26.00 11.00,26.00 11.00,27.00 9.00,27.00"/>
  <polygon id="M-78" class="puesto" data-codigo="M-78" data-tipo="moto" points="9.00,27.00 11.00,27.00 11.00,28.00 9.00,28.00"/>
  <polygon id="M-79" class="puesto" data-codigo="M-79" data-tipo="moto" points="9.00,28.00 11.00,28.00 11.00,29.00 9.00,29.00"/>
  <polygon id="M-80" class="puesto" data-codigo="M-80" data-tipo="moto" points="9.00,29.00 11.00,29.00 11.00,30.00 9.00,30.00"/>
  <polygon id="M-81" class="puesto" data-codigo="M-81" data-tipo="moto" points="9.00,30.00 11.00,30.00 11.00,31.00 9.00,31.00"/>
  <polygon id="M-82" class="puesto" data-codigo="M-82" data-tipo="moto" points="9.00,31.00 11.00,31.00 11.00,32.00 9.00,32.00"/>
  <polygon id="M-83" class="puesto" data-codigo="M-83" data-tipo="moto" points="9.00,32.00 11.00,32.00 11.00,33.00 9.00,33.00"/>
  <polygon id="M-84" class="puesto" data-codigo="M-84" data-tipo="moto" points="9.00,33.00 11.00,33.00 11.00,34.00 9.00,34.00"/>
  <polygon id="M-85" class="puesto" data-codigo="M-85" data-tipo="moto" points="9.00,34.00 11.00,34.00 11.00,35.00 9.00,35.00"/>
  <polygon id="M-86" class="puesto" data-codigo="M-86" data-tipo="moto" points="9.00,35.00 11.00,35.00 11.00,36.00 9.00,36.00"/>
  <polygon id="M-87" class="puesto" data-codigo="M-87" data-tipo="moto" points="3.00,3.00 5.00,3.00 5.00,4.00 3.00,4.00"/>
  <polygon id="M-88" class="puesto" data-codigo="M-88" data-tipo="moto" points="3.00,4.00 5.00,4.00 5.00,5.00 3.00,5.00"/>
  <polygon id="M-89" class="puesto" data-codigo="M-89" data-tipo="moto" points="3.00,5.00 5.00,5.00 5.00,6.00 3.00,6.00"/>
  <polygon id="M-90" class="puesto" data-codigo="M-90" data-tipo="moto" points="3.00,6.00 5.00,6.00 5.00,7.00 3.00,7.00"/>
  <polygon id="M-91" class="puesto" data-codigo="M-91" data-tipo="moto" points="3.00,7.00 5.00,7.00 5.00,8.00 3.00,8.00"/>
  <polygon id="M-92" class="puesto" data-codigo="M-92" data-tipo="moto" points="3.00,8.00 5.00,8.00 5.00,9.00 3.00,9.00"/>
  <polygon id="M-93" class="puesto" data-codigo="M-93" data-tipo="moto" points="3.00,9.00 5.00,9.00 5.00,10.00 3.00,10.00"/>
  <polygon id="M-94" class="puesto" data-codigo="M-94" data-tipo="moto" points="3.00,10.00 5.00,10.00 5.00,11.00 3.00,11.00"/>
  <polygon id="M-95" class="puesto" data-codigo="M-95" data-tipo="moto" points="3.00,11.00 5.00,11.00 5.00,12.00 3.00,12.00"/>
  <polygon id="M-96" class="puesto" data-codigo="M-96" data-tipo="moto" points="3.00,12.00 5.00,12.00 5.00,13.00 3.00,13.00"/>
  <polygon id="M-97" class="puesto" data-codigo="M-97" data-tipo="moto" points="3.00,13.00 5.00,13.00 5.00,14.00 3.00,14.00"/>
  <polygon id="M-98" class="puesto" data-codigo="M-98" data-tipo="moto" points="3.00,14.00 5.00,14.00 5.00,15.00 3.00,15.00"/>
  <polygon id="M-99" class="puesto" data-codigo="M-99" data-tipo="moto" points="3.00,15.00 5.00,15.00 5.00,16.00 3.00,16.00"/>
  <polygon id="M-100" class="puesto" data-codigo="M-100" data-tipo="moto" points="3.00,16.00 5.00,16.00 5.00,17.00 3.00,17.00"/>
  <polygon id="M-101" class="puesto" data-codigo="M-101" data-tipo="moto" points="3.00,17.00 5.00,17.00 5.00,18.00 3.00,18.00"/>
  <polygon id="M-102" class="puesto" data-codigo="M-102" data-tipo="moto" points="3.00,18.00 5.00,18.00 5.00,19.00 3.00,19.00"/>
  <polygon id="M-103" class="puesto" data-codigo="M-103" data-tipo="moto" points="3.00,19.00 5.00,19.00 5.00,20.00 3.00,20.00"/>
  <polygon id="M-104" class="puesto" data-codigo="M-104" data-tipo="moto" points="3.00,20.00 5.00,20.00 5.00,21.00 3.00,21.00"/>
  <polygon id="M-105" class="puesto" data-codigo="M-105" data-tipo="moto" points="3.00,21.00 5.00,21.00 5.00,22.00 3.00,22.00"/>
  <polygon id="M-106" class="puesto" data-codigo="M-106" data-tipo="moto" points="3.00,22.00 5.00,22.00 5.00,23.00 3.00,23.00"/>
  <polygon id="M-107" class="puesto" data-codigo="M-107" data-tipo="moto" points="3.00,23.00 5.00,23.00 5.00,24.00 3.00,24.00"/>
  <polygon id="M-108" class="puesto" data-codigo="M-108" data-tipo="moto" points="3.00,24.00 5.00,24.00 5.00,25.00 3.00,25.00"/>
  <polygon id="M-109" class="puesto" data-codigo="M-109" data-tipo="moto" points="3.00,25.00 5.00,25.00 5.00,26.00 3.00,26.00"/>
  <polygon id="M-110" class="puesto" data-codigo="M-110" data-tipo="moto" points="3.00,26.00 5.00,26.00 5.00,27.00 3.00,27.00"/>
  <polygon id="M-111" class="puesto" data-codigo="M-111" data-tipo="moto" points="3.00,27.00 5.00,27.00 5.00,28.00 3.00,28.00"/>
  <polygon id="M-112" class="puesto" data-codigo="M-112" data-tipo="moto" points="3.00,28.00 5.00,28.00 5.00,29.00 3.00,29.00"/>
  <polygon id="M-113" class="puesto" data-codigo="M-113" data-tipo="moto" points="3.00,29.00 5.00,29.00 5.00,30.00 3.00,30.00"/>
  <polygon id="M-114" class="puesto" data-codigo="M-114" data-tipo="moto" points="3.00,30.00 5.00,30.00 5.00,31.00 3.00,31.00"/>
  <polygon id="M-115" class="puesto" data-codigo="M-115" data-tipo="moto" points="3.00,31.00 5.00,31.00 5.00,32.00 3.00,32.00"/>
  <polygon id="M-116" class="puesto" data-codigo="M-116" data-tipo="moto" points="3.00,33.00 5.00,33.00 5.00,32.00 3.00,32.00"/>
  <polygon id="M-117" class="puesto" data-codigo="M-117" data-tipo="moto" points="3.00,34.00 5.00,34.00 5.00,33.00 3.00,33.00"/>
  <polygon id="M-118" class="puesto" data-codigo="M-118" data-tipo="moto" points="3.00,35.00 5.00,35.00 5.00,34.00 3.00,34.00"/>
  <polygon id="M-119" class="puesto" data-codigo="M-119" data-tipo="moto" points="3.00,36.00 5.00,36.00 5.00,35.00 3.00,35.00"/>
  <polygon id="M-120" class="puesto" data-codigo="M-120" data-tipo="moto" points="3.00,37.00 5.00,37.00 5.00,36.00 3.00,36.00"/>
  <polygon id="M-121" class="puesto" data-codigo="M-121" data-tipo="moto" points="3.00,38.00 5.00,38.00 5.00,37.00 3.00,37.00"/>
  <polygon id="M-122" class="puesto" data-codigo="M-122" data-tipo="moto" points="6.00,4.00 8.00,4.00 8.00,3.00 6.00,3.00"/>
  <polygon id="M-123" class="puesto" data-codigo="M-123" data-tipo="moto" points="6.00,5.00 8.00,5.00 8.00,4.00 6.00,4.00"/>
  <polygon id="M-124" class="puesto" data-codigo="M-124" data-tipo="moto" points="6.00,6.00 8.00,6.00 8.00,5.00 6.00,5.00"/>
  <polygon id="M-125" class="puesto" data-codigo="M-125" data-tipo="moto" points="6.00,7.00 8.00,7.00 8.00,6.00 6.00,6.00"/>
  <polygon id="M-126" class="puesto" data-codigo="M-126" data-tipo="moto" points="6.00,8.00 8.00,8.00 8.00,7.00 6.00,7.00"/>
  <polygon id="M-127" class="puesto" data-codigo="M-127" data-tipo="moto" points="6.00,9.00 8.00,9.00 8.00,8.00 6.00,8.00"/>
  <polygon id="M-128" class="puesto" data-codigo="M-128" data-tipo="moto" points="6.00,10.00 8.00,10.00 8.00,9.00 6.00,9.00"/>
  <polygon id="M-129" class="puesto" data-codigo="M-129" data-tipo="moto" points="6.00,11.00 8.00,11.00 8.00,10.00 6.00,10.00"/>
  <polygon id="M-130" class="puesto" data-codigo="M-130" data-tipo="moto" points="6.00,12.00 8.00,12.00 8.00,11.00 6.00,11.00"/>
  <polygon id="M-131" class="puesto" data-codigo="M-131" data-tipo="moto" points="6.00,13.00 8.00,13.00 8.00,12.00 6.00,12.00"/>
  <polygon id="M-132" class="puesto" data-codigo="M-132" data-tipo="moto" points="6.00,14.00 8.00,14.00 8.00,13.00 6.00,13.00"/>
  <polygon id="M-133" class="puesto" data-codigo="M-133" data-tipo="moto" points="6.00,15.00 8.00,15.00 8.00,14.00 6.00,14.00"/>
  <polygon id="M-134" class="puesto" data-codigo="M-134" data-tipo="moto" points="6.00,15.00 8.00,15.00 8.00,16.00 6.00,16.00"/>
  <polygon id="M-135" class="puesto" data-codigo="M-135" data-tipo="moto" points="6.00,16.00 8.00,16.00 8.00,17.00 6.00,17.00"/>
  <polygon id="M-136" class="puesto" data-codigo="M-136" data-tipo="moto" points="6.00,17.00 8.00,17.00 8.00,18.00 6.00,18.00"/>
  <polygon id="M-137" class="puesto" data-codigo="M-137" data-tipo="moto" points="6.00,18.00 8.00,18.00 8.00,19.00 6.00,19.00"/>
  <polygon id="M-138" class="puesto" data-codigo="M-138" data-tipo="moto" points="6.00,19.00 8.00,19.00 8.00,20.00 6.00,20.00"/>
  <polygon id="M-139" class="puesto" data-codigo="M-139" data-tipo="moto" points="6.00,20.00 8.00,20.00 8.00,21.00 6.00,21.00"/>
  <polygon id="M-140" class="puesto" data-codigo="M-140" data-tipo="moto" points="6.00,21.00 8.00,21.00 8.00,22.00 6.00,22.00"/>
  <polygon id="M-141" class="puesto" data-codigo="M-141" data-tipo="moto" points="6.00,22.00 8.00,22.00 8.00,23.00 6.00,23.00"/>
  <polygon id="M-142" class="puesto" data-codigo="M-142" data-tipo="moto" points="6.00,23.00 8.00,23.00 8.00,24.00 6.00,24.00"/>
  <polygon id="M-143" class="puesto" data-codigo="M-143" data-tipo="moto" points="6.00,24.00 8.00,24.00 8.00,25.00 6.00,25.00"/>
  <polygon id="M-144" class="puesto" data-codigo="M-144" data-tipo="moto" points="6.00,25.00 8.00,25.00 8.00,26.00 6.00,26.00"/>
  <polygon id="M-145" class="puesto" data-codigo="M-145" data-tipo="moto" points="6.00,26.00 8.00,26.00 8.00,27.00 6.00,27.00"/>
  <polygon id="M-146" class="puesto" data-codigo="M-146" data-tipo="moto" points="6.00,27.00 8.00,27.00 8.00,28.00 6.00,28.00"/>
  <polygon id="M-147" class="puesto" data-codigo="M-147" data-tipo="moto" points="6.00,28.00 8.00,28.00 8.00,29.00 6.00,29.00"/>
  <polygon id="M-148" class="puesto" data-codigo="M-148" data-tipo="moto" points="6.00,30.00 8.00,30.00 8.00,29.00 6.00,29.00"/>
  <polygon id="M-149" class="puesto" data-codigo="M-149" data-tipo="moto" points="6.00,30.00 8.00,30.00 8.00,31.00 6.00,31.00"/>
  <polygon id="M-150" class="puesto" data-codigo="M-150" data-tipo="moto" points="6.00,31.00 8.00,31.00 8.00,32.00 6.00,32.00"/>
  <polygon id="M-151" class="puesto" data-codigo="M-151" data-tipo="moto" points="6.00,32.00 8.00,32.00 8.00,33.00 6.00,33.00"/>
  <polygon id="M-152" class="puesto" data-codigo="M-152" data-tipo="moto" points="6.00,33.00 8.00,33.00 8.00,34.00 6.00,34.00"/>
  <polygon id="M-153" class="puesto" data-codigo="M-153" data-tipo="moto" points="6.00,34.00 8.00,34.00 8.00,35.00 6.00,35.00"/>
  <polygon id="M-154" class="puesto" data-codigo="M-154" data-tipo="moto" points="6.00,35.00 8.00,35.00 8.00,36.00 6.00,36.00"/>
  <polygon id="M-155" class="puesto" data-codigo="M-155" data-tipo="moto" points="6.00,36.00 8.00,36.00 8.00,37.00 6.00,37.00"/>
  <polygon id="M-156" class="puesto" data-codigo="M-156" data-tipo="moto" points="6.00,37.00 8.00,37.00 8.00,38.00 6.00,38.00"/>
  <polygon id="M-157" class="puesto" data-codigo="M-157" data-tipo="moto" points="12.00,36.00 14.00,36.00 14.10,36.98 12.13,37.37"/>
  <polygon id="M-158" class="puesto" data-codigo="M-158" data-tipo="moto" points="12.13,37.37 14.10,36.98 14.38,37.91 12.53,38.68"/>
  <polygon id="M-159" class="puesto" data-codigo="M-159" data-tipo="moto" points="12.53,38.68 14.38,37.91 14.84,38.78 13.18,39.89"/>
  <polygon id="M-160" class="puesto" data-codigo="M-160" data-tipo="moto" points="13.18,39.89 14.84,38.78 15.46,39.54 14.05,40.95"/>
  <polygon id="M-161" class="puesto" data-codigo="M-161" data-tipo="moto" points="14.05,40.95 15.46,39.54 16.22,40.16 15.11,41.82"/>
  <polygon id="M-162" class="puesto" data-codigo="M-162" data-tipo="moto" points="15.11,41.82 16.22,40.16 17.09,40.62 16.32,42.47"/>
  <polygon id="M-163" class="puesto" data-codigo="M-163" data-tipo="moto" points="16.32,42.47 17.09,40.62 18.02,40.90 17.63,42.87"/>
  <polygon id="M-164" class="puesto" data-codigo="M-164" data-tipo="moto" points="17.63,42.87 18.02,40.90 19.00,41.00 19.00,43.00"/>
</g>
<g class="base"><line x1="45.00" y1="34.00" x2="47.00" y2="30.00"/><line x1="47.00" y1="30.00" x2="49.00" y2="34.00"/><line x1="49.00" y1="30.00" x2="47.00" y2="34.00"/><line x1="47.00" y1="34.00" x2="45.00" y2="30.00"/><line x1="21.00" y1="-2.00" x2="25.00" y2="-0.00"/><line x1="25.00" y1="-0.00" x2="21.00" y2="2.00"/><line x1="25.00" y1="-2.00" x2="21.00" y2="-0.00"/><line x1="21.00" y1="-0.00" x2="25.00" y2="2.00"/><line x1="21.00" y1="4.00" x2="25.00" y2="2.00"/><line x1="21.00" y1="2.00" x2="25.00" y2="4.00"/></g>
</svg>$svg$, true);

  INSERT INTO secciones(nombre, descripcion, capacidad, cupos_disponibles, tipo_vehiculo, es_preferencial, id_parqueadero) VALUES
    ('C-01', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', true, 4),
    ('C-02', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', true, 4),
    ('C-03', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', true, 4),
    ('C-04', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-05', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-06', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-07', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-08', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-09', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-10', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-11', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-12', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-13', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-14', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-15', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-16', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-17', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-18', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-19', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-20', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-21', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-22', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-23', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-24', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-25', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-26', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-27', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-28', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-29', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-30', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-31', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-32', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-33', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-34', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-35', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-36', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-37', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-38', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-39', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-40', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-41', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-42', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-43', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-44', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', true, 4),
    ('C-45', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', true, 4),
    ('C-46', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-47', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-48', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-49', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-50', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-51', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-52', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-53', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-54', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-55', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-56', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-57', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-58', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-59', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-60', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-61', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-62', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('C-63', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'CARRO', false, 4),
    ('M-01', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-02', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-03', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-04', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-05', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-06', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-07', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-08', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-09', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-10', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-11', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-12', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-13', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-14', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-15', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-16', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-17', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-18', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-19', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-20', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-21', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-22', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-23', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-24', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-25', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-26', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-27', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-28', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-29', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-30', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-31', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-32', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-33', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-34', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-35', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-36', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-37', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-38', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-39', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-40', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-41', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-42', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-43', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-44', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-45', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-46', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-47', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-48', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-49', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-50', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-51', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-52', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-53', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-54', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-55', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-56', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-57', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-58', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-59', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-60', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-61', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-62', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-63', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-64', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-65', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-66', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-67', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-68', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-69', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-70', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-71', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-72', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-73', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-74', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-75', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-76', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-77', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-78', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-79', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-80', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-81', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-82', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-83', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-84', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-85', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-86', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-87', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-88', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-89', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-90', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-91', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-92', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-93', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-94', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-95', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-96', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-97', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-98', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-99', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-100', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-101', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-102', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-103', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-104', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-105', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-106', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-107', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-108', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-109', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-110', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-111', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-112', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-113', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-114', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-115', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-116', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-117', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-118', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-119', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-120', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-121', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-122', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-123', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-124', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-125', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-126', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-127', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-128', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-129', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-130', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-131', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-132', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-133', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-134', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-135', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-136', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-137', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-138', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-139', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-140', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-141', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-142', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-143', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-144', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-145', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-146', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-147', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-148', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-149', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-150', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-151', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-152', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-153', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-154', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-155', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-156', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-157', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-158', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-159', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-160', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-161', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-162', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-163', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4),
    ('M-164', 'Cupo real del plano P4 - Facultad de Economía', 1, 1, 'MOTO', false, 4);

  ALTER TABLE ocupaciones ENABLE TRIGGER trg_ocupaciones_guard;
  ALTER TABLE movimientos ENABLE TRIGGER trg_movimientos_immutable;
END $migration$;
