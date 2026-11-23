// Genera <archivo>.gz junto a los archivos comprimibles de dist/ para que
// nginx los sirva ya comprimidos (gzip_static on) en vez de comprimirlos en
// cada petición. Sobre todo importa el motor WASM del lector (~15 MB -> ~3,8 MB):
// comprimirlo al vuelo tardaba segundos por descarga.
// Uso: node scripts/precomprimir.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const raiz = path.resolve(process.argv[2] || 'dist');
const EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.wasm']);
let n = 0, antes = 0, despues = 0;

function recorrer(dir) {
 for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) { recorrer(p); continue; }
  if (!EXT.has(path.extname(e.name)) || fs.statSync(p).size < 1024) continue;
  const datos = fs.readFileSync(p);
  const gz = zlib.gzipSync(datos, { level: 9 });
  if (gz.length >= datos.length * 0.9) continue; // no vale la pena
  fs.writeFileSync(`${p}.gz`, gz);
  n++; antes += datos.length; despues += gz.length;
 }
}

recorrer(raiz);
console.log(`precomprimir: ${n} archivos, ${(antes / 1e6).toFixed(1)} MB -> ${(despues / 1e6).toFixed(1)} MB (.gz)`);
