# Notas de implementación

## Correspondencia con requisitos

- RF-001: registro público → `POST /api/auth/register`, siempre rol CONSULTOR.
- RF-002/RNF-004: login, JWT de corta duración y refresh token rotativo.
- RF-003: bloqueo después de 5 intentos fallidos durante 15 minutos.
- RF-005: logout revoca refresh token.
- RF-006: administración de porteros.
- RF-007/RF-008/RF-009: estructura de parqueaderos, secciones y horarios en PostgreSQL; el MVP administrativo incluye la base para ampliar configuración.
- RF-010/RNF-010: auditoría y movimientos históricos sin endpoints de edición/eliminación; triggers de BD rechazan UPDATE/DELETE.
- RF-011/RF-012/RNF-009: entrada/salida con transacción y `SELECT ... FOR UPDATE`.
- RF-013/RF-014: alerta de lleno y orientación a otros parqueaderos.
- RF-016/RF-017/RNF-003: disponibilidad, indicadores visuales y actualización Socket.IO + respaldo de 5 s.
- RF-018/RF-019/RF-020/RF-021: estadísticas, reportes e historial.

## Decisión sobre cupos

La documentación de datos define SECCION como entidad con `capacidad` y `cupos_disponibles`, y permite que el plano represente secciones/cupos individuales. Para el plano demostrativo cada cupo se modela como una SECCION de capacidad 1. Esto mantiene el esquema descrito sin inventar una tabla adicional de CUPOS.

## Limitaciones deliberadas del MVP

1. El archivo SVG se incluye como recurso demostrativo. La interfaz administrativa de carga/edición visual del SVG puede ampliarse sobre las tablas `planos_parqueadero` y `coordenadas_seccion`.
2. La exportación PDF/Excel está preparada en el modelo de datos y endpoints de reportes, pero la generación binaria debe añadirse con las librerías de exportación seleccionadas si se requiere el entregable final con archivos descargables.
3. Recuperación de contraseña por correo institucional no se implementa porque el documento la marca como Should Have y además indica que la integración con correo institucional queda fuera del alcance de la primera versión.

## Lector de placas

El portero puede leer la placa con la cámara del celular en el modal de ENTRADA.
La lectura corre en el navegador (`frontend/src/alpr/`): detector YOLO11n +
OCR fast-plate-ocr en ONNX Runtime Web (WASM), dentro de un Web Worker. La
imagen no sale del dispositivo; al backend solo llegan la placa confirmada por el
portero y, opcionalmente, `lecturaPlaca` (`{sugerida, confianza, versionModelos}`),
que se guarda en `ocupaciones` (migración 009) para medir en
**Estadísticas → Lector de placas** cuántas sugerencias se aceptan sin corregir.

- El portero siempre confirma: el sistema prellena el campo y marca la lectura
  en verde (confianza ≥ U y al menos 2 de 3 fotogramas coinciden), ámbar
  (revisar, con los caracteres dudosos resaltados) o rojo (escribir a mano).
- U = 0,90, calibrado con las 157 placas de val+test del proyecto
  `sgdpu-placas-ocr` (`exportar_referencias.py`); está en
  `frontend/public/models/manifest.json` (`ui.umbral_verde`) y se ajusta ahí.
- Si no hay cámara, HTTPS, WebAssembly o los modelos no cargan, el campo de
  placa funciona manual como siempre.
- Paridad con el lector de Python: 163/163 imágenes con la misma lectura
  (`npm test` con `ALPR_PARIDAD_DIR`, ver README).

### Despliegue

Configuración de referencia: `deploy/nginx/sgdpu.conf` (+ `sgdpu-cabeceras.conf`).

1. **HTTPS obligatorio**: sin contexto seguro el navegador no permite la cámara.
2. Compilar el frontend con la API en el mismo origen y los archivos ya
   comprimidos: `cd frontend && npm run build:nginx`; copiar `frontend/dist/` a
   la carpeta `root` de nginx.
3. Backend con `NODE_ENV=production`, `TRUST_PROXY=1` y
   `FRONTEND_URL=https://<dominio>`; nginx reenvía `/api` y `/socket.io` a :4000.
4. Base de datos: aplicar `database/migrations/009_lectura_placa.sql`.
5. Comprobar: `curl -I https://<dominio>/assets/<...>.wasm` debe responder
   `Content-Type: application/wasm` y `Cache-Control: ... immutable`;
   `models/manifest.json`, `no-cache`.

