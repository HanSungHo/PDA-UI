import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css';
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css';
import 'quasar/dist/quasar.css';
import '../src/css/app.css';
import './preview.css';

import { type Preview, setup } from '@storybook/vue3-vite';
import { Dialog, Notify, QCard, QDialog, QIcon, Quasar } from 'quasar';
import materialSymbolsOutlined from 'quasar/icon-set/material-symbols-outlined';
import { createMemoryHistory, createRouter } from 'vue-router';

setup((app) => {
  app.use(Quasar, {
    plugins: { Dialog, Notify },
    components: { QCard, QDialog, QIcon },
    iconSet: materialSymbolsOutlined,
  });
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
