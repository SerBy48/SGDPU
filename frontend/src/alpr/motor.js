// Crea el "motor" del pipeline a partir de un módulo de ONNX Runtime (web o
// node) y los bytes de los dos modelos. No importa ONNX Runtime directamente:
// el Worker le pasa onnxruntime-web y las pruebas el de Node.
export async function crearMotor(ort, bytesDetector, bytesOcr, opciones = {}) {
 const so = { executionProviders: opciones.executionProviders || ['wasm'], graphOptimizationLevel: 'all' };
 const det = await ort.InferenceSession.create(bytesDetector, so);
 const ocr = await ort.InferenceSession.create(bytesOcr, so);
 const [eDet] = det.inputNames, [sDet] = det.outputNames;
 const [eOcr] = ocr.inputNames, [sOcr] = ocr.outputNames;
 return {
  async detectar(tensor) {
   const r = await det.run({ [eDet]: new ort.Tensor('float32', tensor, [1, 3, 640, 640]) });
   return r[sDet].data;
  },
  async leer(datos, n) {
   const r = await ocr.run({ [eOcr]: new ort.Tensor('uint8', datos, [n, 64, 128, 3]) });
   return r[sOcr].data;
  },
  async liberar() {
   await det.release?.();
   await ocr.release?.();
  },
 };
}
