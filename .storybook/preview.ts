import 'ant-design-vue/dist/reset.css';
import 'quasar/dist/quasar.css';
import '../src/css/app.css';
import './preview.css';

import { type Preview, setup } from '@storybook/vue3-vite';
import Antd from 'ant-design-vue';
import { Quasar } from 'quasar';
import { createMemoryHistory, createRouter } from 'vue-router';

setup((app) => {
  app.use(Quasar);
  app.use(Antd);
  app.use(
    createRouter({
      history: createMemoryHistory(),
      routes: [],
    }),
  );
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
