# Lector de placas: pruebas en dispositivos y piloto

Guía para la fase F5 del plan de integración. Las pruebas automáticas
(paridad con Python, unitarias y degradación) ya pasan; lo que falta medir
solo se puede medir con celulares reales y en portería.

## 1. Pruebas automáticas (antes de cada versión)

| Prueba | Comando (en `frontend/`) | Criterio |
|---|---|---|
| Unitarias | `npm test` | Todas pasan |
| Paridad con Python | `$env:ALPR_PARIDAD_DIR="C:\sgdpu\sgdpu-placas-ocr\runs\paridad"; npm test` | Misma placa ≥ 99 %, confianza ±0,01, caja ±2 px |
| Degradación | `npm run prueba:degradacion -- --foto <foto de un carro>.jpg` | Los 6 escenarios pasan |

`prueba:degradacion` abre Chrome sin interfaz y comprueba que en cada falla
aparezca el aviso correcto y que la placa se pueda escribir a mano:

1. Lectura con la cámara (la foto se usa como cámara simulada).
2. Cámara denegada por el usuario.
3. Página sin HTTPS (la cámara no está disponible).
4. Modelo dañado (falla la verificación sha256).
5. Red lenta (los modelos no llegan en 30 s).
6. Navegador sin WebAssembly.

Resultado del 23-nov-2026: 6/6 escenarios pasan; paridad 163/163.

En Windows, ejecutar desde una ruta con la unidad en mayúscula (`C:\...`).

## 2. Pruebas en dispositivos

**Montaje:** en el PC, backend no requerido. En `frontend/`:
`npm run dev:movil`. En cada celular, conectado a la misma red, abrir
`https://<IP-del-PC>:5173/pruebas/lector.html` y aceptar el aviso del
certificado.

El banco de pruebas muestra el tiempo de carga de los modelos y, por cada
captura, la placa, el nivel (verde/ámbar/rojo), la confianza, los votos y el
tiempo. «Copiar resultados (JSON)» copia todo con los datos del dispositivo.

**Dispositivos:** al menos tres.

| Gama | Ejemplo | Navegador |
|---|---|---|
| Baja | Android con 2–3 GB de RAM | Chrome |
| Media | Android con 4–6 GB de RAM | Chrome |
| Alta | iPhone reciente | Safari |

**Procedimiento por dispositivo:**

1. Abrir el banco y anotar la carga de modelos (primera vez, sin caché).
2. Recargar la página y volver a anotarla (con caché).
3. Leer 10 placas reales: 5 carros y 5 motos (cambiar el tipo en el banco).
   Si es posible, 5 de día y 5 de noche o con poca luz.
4. Dejar el banco abierto 5 minutos y leer otra vez: en Safari iOS se verifica
   que la pestaña no se cierre por memoria.
5. Copiar los resultados y guardarlos con el nombre del dispositivo.

**Criterios (plan §9):**

| Medida | Meta |
|---|---|
| Tiempo por captura (mediana), gama media | ≤ 2 s |
| Tiempo por captura, gama baja | ≤ 3 s; si no, ver §4 |
| Cierres de la pestaña por memoria | Ninguno |
| Carga de modelos con caché | Sin meta; anotar |

**Registro:**

| Dispositivo | Navegador | Carga sin caché | Carga con caché | Mediana captura | Placas correctas | Observaciones |
|---|---|---|---|---|---|---|
| | | | | | / 10 | |
| | | | | | / 10 | |
| | | | | | / 10 | |

## 3. Piloto en portería (1–2 semanas)

**Antes de empezar:**

1. Desplegar con HTTPS (`docs/IMPLEMENTACION.md` → «Despliegue»).
2. Aplicar `database/migrations/009_lectura_placa.sql`.
3. Abrir la app una vez en el celular de la portería con Wi-Fi (descarga los
   modelos, ~19 MB en total; después quedan en caché).
4. Explicar al portero: la cámara sugiere; **él siempre verifica** la placa
   contra el vehículo y corrige si hace falta. Verde = solo confirmar,
   ámbar = revisar los caracteres resaltados, rojo = escribir a mano.

**Durante el piloto:** cada día, un ADMIN revisa **Estadísticas → Lector de
placas**:

- Aceptadas sin corrección (meta ≥ 90 % en placas estándar, de día).
- Corregidas y «Últimas correcciones»: qué caracteres falla (M/N, O/Q/D…).
- Por rango de confianza: si hay correcciones en ≥ 0,90, el umbral U es bajo.
- Por tipo de vehículo: motos aparte de carros.
- Uso del lector: si los porteros dejan de usarlo, preguntar por qué.

Anotar además, de forma cualitativa: quejas de lentitud, problemas de luz
(noche, contraluz, lluvia) y placas especiales que no lee (diplomáticas,
antiguas, de remolque).

**Criterio de aceptación:** ≥ 90 % de lecturas aceptadas sin corrección en
placas estándar de día. Reportar por separado noche y motos.

## 4. Si algo no cumple

| Problema | Acción |
|---|---|
| Captura > 3 s en gama baja | Probar WebGPU y/o hilos WASM (ver `docs/IMPLEMENTACION.md`); exportar el detector a 416 px y medir el recall con `evaluar_detector.py`; si no alcanza, alternativa B del plan (servicio de lectura en el servidor). |
| Aceptación < 90 % | Revisar las correcciones: si los errores tienen confianza alta, subir U; si son de un tipo de placa o condición de luz, reentrenar (F6). |
| Muchas lecturas «sin lectura» | Revisar encuadre e iluminación en la portería; revisar el detector. |
| Cierres en Safari iOS | Bajar el tiempo de inactividad del Worker (`src/alpr/index.js`, 3 min) o liberarlo al cerrar el modal. |
