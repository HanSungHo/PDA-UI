import 'ant-design-vue/dist/reset.css';

import { defineBoot } from '@quasar/app-vite';
import Antd, { type ConfigProviderProps } from 'ant-design-vue';

export type AntDesignTheme = NonNullable<ConfigProviderProps['theme']>;

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function createAntDesignTheme(): AntDesignTheme {
  return {
    token: {
      colorPrimary: readCssVar('--background-background-brand'),
      colorPrimaryHover: readCssVar('--text-text-selected'),
      colorError: readCssVar('--text-text-error'),
      colorSuccess: readCssVar('--text-text-success'),
      colorWarning: readCssVar('--text-text-warning'),
      colorText: readCssVar('--text-text-primary'),
    },
  };
}

export default defineBoot(({ app }) => {
  app.use(Antd);
});
