import 'ant-design-vue/dist/reset.css';
import './components/base/theme/base-tokens.css';

import Antd from 'ant-design-vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { installAntDesignVue } from './boot/ant-design-vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installAntDesignVue(app);
app.use(Antd);

app.mount('#app');
