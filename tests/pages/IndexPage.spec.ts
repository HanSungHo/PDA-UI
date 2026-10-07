import { flushPromises, mount } from '@vue/test-utils';
import App from 'src/App.vue';
import IndexPage from 'src/pages/IndexPage.vue';
import SecondPage from 'src/pages/SecondPage.vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('IndexPage', () => {
  it('renders the Quasar gallery and switches between routed pages', async () => {
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
      expect(wrapper.get('h1').text()).toBe('Quasar component gallery');
      expect(wrapper.text()).toContain('Buttons & indicators');
      expect(wrapper.text()).toContain('Form controls');
      expect(wrapper.text()).toContain('Tables & pagination');

      await router.push('/second');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/second');
      expect(wrapper.text()).toContain('Second Page');
      expect(wrapper.text()).toContain('Go to Index Page');

      await wrapper.get('button').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/');
      expect(wrapper.get('h1').text()).toBe('Quasar component gallery');
    } finally {
      wrapper.unmount();
    }
  });
});
