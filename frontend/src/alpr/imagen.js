// Preprocesado de imágenes del lector de placas, sobre arreglos de bytes (sin
// canvas), para que corra igual en el Web Worker, en el navegador y en Node
// (pruebas). Replica lo que hace el lector de Python con OpenCV para que el
// modelo reciba los mismos píxeles con los que se entrenó y evaluó:
//   gris   = cv2.cvtColor(RGB2GRAY)
//   resize = cv2.resize(INTER_LINEAR), en aritmética de punto fijo
// Las pruebas (fixtures/opencv.json) comparan píxel a píxel contra OpenCV.

export const PAD_LETTERBOX = 114;

// round() de Python: redondeo al par en los empates exactos (x.5).
export function redondearPar(x) {
 const r = Math.round(x);
 return ((Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r) + 0; // + 0 evita -0
}

// RGBA (ImageData.data) -> gris de 1 canal. Coeficientes enteros de OpenCV
// (BT.601 con 14 bits): Y = (4899 R + 9617 G + 1868 B + 2^13) >> 14.
export function grisDesdeRGBA(rgba, ancho, alto) {
 const n = ancho * alto, gris = new Uint8Array(n);
 for (let i = 0, j = 0; i < n; i++, j += 4)
  gris[i] = (rgba[j] * 4899 + rgba[j + 1] * 9617 + rgba[j + 2] * 1868 + 8192) >> 14;
 return gris;
}

// Índices y pesos (punto fijo, 11 bits) de un eje, como resize.cpp de OpenCV.
// En el eje X los bordes usan peso 1 sobre el píxel extremo; en el eje Y OpenCV
// conserva la fracción y solo recorta el índice de fila (ver redimensionar).
function coeficientes(origen, destino, bordeX) {
 const escala = 1 / (destino / origen);
 const idx = new Int32Array(destino), w0 = new Int32Array(destino), w1 = new Int32Array(destino);
 for (let d = 0; d < destino; d++) {
  let f = Math.fround((d + 0.5) * escala - 0.5);
  let s = Math.floor(f);
  f = Math.fround(f - s);
  if (bordeX && s < 0) { f = 0; s = 0; }
  if (bordeX && s >= origen - 1) { f = 0; s = origen - 1; }
  idx[d] = s;
  w0[d] = redondearPar(Math.fround(Math.fround(1 - f) * 2048));
  w1[d] = redondearPar(Math.fround(f * 2048));
 }
 return { idx, w0, w1 };
}

// Reducción exacta a la mitad: OpenCV cambia INTER_LINEAR por el promedio de
// bloques 2x2 (INTER_AREA rápido).
function mitad(src, ancho, nw, nh) {
 const dst = new Uint8Array(nw * nh);
 for (let y = 0; y < nh; y++) {
  const f0 = 2 * y * ancho, f1 = f0 + ancho;
  for (let x = 0; x < nw; x++) {
   const c = 2 * x;
   dst[y * nw + x] = (src[f0 + c] + src[f0 + c + 1] + src[f1 + c] + src[f1 + c + 1] + 2) >> 2;
  }
 }
 return dst;
}

// cv2.resize(gris, (nw, nh), interpolation=cv2.INTER_LINEAR) para uint8 de 1 canal.
export function redimensionar(src, ancho, alto, nw, nh) {
 if (nw === ancho && nh === alto) return src.slice();
 if (ancho === 2 * nw && alto === 2 * nh) return mitad(src, ancho, nw, nh);
 const cx = coeficientes(ancho, nw, true), cy = coeficientes(alto, nh, false);
 // Pasada horizontal por fila de origen (con caché de las dos filas en uso).
 const filas = new Map();
 const fila = y => {
  let f = filas.get(y);
  if (!f) {
   f = new Int32Array(nw);
   const o = y * ancho;
   for (let x = 0; x < nw; x++) {
    const s = cx.idx[x];
    f[x] = src[o + s] * cx.w0[x] + (cx.w1[x] ? src[o + s + 1] * cx.w1[x] : 0);
   }
   filas.set(y, f);
   if (filas.size > 4) filas.delete(filas.keys().next().value);
  }
  return f;
 };
 const dst = new Uint8Array(nw * nh);
 for (let y = 0; y < nh; y++) {
  const s = cy.idx[y], b0 = cy.w0[y], b1 = cy.w1[y];
  const S0 = fila(Math.min(Math.max(s, 0), alto - 1)), S1 = fila(Math.min(Math.max(s + 1, 0), alto - 1));
  const o = y * nw;
  for (let x = 0; x < nw; x++) {
   // Rama vectorial de OpenCV (VResizeLinearVec_32s8u): (mulhi + mulhi + 2) >> 2
   const v = (((S0[x] >> 4) * b0) >> 16) + (((S1[x] >> 4) * b1) >> 16) + 2 >> 2;
   dst[o + x] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
 }
 return dst;
}

// Letterbox de Ultralytics (cuadrado, centrado, relleno 114) -> tensor float32
// [1,3,lado,lado] con valores / 255, gris replicado en los 3 canales.
export function letterbox(gris, ancho, alto, lado = 640) {
 const r = Math.min(lado / alto, lado / ancho);
 const nw = Math.max(redondearPar(ancho * r), 1), nh = Math.max(redondearPar(alto * r), 1);
 const img = redimensionar(gris, ancho, alto, nw, nh);
 const padX = redondearPar((lado - nw) / 2 - 0.1), padY = redondearPar((lado - nh) / 2 - 0.1);
 const plano = lado * lado, tensor = new Float32Array(3 * plano).fill(PAD_LETTERBOX / 255);
 for (let y = 0; y < nh; y++) {
  const o = (y + padY) * lado + padX, s = y * nw;
  for (let x = 0; x < nw; x++) tensor[o + x] = img[s + x] / 255;
 }
 tensor.copyWithin(plano, 0, plano);
 tensor.copyWithin(2 * plano, 0, plano);
 return { tensor, lado, nw, nh, padX, padY };
}

// Recorte [x1,y1,x2,y2) (enteros) de una imagen gris.
export function recortar(gris, ancho, [x1, y1, x2, y2]) {
 const w = x2 - x1, h = y2 - y1, out = new Uint8Array(w * h);
 for (let y = 0; y < h; y++) out.set(gris.subarray((y1 + y) * ancho + x1, (y1 + y) * ancho + x2), y * w);
 return { gris: out, ancho: w, alto: h };
}

// Entrada del OCR: 128x64, uint8 NHWC con el gris replicado en 3 canales.
export function entradaOcr(gris, ancho, alto, w = 128, h = 64) {
 const r = redimensionar(gris, ancho, alto, w, h), out = new Uint8Array(w * h * 3);
 for (let i = 0, j = 0; i < r.length; i++, j += 3) out[j] = out[j + 1] = out[j + 2] = r[i];
 return out;
}

// Gris -> RGBA (para mostrar el recorte en un canvas).
export function rgbaDesdeGris(gris) {
 const out = new Uint8ClampedArray(gris.length * 4);
 for (let i = 0, j = 0; i < gris.length; i++, j += 4) { out[j] = out[j + 1] = out[j + 2] = gris[i]; out[j + 3] = 255; }
 return out;
}
