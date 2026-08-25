import { defineStore } from '@quasar/app-vite/wrappers';
import { createPinia } from 'pinia';

export { useAppStore } from './app.store';

export default defineStore(() => {
  return createPinia();
});
