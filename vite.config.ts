import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      src: fileURLToPath(new URL('./src', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      assets: fileURLToPath(new URL('./src/assets', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    // Proxy `/api` requests to backend during local development.
    // Override target by setting VITE_API_PROXY in your environment (e.g. .env.local)
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || process.env.VITE_API_BASE,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
