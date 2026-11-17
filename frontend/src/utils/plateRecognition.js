// Punto único de integración futura de OCR de placas (Tesseract.js, API en la
// nube, o un servicio ALPR especializado). Hoy no reconoce nada: el portero
// siempre puede escribir/corregir la placa manualmente en PlateCapture.
export async function recognizePlate(_imageBlob) {
 return '';
}
