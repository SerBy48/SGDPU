// Decodificación del OCR fast-plate-ocr (salida "plate": [N, 10, 37] de
// probabilidades). Igual que fast_plate_ocr.postprocess_output + lector.py:
// argmax por casilla, se quita el relleno "_" solo al final y la confianza por
// carácter es la probabilidad máxima de cada una de las casillas que quedan.
import { corregir } from './formato.js';

export const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
export const CASILLAS = 10;
const RELLENO = '_';

// salida: Float32Array; k: índice de la placa dentro del lote.
export function decodificarOcr(salida, k = 0, tipo = null) {
 const C = ALFABETO.length, base = k * CASILLAS * C;
 let crudo = '';
 const probs = [];
 for (let s = 0; s < CASILLAS; s++) {
  const o = base + s * C;
  let mejor = 0;
  for (let c = 1; c < C; c++) if (salida[o + c] > salida[o + mejor]) mejor = c;
  crudo += ALFABETO[mejor];
  probs.push(salida[o + mejor]);
 }
 let fin = crudo.length;
 while (fin > 0 && crudo[fin - 1] === RELLENO) fin--;
 crudo = crudo.slice(0, fin);
 const porCaracter = probs.slice(0, fin);
 const { texto, valido } = corregir(crudo, tipo);
 return {
  placa: texto,
  formatoValido: valido,
  confianza: porCaracter.length ? Math.min(...porCaracter) : 0,
  confianzaPorCaracter: porCaracter,
  lecturaCruda: crudo,
 };
}
