// Prueba automática de degradación del lector de placas (plan §9, fase F5).
// Levanta Vite (con un middleware que simula fallas) y un Chrome sin interfaz
// por escenario, abre el banco de pruebas (pruebas/lector.html) y verifica que
// en cada falla se muestre el aviso correcto y la placa se pueda escribir a mano.
//
// Uso:  npm run prueba:degradacion [-- --foto <imagen.jpg>] [--chrome <ruta>]
//   --foto    foto de un vehículo para la cámara simulada (sin ella, Chrome usa
//             su patrón de prueba y solo se verifica el flujo, no la lectura)
//   --chrome  ruta de Chrome/Chromium (por defecto se busca la instalación usual;
//             también se puede definir la variable CHROME)
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 5180;
const HOST_INSEGURO = 'sgdpu-prueba.test';
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const FOTO = arg('foto');
const CHROME = arg('chrome') || process.env.CHROME || [
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => fs.existsSync(p));
if (!CHROME) { console.error('No se encontró Chrome; use --chrome <ruta> o la variable CHROME.'); process.exit(2); }
if (FOTO && !fs.existsSync(FOTO)) { console.error(`No existe la foto ${FOTO}`); process.exit(2); }

// --- Vite con fallas simuladas en la descarga del detector -------------------
let falla = null; // null | 'corrupto' | 'lento'
const simulador = {
 name: 'simular-fallas',
 configureServer(s) {
  s.middlewares.use((req, res, next) => {
   if (!/\/models\/detector\.[^/]+\.onnx/.test(req.url)) return next();
   if (falla === 'corrupto') { res.setHeader('Content-Type', 'application/octet-stream'); return res.end(crypto.randomBytes(64 * 1024)); }
   if (falla === 'lento') { const t = setTimeout(next, 60_000); return req.on('close', () => clearTimeout(t)); }
   next();
  });
 },
};
const vite = await createServer({
 root: FRONTEND, configFile: path.join(FRONTEND, 'vite.config.js'), logLevel: 'error',
 server: { host: '127.0.0.1', port: PUERTO, strictPort: true, allowedHosts: [HOST_INSEGURO] }, plugins: [simulador],
});
await vite.listen();

// --- Chrome + protocolo DevTools ---------------------------------------------
const esperar = ms => new Promise(r => setTimeout(r, ms));
let puertoCdp = 9420;

