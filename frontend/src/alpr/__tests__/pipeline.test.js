// NMS, decodificación, votación, pipeline con un motor simulado y regla de color.
import { describe, expect, it } from 'vitest';
import { nms, decodificarDetector, cajaConMargen } from '../detector.js';
import { decodificarOcr, ALFABETO } from '../ocr.js';
import { votar } from '../votacion.js';
import { leerFotogramas, nivelConfianza } from '../pipeline.js';

// Salida OCR simulada: una placa (rellenada con "_") y una probabilidad por casilla.
function salidaOcr(textos, prob = 0.95) {
 const C = ALFABETO.length, out = new Float32Array(textos.length * 10 * C);
 textos.forEach((t, k) => {
  const p = t.padEnd(10, '_');
  for (let s = 0; s < 10; s++) {
   const o = (k * 10 + s) * C;
   const q = Array.isArray(prob) ? prob[s] : prob;
   out.fill((1 - q) / (C - 1), o, o + C);
   out[o + ALFABETO.indexOf(p[s])] = q;
  }
 });
 return out;
}

describe('detector', () => {
 it('NMS conserva la mejor y elimina solapes > 0,7', () => {
  const r = nms([
   { caja: [0, 0, 10, 10], score: 0.5 },
   { caja: [0, 0, 10, 9.5], score: 0.9 },
   { caja: [20, 20, 30, 30], score: 0.6 },
   { caja: [0, 0, 10, 5], score: 0.4 },  // IoU 0,5 con la mejor: se conserva
  ]);
  expect(r.map(c => c.score)).toEqual([0.9, 0.6, 0.4]);
 });

 it('decodifica [5,N], filtra score <= 0,25 y deshace el letterbox', () => {
  const N = 3, s = new Float32Array(5 * N);
  // candidato 0: centro (320, 320), 100x40 en el letterbox; candidato 1 bajo el umbral
  [[320, 320, 100, 40, 0.9], [100, 100, 20, 20, 0.25], [500, 400, 50, 20, 0.6]]
   .forEach((v, i) => v.forEach((x, k) => { s[k * N + i] = x; }));
  const lb = { nw: 640, nh: 360, padX: 0, padY: 140 };
  const r = decodificarDetector(s, lb, 1280, 720);
  expect(r).toHaveLength(2);
  expect(r[0].caja).toEqual([540, 320, 740, 400]);
  expect(r[0].score).toBeCloseTo(0.9, 6);
 });

 it('margen de 10 % limitado a la imagen y descarte de cajas mínimas', () => {
  expect(cajaConMargen([100, 50, 200, 90], 1000, 1000)).toEqual([90, 46, 210, 94]);
  expect(cajaConMargen([0, 0, 50, 20], 40, 1000)).toEqual([0, 0, 40, 22]);
  expect(cajaConMargen([10, 10, 15, 12], 100, 100)).toBeNull();
 });
});

describe('ocr', () => {
 it('quita el relleno final y toma la confianza mínima', () => {
  const r = decodificarOcr(salidaOcr(['UAQ629'], [0.99, 0.98, 0.97, 0.9, 0.95, 0.96, 0.9, 0.9, 0.9, 0.9]), 0, 'CARRO');
  expect(r.placa).toBe('UAQ629');
  expect(r.formatoValido).toBe(true);
  expect(r.confianzaPorCaracter).toHaveLength(6);
  expect(r.confianza).toBeCloseTo(0.9, 6);
 });

 it('corrige por formato según el tipo del cupo', () => {
  expect(decodificarOcr(salidaOcr(['ZZM751']), 0, 'MOTO').placa).toBe('ZZM75I');
  expect(decodificarOcr(salidaOcr(['ZZM751']), 0, 'CARRO').placa).toBe('ZZM751');
 });

 it('un relleno en medio no es placa válida', () => {
  const r = decodificarOcr(salidaOcr(['ABC_23']), 0, 'CARRO');
  expect(r.formatoValido).toBe(false);
 });
});

describe('votación', () => {
 const l = (placa, conf = 0.9, valido = true) => ({ placa, formatoValido: valido, confianza: conf, confianzaPorCaracter: Array(6).fill(conf), lecturaCruda: placa });

 it('gana el carácter más frecuente en cada posición', () => {
  const r = votar([l('PNA202'), l('PMA202', 0.95), l('PNA202')]);
  expect(r.placa).toBe('PNA202');
  expect(r.votos).toBe(2);
 });

 it('en empate gana la mayor confianza', () => {
  expect(votar([l('ABC123', 0.6), l('ABC128', 0.9)]).placa).toBe('ABC128');
 });

 it('ignora lecturas sin formato y sin ninguna válida devuelve la más confiable', () => {
  expect(votar([l('AB', 0.99, false), l('ABC123', 0.7)]).placa).toBe('ABC123');
  const r = votar([l('AB', 0.5, false), l('XYZ', 0.8, false)]);
  expect(r).toMatchObject({ placa: 'XYZ', formatoValido: false, votos: 0 });
  expect(votar([])).toMatchObject({ placa: '', formatoValido: false });
 });
});

describe('pipeline con motor simulado', () => {
 it('detector una vez, OCR por fotograma y votación', async () => {
  let detecciones = 0;
  const lecturasPorLlamada = [['UAQ629'], ['UAQ629', 'UAO629']];
  const motor = {
   async detectar() {
    detecciones++;
    const N = 1, s = new Float32Array(5);
    [320, 320, 200, 60, 0.9].forEach((x, k) => { s[k * N] = x; });
    return s;
   },
   async leer(_datos, n) {
    const textos = lecturasPorLlamada.shift();
    expect(textos).toHaveLength(n);
    return salidaOcr(textos, 0.97);
   },
  };
  const f = () => ({ gris: new Uint8Array(640 * 640).fill(90), ancho: 640, alto: 640 });
  const r = await leerFotogramas(motor, [f(), f(), f()], { tipoVehiculo: 'CARRO' });
  expect(detecciones).toBe(1);
  expect(r.placa).toBe('UAQ629');
  expect(r.lecturas).toEqual(['UAQ629', 'UAQ629', 'UAO629']);
  expect(r.votos).toBe(2);            // la Q gana 2 a 1 en la tercera posición
  expect(r.caja).toEqual([200, 284, 440, 356]);
  expect(nivelConfianza(r)).toBe('verde');
 });

 it('sin detecciones devuelve lectura vacía', async () => {
  const motor = { detectar: async () => new Float32Array(5 * 4), leer: async () => { throw new Error('no debe leer'); } };
  const r = await leerFotogramas(motor, [{ gris: new Uint8Array(100), ancho: 10, alto: 10 }]);
  expect(r.placa).toBe('');
  expect(nivelConfianza(r)).toBe('rojo');
 });
});

describe('regla de color', () => {
 const base = { placa: 'ABC123', formatoValido: true, confianza: 0.95, votos: 3, fotogramas: 3 };
 it('verde, ámbar y rojo', () => {
  expect(nivelConfianza(base)).toBe('verde');
  expect(nivelConfianza({ ...base, confianza: 0.85 })).toBe('ambar');
  expect(nivelConfianza({ ...base, votos: 1 })).toBe('ambar');
  expect(nivelConfianza({ ...base, formatoValido: false })).toBe('rojo');
  expect(nivelConfianza({ ...base, votos: 1, fotogramas: 1 })).toBe('verde');
 });
});
