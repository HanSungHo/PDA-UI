import { fileURLToPath } from 'node:url';

import { defineConfig } from '#q-app';

function fromRoot(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

const apiProxyTarget =
  process.env.VITE_API_PROXY || process.env.VITE_API_BASE || process.env.VITE_API_BASE_URL;

export default defineConfig(() => ({
  css: ['app.css', 'overrides/input.scss'],
  extras: ['material-symbols-outlined'],
  framework: {
    iconSet: 'material-symbols-outlined',
    config: {},
    plugins: ['Dialog', 'Notify'],
  },
  animations: [],
  devServer: {
    port: 5173,
    open: true,
    proxy: apiProxyTarget
      ? {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined,
  },
  build: {
    distDir: 'dist',
    publicPath: '/',
    vueRouterMode: 'hash',
    sourcemap: false,
    alias: {
      '~': fromRoot('./src'),
      '@': fromRoot('./src'),
      src: fromRoot('./src'),
      components: fromRoot('./src/components'),
      assets: fromRoot('./src/assets'),
    },
    extendViteConf(config) {
      config.optimizeDeps = {
        ...config.optimizeDeps,
        exclude: [
          ...(config.optimizeDeps?.exclude ?? []),
          '@revolist/vue3-datagrid',
          '@revolist/revogrid',
        ],
      };
    },
  },
}));
