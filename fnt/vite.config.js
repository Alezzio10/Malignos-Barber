import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, /api se redirige a la API (bck) para evitar problemas de CORS.
export default defineConfig({
  plugins: [react()],
  // Se pre-empaquetan al arrancar para que el panel (carga diferida) no fuerce una recarga la primera vez.
  optimizeDeps: {
    include: [
      '@base-ui/react/dialog',
      '@base-ui/react/switch',
      '@base-ui/react/tabs',
      '@number-flow/react',
      'recharts',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
