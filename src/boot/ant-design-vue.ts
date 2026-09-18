import 'ant-design-vue/dist/reset.css';
import '../components/base/theme/base-tokens.css';

import Antd from 'ant-design-vue';
import type { App } from 'vue';

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function installAntDesignVue(app: App): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(Antd as any, {
    theme: {
      token: {
        colorPrimary: readCssVar('--ds-color-primary'),
        colorError: readCssVar('--ds-color-error'),
        colorSuccess: readCssVar('--ds-color-success'),
        colorWarning: readCssVar('--ds-color-warning'),
        borderRadius: parseInt(readCssVar('--ds-radius-md'), 10),
      },
    },
  });
}
