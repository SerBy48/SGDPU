// Corrección por formato de placa colombiana (port de common.corregir del
// proyecto sgdpu-placas-ocr). Debe coincidir con PLATE_FORMAT de utils/text.js
// y de backend/src/utils/text.js.
// L = letra, D = dígito.
export const FORMATOS = { CARRO: 'LLLDDD', MOTO: 'LLLDDL' };

const A_DIGITO = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6', T: '7', A: '4' };
const A_LETRA = { 0: 'O', 1: 'I', 2: 'Z', 5: 'S', 8: 'B', 6: 'G', 7: 'T', 4: 'A' };
const esDigito = c => c >= '0' && c <= '9';

// Corrige confusiones letra/dígito según la posición. Con tipo CARRO o MOTO se
// fuerza ese formato; sin tipo, gana el que exija menos cambios.
// Devuelve { texto, valido }.
export function corregir(texto, tipo = null) {
 texto = String(texto).toUpperCase();
 if (!/^[A-Z0-9]{6}$/.test(texto)) return { texto, valido: false };
 const formatos = FORMATOS[tipo] ? [FORMATOS[tipo]] : Object.values(FORMATOS);
 let mejor = null;
 for (const fmt of formatos) {
  let salida = '', cambios = 0, ok = true;
  for (let i = 0; i < 6; i++) {
   const ch = texto[i];
   let nuevo = ch;
   if (fmt[i] === 'L' && esDigito(ch)) nuevo = A_LETRA[ch];
   else if (fmt[i] === 'D' && !esDigito(ch)) nuevo = A_DIGITO[ch];
   if (nuevo === undefined) { ok = false; break; }
   cambios += nuevo !== ch;
   salida += nuevo;
  }
  if (ok && (mejor === null || cambios < mejor.cambios)) mejor = { texto: salida, cambios };
 }
 return mejor ? { texto: mejor.texto, valido: true } : { texto, valido: false };
}
