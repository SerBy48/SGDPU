INSERT INTO sedes (nombre, descripcion)
VALUES ('Sede Neiva', 'Campus principal de la Universidad Surcolombiana')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO parqueaderos
(nombre, ubicacion, capacidad_total, cupos_disponibles, estado, id_sede)
SELECT 'P1 — Central', 'Campus principal, acceso central', 16, 8, 'ACTIVO', id
FROM sedes WHERE nombre='Sede Neiva'
ON CONFLICT DO NOTHING;

INSERT INTO parqueaderos
(nombre, ubicacion, capacidad_total, cupos_disponibles, estado, id_sede)
SELECT 'P2 — Norte', 'Sector norte del campus', 20, 14, 'ACTIVO', id
FROM sedes WHERE nombre='Sede Neiva'
ON CONFLICT DO NOTHING;

INSERT INTO parqueaderos
(nombre, ubicacion, capacidad_total, cupos_disponibles, estado, id_sede)
SELECT 'P3 — Facultad', 'Sector de facultades', 24, 20, 'ACTIVO', id
FROM sedes WHERE nombre='Sede Neiva'
ON CONFLICT DO NOTHING;

DO $$
DECLARE p BIGINT; i INTEGER; nm TEXT; free INTEGER;
BEGIN
  SELECT id INTO p FROM parqueaderos WHERE nombre='P1 — Central';
  FOR i IN 1..16 LOOP
    nm := CASE WHEN i <= 10 THEN 'A-'||LPAD(i::text,2,'0') ELSE 'B-'||LPAD((i-10)::text,2,'0') END;
    free := CASE WHEN i IN (2,3,4,8,11,14,15,16) THEN 1 ELSE 0 END;
    INSERT INTO secciones(nombre,descripcion,capacidad,cupos_disponibles,id_parqueadero)
    VALUES(nm,'Cupo individual del plano demostrativo',1,free,p)
    ON CONFLICT(id_parqueadero,nombre) DO NOTHING;
  END LOOP;
END $$;

DO $$
DECLARE p BIGINT;
BEGIN
  FOR p IN SELECT id FROM parqueaderos LOOP
    INSERT INTO horarios_operacion(id_parqueadero,dia_semana,hora_apertura,hora_cierre)
    VALUES
      (p,1,'06:00','22:00'),(p,2,'06:00','22:00'),(p,3,'06:00','22:00'),
      (p,4,'06:00','22:00'),(p,5,'06:00','22:00'),(p,6,'06:00','22:00')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Plano interactivo real de P1 (ver migrations/005_plano_p1_central.sql para
-- el detalle de por qué el markup vive inline y las coordenadas se enlazan
-- por nombre de cupo). Cubre las 16 secciones que este seed crea para P1
-- (A-01..A-10, B-01..B-06); si se agregan más cupos a P1 después por el panel
-- de administración, sus coordenadas deben agregarse en una migración aparte.
DO $$
DECLARE p BIGINT; plano_id BIGINT;
BEGIN
  SELECT id INTO p FROM parqueaderos WHERE nombre='P1 — Central';
  IF p IS NULL OR EXISTS (SELECT 1 FROM planos_parqueadero WHERE id_parqueadero=p) THEN
    RETURN;
  END IF;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo)
  VALUES (p, $svg$<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="698" height="218" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="20" y="24" font-size="13" font-weight="700" fill="var(--muted)">Parqueadero Central</text>

  <text x="40" y="42" font-size="11" font-weight="600" fill="var(--muted)">ZONA A</text>
  <line x1="30" y1="46" x2="380" y2="46" stroke="var(--border)" stroke-width="1.5"/>

  <text x="430" y="42" font-size="11" font-weight="600" fill="var(--muted)">ZONA B</text>
  <line x1="420" y1="46" x2="630" y2="46" stroke="var(--border)" stroke-width="1.5"/>

  <rect x="0" y="150" width="700" height="60" fill="var(--border)"/>
  <line x1="0" y1="180" x2="700" y2="180" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="18,12"/>
  <rect x="0" y="155" width="40" height="50" rx="4" fill="var(--gold)"/>
  <text x="20" y="184" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">ENT.</text>
</svg>$svg$, true)
  RETURNING id INTO plano_id;

  INSERT INTO coordenadas_seccion(id_seccion,id_plano,elemento_svg_id,x,y,ancho,alto)
  SELECT s.id, plano_id, 'cupo-'||v.nombre, v.x, v.y, 56, 32
  FROM (VALUES
    ('A-01',40,50), ('A-02',106,50), ('A-03',172,50), ('A-04',238,50), ('A-05',304,50),
    ('A-06',40,95), ('A-07',106,95), ('A-08',172,95), ('A-09',238,95), ('A-10',304,95),
    ('B-01',430,50), ('B-02',496,50), ('B-03',562,50),
    ('B-04',430,95), ('B-05',496,95), ('B-06',562,95)
  ) AS v(nombre,x,y)
  JOIN secciones s ON s.nombre=v.nombre AND s.id_parqueadero=p;
END $$;
