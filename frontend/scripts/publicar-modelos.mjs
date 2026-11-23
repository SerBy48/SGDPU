// Publica una versión nueva de los modelos del lector en public/models (fase F6).
// Copia los .onnx con la versión en el nombre, comprueba que tengan las
// entradas/salidas que espera el motor (corriéndolos una vez con ONNX Runtime),
// calcula su sha256 y reescribe manifest.json conservando lo demás.
//
// Uso (en frontend/):
//   node scripts/publicar-modelos.mjs --version 2027-01-15 \
//     --detector C:\sgdpu\sgdpu-placas-ocr\models\detector.onnx \
//     --ocr C:\sgdpu\sgdpu-placas-ocr\models\ocr.onnx \
//     [--umbral 0.92] [--metricas metricas.json] [--conservar]
//   --detector / --ocr  basta con uno si solo cambia ese modelo
//   --umbral            nuevo umbral verde U (ui.umbral_verde)
//   --metricas          JSON que reemplaza "metricas" del manifest
//   --conservar         no borra los .onnx de la versión anterior
// Después: regenerar las referencias de paridad (exportar_referencias.py) y
// correr `npm test` con ALPR_PARIDAD_DIR antes de desplegar.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as ort from 'onnxruntime-web';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/models');
const MANIFEST = path.join(DIR, 'manifest.json');
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const bandera = n => process.argv.includes(`--${n}`);
const falla = m => { console.error(m); process.exit(1); };

const version = arg('version');
if (!version || !/^[\w.-]{1,20}$/.test(version)) falla('--version es obligatoria (máx. 20 caracteres: letras, números, . _ -), p. ej. 2027-01-15');
const nuevos = { detector: arg('detector'), ocr: arg('ocr') };
if (!nuevos.detector && !nuevos.ocr && !arg('umbral') && !arg('metricas')) falla('Indique --detector y/o --ocr (o --umbral / --metricas).');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// Lo que espera src/alpr (motor.js / pipeline.js).
const FIRMAS = {
 detector: { tipo: 'float32', forma: [1, 3, 640, 640], salida: d => d.length === 3 && d[1] === 5, salidaTxt: '[1, 5, N]' },
 ocr: { tipo: 'uint8', forma: [1, 64, 128, 3], salida: d => d.length === 3 && d[1] === 10 && d[2] === 37, salidaTxt: '[N, 10, 37]' },
};

async function validar(nombre, bytes) {
 const f = FIRMAS[nombre];
 const s = await ort.InferenceSession.create(bytes);
 const n = f.forma.reduce((a, b) => a * b, 1);
 const datos = f.tipo === 'float32' ? new Float32Array(n).fill(0.45) : new Uint8Array(n).fill(128);
 const r = await s.run({ [s.inputNames[0]]: new ort.Tensor(f.tipo, datos, f.forma) });
 const dims = r[s.outputNames[0]].dims;
 if (!f.salida(dims)) falla(`${nombre}: salida ${JSON.stringify(dims)}, se esperaba ${f.salidaTxt}`);
 await s.release?.();
 return { entrada: s.inputNames[0], salida: s.outputNames[0], dims };
}

ort.env.wasm.numThreads = 1;
const anteriores = [];
for (const nombre of ['detector', 'ocr']) {
 const origen = nuevos[nombre];
 if (!origen) continue;
 if (!fs.existsSync(origen)) falla(`No existe ${origen}`);
 const bytes = fs.readFileSync(origen);
 let firma;
 try { firma = await validar(nombre, bytes); } catch (e) { falla(`${nombre}: no corre con el motor (${e.message})`); }
 const archivo = `${nombre}.${version}.onnx`;
 if (manifest[nombre].archivo !== archivo) anteriores.push(manifest[nombre].archivo);
 fs.writeFileSync(path.join(DIR, archivo), bytes);
 manifest[nombre] = {
  ...manifest[nombre], archivo, bytes: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  entrada: { ...manifest[nombre].entrada, nombre: firma.entrada },
  salida: { ...manifest[nombre].salida, nombre: firma.salida },
 };
 console.log(`${nombre}: ${archivo} (${(bytes.length / 1e6).toFixed(1)} MB) · salida ${JSON.stringify(firma.dims)}`);
}

const umbral = arg('umbral');
if (umbral !== undefined) {
 const u = Number(umbral);
 if (!(u > 0 && u < 1)) falla('--umbral debe estar entre 0 y 1');
 manifest.ui = { ...manifest.ui, umbral_verde: u };
 console.log(`umbral verde U = ${u}`);
}
if (arg('metricas')) manifest.metricas = JSON.parse(fs.readFileSync(arg('metricas'), 'utf8'));
manifest.version = version;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

if (!bandera('conservar')) {
 for (const a of anteriores) {
  const p = path.join(DIR, a);
  if (fs.existsSync(p)) { fs.rmSync(p); console.log(`eliminado ${a} (si estaba versionado, sigue en el historial de git)`); }
 }
}
console.log(`manifest.json -> versión ${version}`);
