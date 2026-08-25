import { flushPromises, mount } from '@vue/test-utils';
import { QBtn } from 'quasar';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import IndexPage from 'pages/IndexPage.vue';
import SecondPage from 'pages/SecondPage.vue';
import App from 'src/App.vue';

describe('IndexPage', () => {
  it('renders the home content and navigates to the rendered second page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: IndexPage },
        { path: '/second', component: SecondPage },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [router] },
    });

    try {
      expect(wrapper.get('img').attributes('alt')).toBe('Quasar logo');
      const navigationButton = wrapper.getComponent(QBtn);
      expect(navigationButton.text()).toBe('Go to Second Page');

      await navigationButton.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/second');
      expect(wrapper.text()).toContain('Go to Index Page');
    } finally {
      wrapper.unmount();
    }
  });
});
