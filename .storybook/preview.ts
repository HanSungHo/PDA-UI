import 'ant-design-vue/dist/reset.css';
import '../src/css/app.css';
import '../src/components/base/theme/base-tokens.css';
import './preview.css';

import { type Preview, setup } from '@storybook/vue3-vite';
import Antd from 'ant-design-vue';

setup((app) => {
  app.use(Antd);
});

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
    },
    layout: 'centered',
  },
};

export default preview;
