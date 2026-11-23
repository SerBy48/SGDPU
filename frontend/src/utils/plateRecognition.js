// Punto único de integración del reconocimiento de placas. Hoy delega en el
// lector que corre en el navegador (src/alpr: detector YOLO + OCR en ONNX
// Runtime Web); la imagen nunca sale del dispositivo. Si en el futuro se usa un
// servicio de lectura (alternativa B del plan), basta con cambiar esta función.
import { leerPlaca, precargarModelos, liberarModelos, lectorDisponible } from '../alpr/index.js';

export { precargarModelos, liberarModelos, lectorDisponible };

// recognizePlate(fotogramas: ImageData[], { tipoVehiculo }) -> resultado completo
//   { placa, formatoValido, confianza, confianzaPorCaracter, lecturaCruda, votos,
//     caja, confianzaDeteccion, recorte, versionModelos, ms, nivel, umbral }
// Compatibilidad: recognizePlate(blob) -> texto de la placa ('' si no hubo lectura).
export async function recognizePlate(entrada, opciones = {}) {
 if (typeof Blob !== 'undefined' && entrada instanceof Blob) {
  const bmp = await createImageBitmap(entrada);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const r = await leerPlaca([ctx.getImageData(0, 0, canvas.width, canvas.height)], opciones);
  return r.formatoValido ? r.placa : '';
 }
 return leerPlaca(entrada, opciones);
}