Qué hace la configuración y por qué:

| Tema | Decisión |
|---|---|
| Caché | `assets/*` (nombres con hash) y `models/*.onnx` (nombres con versión): 1 año, `immutable`. `index.html` y `models/manifest.json`: `no-cache`. Primera visita ≈ 15,5 MB de modelos + 3,8 MB del motor; después, desde caché. Conviene precargar en el Wi-Fi de la portería. |
| Compresión | `gzip_static` con los `.gz` que genera `scripts/precomprimir.mjs`. Comprimir el `.wasm` (15 MB) al vuelo tardaba segundos por descarga. |
| CSP | `script-src 'self' 'wasm-unsafe-eval'` (WebAssembly), `worker-src 'self'`, Google Fonts permitido. Probada en Chrome sin violaciones en las páginas de ADMIN y PORTERO. |
| Cámara | `Permissions-Policy: camera=(self)`. |
| Hilos WASM | No activados: requieren `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`, que bloquearían recursos externos (Google Fonts). Activarlos solo si el piloto muestra lentitud. |
| WebGPU | No activado (el motor usa solo WASM): menos descarga y resultados idénticos a Python. Evaluar en el piloto. |
| CDN | No se usa: el `.wasm` y los modelos se sirven desde el propio servidor (funciona en la red del campus sin salida a internet, salvo la tipografía). |

Verificado con nginx 1.27 en Docker, TLS autofirmado, backend y PostgreSQL 16
reales: redirección HTTP→HTTPS, rutas de la SPA, cabeceras y caché por tipo de
archivo, `/api` y WebSocket por el proxy, y el lector leyendo una foto real con
verificación sha256 de los modelos bajo la CSP.

### Actualizar los modelos

Los modelos llevan la versión en el nombre y el frontend registra
`versionModelos` en cada lectura, de modo que Estadísticas compara versiones con
datos de campo. Para publicar una versión nueva ver «Mejora continua» abajo.

### Mejora continua (F6)

Ciclo para mejorar el lector con datos de campo. Las herramientas de Python
están en el proyecto `sgdpu-placas-ocr`; las de JavaScript, en `frontend/`.

1. **Medir.** Estadísticas → Lector de placas: aceptadas sin corrección, por
   vehículo, parqueadero, rango de confianza y versión de modelos; «Exportar
   lecturas (CSV)» descarga todas las lecturas del periodo.
2. **Recalibrar U** (si hay errores en verde o demasiados ámbar):
   `python calibrar_campo.py sgdpu_lecturas_placa.csv` muestra, por umbral,
   cuántas lecturas saldrían en verde y cuántos errores pasarían, y recomienda
   el menor U con ≤ 1 % de errores en verde (`--max-error`). Requiere ≥ 200
   lecturas para ser confiable. «Acierto» = el portero no corrigió, que es una
   aproximación. También lista las confusiones de caracteres más frecuentes.
3. **Reentrenar** (si el problema es del modelo: un carácter, un tipo de placa
   o una condición de luz): `train.py detector` / `ocr_placas.py entrenar`,
   medir con `evaluate.py` y regenerar las referencias de paridad con
   `exportar_referencias.py`. SGDPU **no guarda imágenes**; usar recortes de
   campo para reentrenar requiere antes una decisión y una política de datos
   de la universidad (Ley 1581).
4. **Publicar.** En `frontend/`:
   `node scripts/publicar-modelos.mjs --version <AAAA-MM-DD> --detector <.onnx> --ocr <.onnx> [--umbral U]`.
   Comprueba que los modelos corran con el motor y tengan las entradas y
   salidas esperadas, copia los archivos con la versión en el nombre, calcula
   el sha256, actualiza `manifest.json` y borra los de la versión anterior
   (`--conservar` para dejarlos). Solo el umbral: `--umbral U` sin modelos.
5. **Verificar y desplegar.** `npm test` con `ALPR_PARIDAD_DIR` (paridad con
   las referencias nuevas) y `npm run prueba:degradacion`; luego
   `npm run build:nginx` y desplegar. Como los nombres cambian, los celulares
   descargan los modelos nuevos una vez.
6. **Comparar.** En Estadísticas, la tabla «Por versión de modelos» compara la
   versión nueva con la anterior con datos reales.
