// Pipeline completo del lector de placas, independiente del runtime:
//   motor = { detectar(Float32Array [1,3,640,640]) -> Float32Array [5*8400],
//             leer(Uint8Array [n,64,128,3], n)      -> Float32Array [n*10*37] }
// Lo crea motor.js con ONNX Runtime (Web Worker en el navegador, Node en pruebas).
import { letterbox, recortar, entradaOcr } from './imagen.js';
import { decodificarDetector, cajaConMargen } from './detector.js';
import { decodificarOcr } from './ocr.js';
import { votar } from './votacion.js';

const r3 = x => Math.round(x * 1000) / 1000;
const ordenLector = (a, b) => (b.formatoValido - a.formatoValido) || (b.confianzaDeteccion - a.confianzaDeteccion);

function lotesOcr(recortes) {
 const n = recortes.length, uno = 64 * 128 * 3, datos = new Uint8Array(n * uno);
 recortes.forEach((r, k) => datos.set(entradaOcr(r.gris, r.ancho, r.alto), k * uno));
 return datos;
}

// Una imagen gris -> todas las placas detectadas, mejor primero (igual que
// LectorOnnx.leer_gris de Python). Se usa para la paridad y como primer paso
// de leerFotogramas.
export async function leerImagen(motor, gris, ancho, alto, tipo = null) {
 const lb = letterbox(gris, ancho, alto);
 const detecciones = decodificarDetector(await motor.detectar(lb.tensor), lb, ancho, alto);
 const candidatos = [];
 for (const d of detecciones) {
  const caja = cajaConMargen(d.caja, ancho, alto);
  if (caja) candidatos.push({ caja, cajaDetector: d.caja, confianzaDeteccion: d.score, recorte: recortar(gris, ancho, caja) });
 }
 if (!candidatos.length) return [];
 const salida = await motor.leer(lotesOcr(candidatos.map(c => c.recorte)), candidatos.length);
 return candidatos
  .map((c, k) => ({ ...decodificarOcr(salida, k, tipo), caja: c.caja, cajaDetector: c.cajaDetector, confianzaDeteccion: c.confianzaDeteccion, recorte: c.recorte }))
  .sort(ordenLector);
}

// Varios fotogramas de la misma escena (p. ej. 3 tomados con ~120 ms entre sí):
// el detector corre solo sobre el primero; la caja elegida se recorta en todos
// y el OCR de cada recorte se combina por votación.
// fotogramas: [{ gris, ancho, alto }], todos del mismo tamaño.
export async function leerFotogramas(motor, fotogramas, { tipoVehiculo = null } = {}) {
 const t0 = Date.now();
 const [primero, ...resto] = fotogramas;
 const lecturas = await leerImagen(motor, primero.gris, primero.ancho, primero.alto, tipoVehiculo);
 if (!lecturas.length) return { placa: '', formatoValido: false, confianza: 0, confianzaPorCaracter: [], lecturaCruda: '', votos: 0, caja: null, confianzaDeteccion: 0, recorte: null, ms: Date.now() - t0 };
 const elegida = lecturas[0];
 let porFotograma = [elegida];
 if (resto.length) {
  const recortes = resto.map(f => recortar(f.gris, f.ancho, elegida.caja));
  const salida = await motor.leer(lotesOcr(recortes), recortes.length);
  porFotograma = porFotograma.concat(recortes.map((_, k) => decodificarOcr(salida, k, tipoVehiculo)));
 }
 const v = votar(porFotograma);
 return {
  placa: v.placa,
  formatoValido: v.formatoValido,
  confianza: r3(v.confianza),
  confianzaPorCaracter: v.confianzaPorCaracter.map(r3),
  lecturaCruda: v.lecturaCruda,
  votos: v.votos,
  fotogramas: fotogramas.length,
  lecturas: porFotograma.map(l => l.placa),
  caja: elegida.caja,
  confianzaDeteccion: r3(elegida.confianzaDeteccion),
  recorte: elegida.recorte,
  ms: Date.now() - t0,
 };
}

// Regla de color de la UI (plan §5.7).
export function nivelConfianza(r, { umbral = 0.9, votosMinimos = 2 } = {}) {
 if (!r || !r.placa || !r.formatoValido) return 'rojo';
 const votosOk = (r.fotogramas || 1) < 2 || r.votos >= Math.min(votosMinimos, r.fotogramas);
 return r.confianza >= umbral && votosOk ? 'verde' : 'ambar';
}
