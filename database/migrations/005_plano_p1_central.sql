-- Aplicar manualmente sobre bases de datos SGDPU creadas antes de este cambio.
-- Crea el primer plano interactivo real (P1 - Central), usando las tablas
-- planos_parqueadero/coordenadas_seccion que ya existían en el esquema desde
-- el inicio pero nunca se habían conectado a la interfaz (ver docs/IMPLEMENTACION.md).
-- El SVG guardado aquí es solo la capa estática (paredes, vía, rótulos); los
-- rectángulos de cada cupo los dibuja el frontend en tiempo real a partir de
-- coordenadas_seccion, coloreados según el estado real (libre/ocupado).
--
-- Las coordenadas se enlazan por NOMBRE de sección dentro del parqueadero
-- (no por id), porque los ids son seriales y pueden variar entre instalaciones
-- según el orden/huecos de inserción; el nombre del cupo es la clave estable.

DO $$
DECLARE
  plano_id BIGINT;
  ya_completo BOOLEAN;
BEGIN
  -- El seed.sql original de este proyecto ya insertaba un plano placeholder
  -- (archivo_svg='/parking.svg', sin markup real) con coordenadas para las
  -- primeras 16 secciones (A-01..B-06) usando una cuadrícula de solo 2 filas;
  -- las secciones agregadas después (C-17..C-30) nunca quedaron cubiertas.
  -- Si ya se corrió esta migración antes (30 coordenadas reales), no repetir.
  SELECT (SELECT count(*) FROM coordenadas_seccion cs
          JOIN secciones s ON s.id=cs.id_seccion
          WHERE s.id_parqueadero=1)>=30 INTO ya_completo;
  IF ya_completo THEN RETURN; END IF;

  DELETE FROM coordenadas_seccion WHERE id_seccion IN (SELECT id FROM secciones WHERE id_parqueadero=1);
  DELETE FROM planos_parqueadero WHERE id_parqueadero=1;

  INSERT INTO planos_parqueadero(id_parqueadero, archivo_svg, activo)
  VALUES (1, $svg$<svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="698" height="348" rx="10" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="20" y="24" font-size="13" font-weight="700" fill="var(--muted)">Parqueadero Central</text>

  <text x="40" y="42" font-size="11" font-weight="600" fill="var(--muted)">ZONA A</text>
  <line x1="30" y1="46" x2="380" y2="46" stroke="var(--border)" stroke-width="1.5"/>

  <text x="430" y="42" font-size="11" font-weight="600" fill="var(--muted)">ZONA B</text>
  <line x1="420" y1="46" x2="630" y2="46" stroke="var(--border)" stroke-width="1.5"/>

  <rect x="0" y="150" width="700" height="60" fill="var(--border)"/>
  <line x1="0" y1="180" x2="700" y2="180" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="18,12"/>
  <rect x="0" y="155" width="40" height="50" rx="4" fill="var(--gold)"/>
  <text x="20" y="184" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">ENT.</text>

  <text x="40" y="232" font-size="11" font-weight="600" fill="var(--muted)">ZONA C</text>
  <line x1="30" y1="236" x2="500" y2="236" stroke="var(--border)" stroke-width="1.5"/>
</svg>$svg$, true)
  RETURNING id INTO plano_id;

  INSERT INTO coordenadas_seccion(id_seccion,id_plano,elemento_svg_id,x,y,ancho,alto)
  SELECT s.id, plano_id, 'cupo-'||v.nombre, v.x, v.y, 56, 32
  FROM (VALUES
    ('A-01',40,50), ('A-02',106,50), ('A-03',172,50), ('A-04',238,50), ('A-05',304,50),
    ('A-06',40,95), ('A-07',106,95), ('A-08',172,95), ('A-09',238,95), ('A-10',304,95),
    ('B-01',430,50), ('B-02',496,50), ('B-03',562,50),
    ('B-04',430,95), ('B-05',496,95), ('B-06',562,95),
    ('C-17',40,240), ('C-18',106,240), ('C-19',172,240), ('C-20',238,240), ('C-21',304,240), ('C-22',370,240), ('C-23',436,240),
    ('C-24',40,285), ('C-25',106,285), ('C-26',172,285), ('C-27',238,285), ('C-28',304,285), ('C-29',370,285), ('C-30',436,285)
  ) AS v(nombre,x,y)
  JOIN secciones s ON s.nombre=v.nombre AND s.id_parqueadero=1;
END $$;