async function conChrome(flags, fn) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgdpu-chrome-'));
 const puerto = puertoCdp++;
 const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${dir}`,
  '--no-first-run', '--no-default-browser-check', ...flags, 'about:blank'], { stdio: 'ignore' });
 try {
  let objetivo;
  for (let i = 0; i < 60 && !objetivo; i++) {
   try { objetivo = (await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json()).find(t => t.type === 'page'); }
   catch { await esperar(250); }
  }
  if (!objetivo) throw new Error('Chrome no respondió');
  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluar = async expr => {
   const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 120_000 });
   if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
   return r.result?.result?.value;
  };
  const abrir = async url => {
   await cdp('Page.enable'); await cdp('Page.navigate', { url });
   for (let i = 0; i < 80; i++) { if (await evaluar("!!document.getElementById('placa-input')").catch(() => false)) return; await esperar(250); }
   throw new Error('La página no cargó');
  };
  try { return await fn({ cdp, evaluar, abrir }); } finally { ws.close(); }
 } finally {
  proc.kill();
  await esperar(500);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* Chrome puede tardar en soltar archivos */ }
 }
}

// Utilidades que se inyectan en la página.
const EN_PAGINA = `
 window.__esperar = (f, ms = 60000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { let v; try { v = f(); } catch {} if (v) { clearInterval(i); res(v); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('tiempo agotado: ' + f)); } }, 100); });
 window.__boton = t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t));
 window.__lector = () => document.getElementById('placa-lector')?.textContent || '';
 window.__escribir = v => { const i = document.getElementById('placa-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); return new Promise(r => setTimeout(() => r(i.value), 100)); };
 true`;
const ESCRITURA_MANUAL = `window.__escribir('abc-123')`; // debe quedar ABC123

// 127.0.0.1 cuenta como contexto seguro (igual que localhost).
const URL_LOCAL = `http://127.0.0.1:${PUERTO}/pruebas/lector.html`;
const escenarios = [
 {
  nombre: 'Lectura con cámara' + (FOTO ? ' (foto)' : ' (patrón de prueba)'),
  flags: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
   ...(FOTO ? [`--use-file-for-fake-video-capture=${copiaMjpeg(FOTO)}`] : [])],
  async correr({ evaluar }) {
   const r = await evaluar(`(async () => {
    await __esperar(() => document.getElementById('carga-ms')?.textContent.endsWith('ms'), 90000);
    (await __esperar(() => __boton('Usar cámara'))).click();
    await __esperar(() => { const v = document.querySelector('video'); return v && v.videoWidth; });
    (await __esperar(() => { const b = __boton('Capturar'); return b && !b.disabled && b; })).click();
    await __esperar(() => document.querySelector('#placa-lector .chip') && !__lector().includes('Leyendo'), 90000);
    return { panel: __lector(), placa: document.getElementById('placa-input').value };
   })()`);
   const ok = FOTO ? /Confiable|Revisar/.test(r.panel) && r.placa.length === 6 : /Confiable|Revisar|Sin lectura/.test(r.panel);
   return { ok, detalle: `${r.placa || '(vacía)'} · ${r.panel.slice(0, 70)}` };
  },
 },
 {
  nombre: 'Cámara denegada',
  flags: ['--use-fake-device-for-media-stream'],
  async antes({ cdp }) { await cdp('Browser.setPermission', { permission: { name: 'videoCapture' }, setting: 'denied', origin: `http://127.0.0.1:${PUERTO}` }); },
  async correr({ evaluar }) {
   const aviso = await evaluar(`(async () => {
    (await __esperar(() => __boton('Usar cámara'), 90000)).click();
    return __esperar(() => __lector().includes('No fue posible acceder a la cámara') && __lector());
   })()`);
   return { ok: true, detalle: aviso.slice(0, 70) };
  },
 },
 {
  nombre: 'Sin HTTPS (origen inseguro)',
  flags: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--host-resolver-rules=MAP ${HOST_INSEGURO} 127.0.0.1`],
  url: `http://${HOST_INSEGURO}:${PUERTO}/pruebas/lector.html`,
  async correr({ evaluar }) {
   const r = await evaluar(`(async () => {
    (await __esperar(() => __boton('Usar cámara'), 90000)).click();
    await __esperar(() => __lector().includes('HTTPS'));
    return { seguro: isSecureContext, aviso: __lector() };
   })()`);
   return { ok: r.seguro === false, detalle: r.aviso.slice(0, 70) };
  },
 },
 {
  nombre: 'Modelo dañado',
  falla: 'corrupto',
  flags: [],
  async correr({ evaluar }) {
   const r = await evaluar(`(async () => {
    await __esperar(() => __lector().includes('no disponible'), 90000);
    return { aviso: __lector(), camara: !!__boton('Usar cámara'), error: document.querySelector('.alert-danger')?.textContent || '' };
   })()`);
   return { ok: !r.camara, detalle: `${r.aviso.slice(0, 50)} · ${r.error.slice(0, 40)}` };
  },
 },
 {
  nombre: 'Red lenta (modelos sin llegar)',
  falla: 'lento',
  flags: [],
  async correr({ evaluar }) {
   const r = await evaluar(`(async () => {
    await __esperar(() => __lector().includes('tardando'), 45000);
    return { aviso: __lector(), puedeCapturar: !!__boton('Capturar') };
   })()`);
   return { ok: true, detalle: r.aviso.slice(0, 70) };
  },
 },
 {
  nombre: 'Sin WebAssembly',
  flags: [],
  // Navegador sin WebAssembly: se elimina antes de cargar la página.
  async antes({ cdp }) { await cdp('Page.enable'); await cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'delete globalThis.WebAssembly;' }); },
  async correr({ evaluar }) {
   const r = await evaluar(`(async () => {
    await __esperar(() => __lector().includes('no disponible'), 20000);
    return { aviso: __lector(), camara: !!__boton('Usar cámara') };
   })()`);
   return { ok: !r.camara, detalle: r.aviso.slice(0, 70) };
  },
 },
];

function copiaMjpeg(foto) {
 // Chrome acepta un JPEG como video simulado si la extensión es .mjpeg.
 const destino = path.join(os.tmpdir(), `sgdpu-camara-${process.pid}.mjpeg`);
 fs.copyFileSync(foto, destino);
 return destino;
}

// --- Ejecutar ----------------------------------------------------------------
const resultados = [];
for (const e of escenarios) {
 falla = e.falla || null;
 const t0 = Date.now();
 try {
  const r = await conChrome(e.flags, async ctx => {
   try {
    await e.antes?.(ctx);
    await ctx.abrir(e.url || URL_LOCAL);
    await ctx.evaluar(EN_PAGINA);
    const res = await e.correr(ctx);
    const manual = await ctx.evaluar(ESCRITURA_MANUAL);
    return { ...res, ok: res.ok && manual === 'ABC123', manual };
   } catch (err) {
    // Diagnóstico: qué mostraba la página al fallar.
    const estado = await ctx.evaluar(`JSON.stringify({url: location.href, seguro: isSecureContext, wasm: typeof WebAssembly, texto: (document.body?.innerText || '').slice(0, 160)})`).catch(x => String(x));
    throw new Error(`${err.message || err} | página: ${estado}`);
   }
  });
  resultados.push({ escenario: e.nombre, ok: r.ok, detalle: `${r.detalle} · manual: ${r.manual}`, s: Math.round((Date.now() - t0) / 1000) });
 } catch (err) {
  resultados.push({ escenario: e.nombre, ok: false, detalle: String(err.message || err).slice(0, 120), s: Math.round((Date.now() - t0) / 1000) });
 }
 const u = resultados.at(-1);
 console.log(`${u.ok ? 'OK   ' : 'FALLA'} ${u.escenario.padEnd(38)} ${String(u.s).padStart(3)} s  ${u.detalle}`);
}
await vite.close();
const fallas = resultados.filter(r => !r.ok).length;
console.log(fallas ? `\n${fallas} escenario(s) con falla.` : `\nTodos los escenarios (${resultados.length}) pasaron: la entrada manual funciona en cada caso.`);
process.exit(fallas ? 1 : 0);
