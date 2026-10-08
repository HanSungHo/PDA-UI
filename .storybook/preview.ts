import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css';
import 'quasar/dist/quasar.css';
import 'ant-design-vue/dist/reset.css';
import 'quasar/dist/quasar.css';
import '../src/css/app.css';
import './preview.css';

import { type Preview, setup } from '@storybook/vue3-vite';
import Antd from 'ant-design-vue';
import { Dialog, Notify, QCard, QDialog, QIcon, Quasar } from 'quasar';
import { createMemoryHistory, createRouter } from 'vue-router';

setup((app) => {
  app.use(Quasar, {
    plugins: { Dialog, Notify },
    components: { QCard, QDialog, QIcon },
  });
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
