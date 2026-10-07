import { defineStore } from '@quasar/app-vite';
import { createPinia } from 'pinia';

export { useAppStore } from './app.store';

export default defineStore(() => createPinia());
