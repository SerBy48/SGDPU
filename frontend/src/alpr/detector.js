// Postprocesado del detector YOLO11n exportado a ONNX (sin NMS interno).
// Salida output0: [1, 5, N] con (cx, cy, w, h, score) en píxeles del letterbox.
// Replica ultralytics (filtro score > conf, NMS IoU 0,7, scale_boxes) y la
// aritmética float32 de lector_onnx.py, para obtener las mismas cajas.

export const CONF_DET = 0.25;
export const IOU_NMS = 0.7;
const MAX_DET = 300;
const f32 = Math.fround;

function iou(a, b) {
 const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
 const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
 if (w <= 0 || h <= 0) return 0;
 const inter = w * h;
 return inter / Math.max((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter, 1e-9);
}

// NMS voraz de una sola clase. candidatos: [{caja:[x1,y1,x2,y2], score}].
export function nms(candidatos, umbral = IOU_NMS) {
 const orden = candidatos.map((c, i) => i).sort((i, j) => candidatos[j].score - candidatos[i].score || i - j);
 const keep = [];
 const descartado = new Uint8Array(candidatos.length);
 for (const i of orden) {
  if (descartado[i]) continue;
  keep.push(candidatos[i]);
  if (keep.length >= MAX_DET) break;
  for (const j of orden) if (!descartado[j] && j !== i && iou(candidatos[i].caja, candidatos[j].caja) > umbral) descartado[j] = 1;
 }
 return keep;
}

// salida: Float32Array [5*N]; lb: resultado de imagen.letterbox; ancho/alto del
// fotograma original. Devuelve [{caja:[x1,y1,x2,y2] (float, píxeles), score}],
// mejor primero.
export function decodificarDetector(salida, lb, ancho, alto, conf = CONF_DET) {
 const N = salida.length / 5, candidatos = [];
 for (let i = 0; i < N; i++) {
  const s = salida[4 * N + i];
  if (!(s > conf)) continue;
  const cx = salida[i], cy = salida[N + i], mw = f32(salida[2 * N + i] / 2), mh = f32(salida[3 * N + i] / 2);
  candidatos.push({ caja: [f32(cx - mw), f32(cy - mh), f32(cx + mw), f32(cy + mh)], score: s });
 }
 // Desescalado como ultralytics.utils.ops.scale_boxes (+ recorte a la imagen).
 const gx = f32(lb.nw / ancho), gy = f32(lb.nh / alto);
 const lim = (v, max) => Math.min(Math.max(v, 0), max);
 return nms(candidatos).map(({ caja: [x1, y1, x2, y2], score }) => ({
  caja: [
   lim(f32(f32(x1 - lb.padX) / gx), ancho), lim(f32(f32(y1 - lb.padY) / gy), alto),
   lim(f32(f32(x2 - lb.padX) / gx), ancho), lim(f32(f32(y2 - lb.padY) / gy), alto),
  ],
  score,
 }));
}

// Caja del detector -> recorte entero con margen (igual que lector.py), o null
// si queda demasiado pequeño.
export function cajaConMargen([x1, y1, x2, y2], ancho, alto, margen = 0.10) {
 const mx = (x2 - x1) * margen, my = (y2 - y1) * margen;
 const X1 = Math.trunc(Math.max(0, x1 - mx)), Y1 = Math.trunc(Math.max(0, y1 - my));
 const X2 = Math.trunc(Math.min(ancho, x2 + mx)), Y2 = Math.trunc(Math.min(alto, y2 + my));
 if (X2 - X1 < 8 || Y2 - Y1 < 4) return null;
 return [X1, Y1, X2, Y2];
}
