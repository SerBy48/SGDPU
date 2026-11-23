// Web Worker del lector de placas: descarga los modelos, crea las sesiones de
// ONNX Runtime (WASM) y ejecuta el pipeline sin bloquear la interfaz.
// Mensajes (ver index.js):
//   { id, tipo: 'cargar', base }                       -> { id, ok, info }
//   { id, tipo: 'leer', fotogramas: [{ancho, alto, datos: ArrayBuffer RGBA}], tipoVehiculo }
//                                                      -> { id, ok, resultado }
import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { crearMotor } from './motor.js';
import { leerFotogramas } from './pipeline.js';
import { grisDesdeRGBA, rgbaDesdeGris } from './imagen.js';

// El .wasm se sirve desde la propia app (nombre con hash, cacheable), sin CDN.
ort.env.wasm.wasmPaths = { wasm: wasmUrl };
// Los hilos WASM requieren aislamiento entre orígenes (COOP/COEP); sin él, 1 hilo.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

let carga = null, motor = null, manifest = null;

const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');

async function descargar(url, sha256) {
 const r = await fetch(url);
 if (!r.ok) throw new Error(`No se pudo descargar ${url} (${r.status})`);
 const buf = await r.arrayBuffer();
 // crypto.subtle solo existe en contextos seguros (HTTPS); en HTTP se omite.
 if (sha256 && self.crypto?.subtle && hex(await crypto.subtle.digest('SHA-256', buf)) !== sha256)
  throw new Error(`El modelo ${url} está dañado (sha256 distinto)`);
 return new Uint8Array(buf);
}

async function cargar(base) {
 const r = await fetch(`${base}manifest.json`, { cache: 'no-cache' });
 if (!r.ok) throw new Error(`No se encontró ${base}manifest.json`);
 manifest = await r.json();
 const [det, ocr] = await Promise.all([
  descargar(base + manifest.detector.archivo, manifest.detector.sha256),
  descargar(base + manifest.ocr.archivo, manifest.ocr.sha256),
 ]);
 motor = await crearMotor(ort, det, ocr);
 return { version: manifest.version, ui: manifest.ui || {} };
}

self.onmessage = async ({ data }) => {
 const { id, tipo } = data;
 try {
  if (tipo === 'cargar') {
   carga ??= cargar(data.base).catch(e => { carga = null; throw e; });
   self.postMessage({ id, ok: true, info: await carga });
  } else if (tipo === 'leer') {
   if (!carga) throw new Error('Los modelos no están cargados');
   await carga;
   const t0 = performance.now();
   const fotogramas = data.fotogramas.map(f => ({
    gris: grisDesdeRGBA(new Uint8Array(f.datos), f.ancho, f.alto), ancho: f.ancho, alto: f.alto,
   }));
   const r = await leerFotogramas(motor, fotogramas, { tipoVehiculo: data.tipoVehiculo || null });
   const recorte = r.recorte ? { ancho: r.recorte.ancho, alto: r.recorte.alto, datos: rgbaDesdeGris(r.recorte.gris) } : null;
   const resultado = { ...r, recorte, versionModelos: manifest.version, ms: Math.round(performance.now() - t0) };
   self.postMessage({ id, ok: true, resultado }, recorte ? [recorte.datos.buffer] : []);
  } else {
   throw new Error(`Mensaje desconocido: ${tipo}`);
  }
 } catch (e) {
  self.postMessage({ id, ok: false, error: String(e?.message || e) });
 }
};
