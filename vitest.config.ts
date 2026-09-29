import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

function fromRoot(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      assets: fromRoot('./src/assets'),
      '@': fromRoot('./src'),
      '~': fromRoot('./src'),
      components: fromRoot('./src/components'),
      src: fromRoot('./src'),
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
      exclude: [
        'src/**/*.d.ts',
        'src/features/een-add/types/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        '**/*.stories.ts',
        '**/*.story.vue',
      ],
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
