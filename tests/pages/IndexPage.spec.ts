import { flushPromises, mount } from '@vue/test-utils';
import App from 'src/App.vue';
import IndexPage from 'src/pages/IndexPage.vue';
import SecondPage from 'src/pages/SecondPage.vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('IndexPage', () => {
  it('renders the home content and navigates to the rendered second page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: IndexPage },
        { path: '/second', component: SecondPage },
        { path: '/example', component: { template: '<div>Example route</div>' } },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [router] },
    });

    try {
      expect(wrapper.get('h1').text()).toBe('Welcome to ATOP26-SMART');
      expect(wrapper.text()).toContain('Powered by Ant Design Vue + Vite');
      const navigationButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Go to Second Page');
      if (navigationButton === undefined) {
        throw new Error('Second-page navigation button was not rendered');
      }

      await navigationButton.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/second');
      expect(wrapper.text()).toContain('Go to Index Page');

      await wrapper.get('button').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/');

      const exampleButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'View Example Feature');
      if (exampleButton === undefined) {
        throw new Error('Example navigation button was not rendered');
      }

      await exampleButton.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/example');
      expect(wrapper.text()).toContain('Example route');
    } finally {
      wrapper.unmount();
    }
  });
});
