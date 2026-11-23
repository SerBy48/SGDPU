// API del lector de placas para el hilo principal. Todo el trabajo pesado
// corre en un Web Worker (worker.js), que se crea al precargar y se cierra
// tras unos minutos sin uso para liberar memoria (importante en Safari iOS).
import { nivelConfianza } from './pipeline.js';

const INACTIVIDAD_MS = 3 * 60_000;
let worker = null, seq = 0, carga = null, temporizador = null;
const pendientes = new Map();

function rechazarTodo(error) {
 for (const p of pendientes.values()) p.reject(error);
 pendientes.clear();
}

function obtenerWorker() {
 if (!worker) {
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
   const p = pendientes.get(data.id);
   if (!p) return;
   pendientes.delete(data.id);
   if (data.ok) p.resolve(data.info ?? data.resultado);
   else p.reject(new Error(data.error));
  };
  worker.onerror = e => {
   e.preventDefault?.();
   rechazarTodo(new Error(e.message || 'Falló el lector de placas'));
   liberarModelos();
  };
 }
 return worker;
}

function llamar(mensaje, transferir = []) {
 return new Promise((resolve, reject) => {
  const id = ++seq;
  pendientes.set(id, { resolve, reject });
  obtenerWorker().postMessage({ ...mensaje, id }, transferir);
 });
}

function programarLiberacion() {
 clearTimeout(temporizador);
 temporizador = setTimeout(liberarModelos, INACTIVIDAD_MS);
}

export function lectorDisponible() {
 return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined';
}

// Descarga los modelos y crea las sesiones (una sola vez mientras el Worker
// siga vivo). Devuelve { version, ui: { umbral_verde, votos_minimos } }.
export function precargarModelos() {
 if (!lectorDisponible()) return Promise.reject(new Error('El navegador no soporta el lector de placas'));
 programarLiberacion();
 carga ??= llamar({ tipo: 'cargar', base: `${import.meta.env.BASE_URL}models/` }).catch(e => { carga = null; throw e; });
 return carga;
}

// fotogramas: ImageData[] (o {width, height, data}) de la misma escena.
// Los buffers se transfieren al Worker: quedan inutilizables en quien llama.
export async function leerPlaca(fotogramas, { tipoVehiculo = null } = {}) {
 const info = await precargarModelos();
 const datos = fotogramas.map(f => ({ ancho: f.width, alto: f.height, datos: f.data.buffer }));
 const r = await llamar({ tipo: 'leer', fotogramas: datos, tipoVehiculo }, datos.map(d => d.datos));
 programarLiberacion();
 const umbral = info.ui.umbral_verde ?? 0.9;
 return {
  ...r,
  umbral,
  nivel: nivelConfianza(r, { umbral, votosMinimos: info.ui.votos_minimos ?? 2 }),
 };
}

export function liberarModelos() {
 clearTimeout(temporizador);
 if (worker) worker.terminate();
 worker = null;
 carga = null;
 rechazarTodo(new Error('Lector de placas cerrado'));
}
