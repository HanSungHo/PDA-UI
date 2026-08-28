import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_API_BASE_URL', 'https://api.test.local');

const { default: ExamplePage } = await import('src/features/example/pages/ExamplePage.vue');

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('ExamplePage', () => {
  it('renders the feature summary and toggles the shared app readiness state', async () => {
    const wrapper = mount(ExamplePage, {
      global: {
        plugins: [createPinia()],
      },
    });

    try {
      expect(wrapper.text()).toContain('Feature Based Module');
      expect(wrapper.text()).toContain('This module exposes 0 placeholder item.');
      expect(wrapper.text()).toContain('App is not ready');

      const toggleButton = wrapper.get('button');
      expect(toggleButton.text()).toBe('Mark ready');

      await toggleButton.trigger('click');

      expect(wrapper.text()).toContain('App is ready');
      expect(toggleButton.text()).toBe('Mark not ready');
    } finally {
      wrapper.unmount();
    }
  });
});
