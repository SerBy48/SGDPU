# SGDPU — Sistema para la Gestión de Disponibilidad de Parqueaderos USCO

Implementación web del SGDPU basada en `SGDPU_Requerimientos.docx`, la matriz de requerimientos y los prototipos HTML entregados.

## Arquitectura

- **Frontend:** React + Vite + React Router + Recharts + Socket.IO Client.
- **Backend:** Node.js + Express + PostgreSQL + Socket.IO + JWT/refresh tokens.
- **Base de datos:** PostgreSQL independiente, con script SQL y Docker Compose.
- **Documentación API:** Swagger/OpenAPI en `/api/docs`.

La documentación de requisitos establece React.js, Node.js/Express.js, PostgreSQL, WebSockets/SSE y JWT con refresh tokens rotativos como tecnologías base. También exige actualización de cupos en máximo 5 segundos, transacciones atómicas e inmutabilidad de históricos.

## Estructura

```text
SGDPU/
├── frontend/       # Aplicación React
├── backend/        # API REST + tiempo real
├── database/       # PostgreSQL, esquema, funciones y seed
├── docs/
└── README.md
```

## Requisitos

- Node.js 20+
- npm 10+
- Docker Desktop (recomendado para PostgreSQL) o PostgreSQL 15+
- Git opcional

## 1. Base de datos

```bash
cd database
docker compose up -d
```

La base queda disponible en:

- Host: `localhost`
- Puerto: `5434` (remapeado desde el 5432 del contenedor porque el host ya tenía instalaciones nativas de PostgreSQL ocupando el 5432 y el 5433; ajustar en `docker-compose.yml`/`.env` si no aplica en tu equipo)
- Base: `sgdpu`
- Usuario: `sgdpu`
- Contraseña: `sgdpu_dev`

El contenedor ejecuta automáticamente `schema.sql` y `seed.sql`.

Si ya existe una instancia PostgreSQL, se pueden ejecutar ambos archivos manualmente:

```bash
psql -U postgres -f schema.sql
psql -U postgres -d sgdpu -f seed.sql
```

### Migraciones

`schema.sql` ya incluye todos los cambios para instalaciones nuevas. Sobre una base creada antes, aplicar en orden los archivos de `database/migrations/` que falten, por ejemplo:

```bash
docker exec -i sgdpu-postgres psql -U sgdpu -d sgdpu < migrations/008_revision_general.sql
```

> `008_revision_general.sql` cambia el hash de los tokens a SHA-256: tras aplicarla, todos los usuarios deben iniciar sesión de nuevo y los enlaces de verificación/recuperación pendientes dejan de ser válidos.

## 2. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

En Linux/macOS:

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

`npm run seed` genera hashes bcrypt reales y crea/actualiza las tres cuentas locales de demostración.

En Linux/macOS:

```bash
cp .env.example .env
npm install
npm run dev
```

API: http://localhost:4000  
Swagger: http://localhost:4000/api/docs

## 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Aplicación: http://localhost:5173

### Lector de placas (cámara)

En el modal de ENTRADA, el portero puede leer la placa con la cámara del
celular. La lectura corre en el propio navegador (`src/alpr/`: detector YOLO11n
y OCR fast-plate-ocr con ONNX Runtime Web, en un Web Worker): la imagen nunca
sale del dispositivo y al backend solo llega el texto. El sistema prellena el
campo y muestra la confianza (verde, ámbar o rojo); el portero siempre
confirma o corrige.

- Los modelos están en `frontend/public/models/` (con versión en el nombre y
  `manifest.json` con su sha256 y el umbral de confianza). La primera vez se
  descargan ~15,5 MB y el motor WASM ~3,8 MB comprimido; después quedan en caché.
- La cámara solo funciona con HTTPS o en `localhost`. Para probar desde un
  celular en la misma red: `npm run dev:movil` (HTTPS autofirmado; la API pasa
  por el proxy de Vite) y abrir `https://<IP-del-PC>:5173`, aceptando el aviso
  del certificado.
- Pruebas: `npm test`. La paridad con el lector de Python se mide con las
  referencias de `exportar_referencias.py` (proyecto `sgdpu-placas-ocr`):
  `$env:ALPR_PARIDAD_DIR="C:\sgdpu\sgdpu-placas-ocr\runs\paridad"; npm test`.
  En Windows, ejecutar desde una ruta con la unidad en mayúscula (`C:\...`):
  con `c:\...` Vitest carga dos veces sus módulos y falla.
- Licencias: el detector (Ultralytics YOLO) es AGPL-3.0; el OCR es MIT.

## Credenciales de demostración

> Son cuentas locales de desarrollo creadas por `seed.sql`. Cambiarlas antes de cualquier despliegue real.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@sgdpu.local | Admin123! |
| Portero | portero@sgdpu.local | Portero123! |
| Consultor | consultor@sgdpu.local | Consultor123! |

El registro público siempre crea una cuenta **CONSULTOR**.

## Flujo recomendado de prueba

1. Iniciar PostgreSQL.
2. Levantar backend.
3. Levantar frontend.
4. Entrar como administrador.
5. Revisar Parqueaderos, Porteros, Estadísticas, Reportes, Auditoría e Incidencias.
6. Abrir otra ventana como Portero y probar selección de cupo + entrada/salida.
7. Abrir otra ventana como Consultor y comprobar que el estado cambia sin recargar.

## Tiempo real

El backend emite `parking:update` por Socket.IO después de movimientos y de cambios de cupos o plano hechos por el administrador. El frontend también realiza una sincronización de respaldo cada 5 segundos.

## Seguridad e históricos

- Contraseñas con bcrypt.
- Access JWT de corta duración.
- Refresh tokens persistidos como hash y rotados.
- Revocación de refresh token en logout.
- Bloqueo tras intentos fallidos.
- Endpoints de movimientos/auditoría/reportes históricos no tienen PUT/DELETE.
- La capacidad solo cambia con motivo registrado en auditoría: inhabilitando cupos temporalmente o subiendo un nuevo plano .svg (revisado y saneado antes de guardarse).
- Las operaciones de entrada/salida usan transacciones y bloqueo de fila en PostgreSQL.
- La base incluye triggers que rechazan UPDATE/DELETE de movimientos y auditoría.

## Exportación

El módulo de Reportes incluye exportación del historial activo a PDF y Excel desde el backend.

## Nota sobre SVG

Se incluye `frontend/public/parking.svg` como plano demostrativo inspirado en el prototipo. En una instalación real, el administrador puede reemplazarlo por el SVG correspondiente al parqueadero y configurar las secciones/coordenadas mediante el módulo administrativo.

## Alcance

Esta versión implementa el aplicativo web solicitado. La documentación original contempla también una aplicación móvil, pero la solicitud actual se concentra en el aplicativo web, backend y base de datos.
