import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:movil`: HTTPS con certificado autofirmado y accesible desde la
// red local, para probar la cámara en un celular (getUserMedia solo funciona en
// contextos seguros). En ese modo la API se usa por el mismo origen (/api), y
// el proxy la reenvía al backend en :4000, para evitar contenido mixto.
// `npm run build:nginx`: compilación de producción con la API en el mismo
// origen (/api), para servirla detrás de deploy/nginx/sgdpu.conf.
const MISMO_ORIGEN = ['movil', 'nginx'];
export default defineConfig(({ mode }) => ({
 plugins: [react(), ...(mode === 'movil' ? [basicSsl()] : [])],
 define: MISMO_ORIGEN.includes(mode) ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') } : {},
 server: {
  port: 5173,
  proxy: {
   '/api': 'http://localhost:4000',
   '/socket.io': { target: 'http://localhost:4000', ws: true },
  },
 },
 // onnxruntime-web trae su propio .wasm; el pre-empaquetado de Vite lo rompe.
 optimizeDeps: { exclude: ['onnxruntime-web'] },
 worker: { format: 'es' },
 test: { include: ['src/**/*.test.js'] },
}));
