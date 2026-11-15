import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      // Dev-only proxy to the real backend (its CORS policy rejects localhost origins).
      // Use with VITE_API_BASE_URL=/agbea-api and `npx vite` (not applied in server.ts middleware mode).
      proxy: {
        '/agbea-api': {
          target: process.env.AGBEA_API_ORIGIN || 'https://agbea.api.pepit.cloud',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/agbea-api/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          },
        },
      },
    },
  };
});
