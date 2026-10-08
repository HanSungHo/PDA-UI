import './css/app.css';
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css';

import { createPinia } from 'pinia';
import * as AllQuasar from 'quasar';
import { Dialog, Notify, Quasar } from 'quasar';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Quasar, {
  plugins: {
    Dialog,
    Notify,
  },
  components: AllQuasar,
});

app.mount('#app');
