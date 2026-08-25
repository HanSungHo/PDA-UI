import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import App from 'src/App.vue';
import routes from 'src/router/routes';

describe('application smoke flow', () => {
  it('renders the home route and the not-found route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [router] },
    });

    try {
      await flushPromises();

      expect(wrapper.text()).toContain('Quasar App');
      expect(wrapper.get('img').attributes('alt')).toBe('Quasar logo');

      await router.push('/missing-page');
      await flushPromises();

      expect(wrapper.text()).toContain('404');
      expect(wrapper.text()).toContain('Oops. Nothing here...');
    } finally {
      wrapper.unmount();
    }
  });
});
