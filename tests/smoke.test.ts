import { flushPromises, mount } from '@vue/test-utils';
import App from 'src/App.vue';
import routes from 'src/router/routes';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

const AntContainer = { template: '<div><slot /></div>' };

const antStubs = {
  AButton: { template: '<button><slot /></button>' },
  ACol: AntContainer,
  ALayout: AntContainer,
  ALayoutContent: AntContainer,
  ALayoutFooter: AntContainer,
  ALayoutHeader: AntContainer,
  ALayoutSider: AntContainer,
  AMenu: AntContainer,
  AMenuItem: AntContainer,
  AMenuItemGroup: AntContainer,
  AResult: {
    props: ['subTitle', 'title'],
    template: '<div>{{ title }}{{ subTitle }}<slot name="extra" /></div>',
  },
  ARow: AntContainer,
  ASpace: AntContainer,
};

describe('application smoke flow', () => {
  it('renders the Ant Design Vue home route and the not-found route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: { plugins: [router], stubs: antStubs },
    });

    try {
      await nextTick();

      expect(wrapper.text()).toContain('ATOP26-SMART');
      expect(wrapper.text()).toContain('Welcome to ATOP26-SMART');
      expect(wrapper.text()).toContain('Powered by Ant Design Vue + Vite');

      await router.push('/missing-page');
      await nextTick();

      expect(wrapper.text()).toContain('404');
      expect(wrapper.text()).toContain('Oops. Nothing here...');

      const homeButton = wrapper
        .findAll('button')
        .find((button) => button.text().trim() === 'Go Home');
      if (homeButton === undefined) {
        throw new Error('Not-found home navigation button was not rendered');
      }

      await homeButton.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.fullPath).toBe('/');
      expect(wrapper.text()).toContain('Welcome to ATOP26-SMART');
    } finally {
      wrapper.unmount();
    }
  });
});
