// Preprocesado y corrección por formato contra salidas reales de OpenCV y de
// common.corregir (fixtures/opencv.json, generado con fixtures_imagen.py del
// proyecto sgdpu-placas-ocr).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { grisDesdeRGBA, redimensionar, letterbox, recortar, entradaOcr, redondearPar } from '../imagen.js';
import { corregir } from '../formato.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/opencv.json', import.meta.url)));
const bytes = s => new Uint8Array(Buffer.from(s, 'base64'));

describe('imagen (paridad con OpenCV)', () => {
 it('gris = cv2.cvtColor(RGB2GRAY)', () => {
  const rgb = bytes(fx.gris.rgb), n = rgb.length / 3, rgba = new Uint8Array(4 * n);
  for (let i = 0; i < n; i++) rgba.set([rgb[3 * i], rgb[3 * i + 1], rgb[3 * i + 2], 255], 4 * i);
  expect(Array.from(grisDesdeRGBA(rgba, n, 1))).toEqual(Array.from(bytes(fx.gris.salida)));
 });

 for (const c of fx.resize) {
  it(`resize ${c.ancho}x${c.alto} -> ${c.nuevoAncho}x${c.nuevoAlto} idéntico a cv2.INTER_LINEAR`, () => {
   const out = redimensionar(bytes(c.entrada), c.ancho, c.alto, c.nuevoAncho, c.nuevoAlto);
   const esp = bytes(c.salida);
   let distintos = 0;
   for (let i = 0; i < esp.length; i++) distintos += out[i] !== esp[i];
   expect(distintos).toBe(0);
  });
 }

 it('letterbox centra, rellena con 114 y escala como ultralytics', () => {
  const gris = new Uint8Array(1280 * 720).fill(200);
  const lb = letterbox(gris, 1280, 720);
  expect([lb.nw, lb.nh, lb.padX, lb.padY]).toEqual([640, 360, 0, 140]);
  expect(lb.tensor.length).toBe(3 * 640 * 640);
  expect(lb.tensor[0]).toBeCloseTo(114 / 255, 6);                 // relleno arriba
  expect(lb.tensor[140 * 640]).toBeCloseTo(200 / 255, 6);         // primera fila de imagen
  expect(lb.tensor[640 * 640 + 140 * 640]).toBe(lb.tensor[140 * 640]); // canal 2 = canal 1
  const cuadrada = letterbox(new Uint8Array(416 * 416), 416, 416);
  expect([cuadrada.nw, cuadrada.nh, cuadrada.padX, cuadrada.padY]).toEqual([640, 640, 0, 0]);
 });

 it('redondearPar imita round() de Python', () => {
  expect([0.5, 1.5, 2.5, -0.5, 2.4, 2.6].map(redondearPar)).toEqual([0, 2, 2, 0, 2, 3]);
 });

 it('recorte y entrada del OCR', () => {
  const gris = Uint8Array.from({ length: 20 * 10 }, (_, i) => i % 256);
  const r = recortar(gris, 20, [2, 3, 7, 5]);
  expect([r.ancho, r.alto]).toEqual([5, 2]);
  expect(Array.from(r.gris)).toEqual([62, 63, 64, 65, 66, 82, 83, 84, 85, 86]);
  const e = entradaOcr(r.gris, r.ancho, r.alto);
  expect(e.length).toBe(64 * 128 * 3);
  expect(e[0]).toBe(e[1]);
 });
});

describe('formato (paridad con common.corregir)', () => {
 for (const c of fx.formato) {
  it(`${JSON.stringify(c.texto)} / ${c.tipo ?? 'sin tipo'} -> ${c.salida} (${c.valido ? 'válida' : 'inválida'})`, () => {
   expect(corregir(c.texto, c.tipo)).toEqual({ texto: c.salida, valido: c.valido });
  });
 }
});
