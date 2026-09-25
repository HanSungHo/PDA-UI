import './css/app.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { installAntDesignVue } from './boot/ant-design-vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installAntDesignVue(app);

app.mount('#app');
