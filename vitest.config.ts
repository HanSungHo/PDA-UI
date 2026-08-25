import { fileURLToPath, URL } from 'node:url';

import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

function fromRoot(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    quasar(),
  ],
  resolve: {
    alias: {
      app: fromRoot('./'),
      assets: fromRoot('./src/assets'),
      '~assets': fromRoot('./src/assets'),
      boot: fromRoot('./src/boot'),
      components: fromRoot('./src/components'),
      layouts: fromRoot('./src/layouts'),
      pages: fromRoot('./src/pages'),
      src: fromRoot('./src'),
      stores: fromRoot('./src/stores'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.{test,spec}.ts'],
    pool: 'threads',
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.{ts,tsx}'],
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov', 'cobertura'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
