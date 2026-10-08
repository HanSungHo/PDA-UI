import { fileURLToPath, URL } from 'node:url';

import type { StorybookConfig } from '@storybook/vue3-vite';
import vue from '@vitejs/plugin-vue';

function fromStorybookRoot(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx|mdx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      docgen: false,
    },
  },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    return mergeConfig(config, {
      plugins: [vue()],
      resolve: {
        alias: {
          app: fromStorybookRoot('../'),
          assets: fromStorybookRoot('../src/assets'),
          components: fromStorybookRoot('../src/components'),
          src: fromStorybookRoot('../src'),
        },
      },
    });
  },
};

export default config;
