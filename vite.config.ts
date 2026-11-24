import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {redesVisible} from './src/modulos/marketing/marketing-v2/datos/bandera.js';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Canales de marketing: Redes sociales muestra «Próximamente» en Vercel Production (MKT_REDES_VISIBLE la fuerza).
    define: {
      __MKT_REDES_VISIBLE__: JSON.stringify(redesVisible(process.env)),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
