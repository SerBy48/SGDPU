// Paridad JS <-> Python sobre las imágenes de val/test y las fotos reales.
// Requiere las referencias de exportar_referencias.py (proyecto sgdpu-placas-ocr):
//   PowerShell:  $env:ALPR_PARIDAD_DIR="C:\sgdpu\sgdpu-placas-ocr\runs\paridad"; npm test
// Sin esa variable la prueba se omite.
// Criterio (plan §9): misma placa en >= 99 % de los casos, confianza ±0,01, caja ±2 px.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as ort from 'onnxruntime-web';
import { crearMotor } from '../motor.js';
import { leerImagen } from '../pipeline.js';

const DIR = process.env.ALPR_PARIDAD_DIR;
const MODELOS = new URL('../../../public/models/', import.meta.url);

function leerPgm(archivo) {
 const buf = fs.readFileSync(archivo);
 const cab = buf.subarray(0, 64).toString('latin1').match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
 const [, ancho, alto] = cab.map(Number);
 return { gris: new Uint8Array(buf.buffer, buf.byteOffset + cab[0].length, ancho * alto), ancho, alto };
}

describe.skipIf(!DIR)('paridad con lector_onnx.py', () => {
 it('misma lectura, confianza y caja que Python', async () => {
  ort.env.wasm.numThreads = 1;
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', MODELOS)));
  const motor = await crearMotor(ort,
   fs.readFileSync(new URL(manifest.detector.archivo, MODELOS)),
   fs.readFileSync(new URL(manifest.ocr.archivo, MODELOS)));
  const { casos } = JSON.parse(fs.readFileSync(path.join(DIR, 'referencias.json'), 'utf8'));

  let iguales = 0, maxConf = 0, maxCaja = 0, aciertos = 0, conTexto = 0;
  const distintos = [];
  for (const c of casos) {
   const { gris, ancho, alto } = leerPgm(path.join(DIR, c.pgm));
   const js = await leerImagen(motor, gris, ancho, alto, c.tipo);
   const py = c.lecturas;
   const a = js[0], b = py[0];
   const ok = (a?.placa ?? '') === (b?.placa ?? '') && js.length === py.length;
   iguales += ok;
   if (!ok) distintos.push(`${c.id} ${c.archivo}: js=${js.map(r => r.placa)} py=${py.map(r => r.placa)}`);
   if (a && b) {
    maxConf = Math.max(maxConf, Math.abs(a.confianza - b.confianza));
    maxCaja = Math.max(maxCaja, ...a.caja.map((v, k) => Math.abs(v - b.caja[k])));
   }
   if (c.real.length) {
    conTexto += c.real.length;
    aciertos += c.real.filter(t => js.some(r => r.placa === t)).length;
   }
  }
  const pct = 100 * iguales / casos.length;
  const resumen = `Paridad: ${iguales}/${casos.length} (${pct.toFixed(1)} %) · máx. Δconfianza ${maxConf.toFixed(4)} · máx. Δcaja ${maxCaja} px · placas leídas ${aciertos}/${conTexto} (${(100 * aciertos / conTexto).toFixed(1)} %)`
   + (distintos.length ? '\nDistintos:\n  ' + distintos.join('\n  ') : '');
  console.log(resumen);
  fs.writeFileSync(path.join(DIR, 'resultado_js.txt'), resumen + '\n');
  expect(pct).toBeGreaterThanOrEqual(99);
  expect(maxConf).toBeLessThanOrEqual(0.01);
  expect(maxCaja).toBeLessThanOrEqual(2);
  await motor.liberar();
 }, 900_000);
});
