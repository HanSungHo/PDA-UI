import 'ant-design-vue/dist/reset.css';

import Antd, { type ConfigProviderProps } from 'ant-design-vue';
import type { App } from 'vue';

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

export function installAntDesignVue(app: App): void {
  app.use(Antd);
}
