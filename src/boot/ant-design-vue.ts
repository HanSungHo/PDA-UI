import Antd from 'ant-design-vue';
import type { App } from 'vue';

export function setupAntDesignVue(app: App) {
  app.use(Antd);
}
