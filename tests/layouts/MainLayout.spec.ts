import { flushPromises, mount } from '@vue/test-utils';
import MainLayout from 'src/layouts/MainLayout.vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('MainLayout', () => {
  it('renders the active page and collapses the navigation sider', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Active page</div>' } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(MainLayout, {
      global: { plugins: [router] },
    });
    try {
      await flushPromises();

      expect(wrapper.text()).toContain('Active page');
      expect(wrapper.text()).toContain('ATOP26-SMART');
      expect(wrapper.get('.ant-layout-sider').classes()).not.toContain(
        'ant-layout-sider-collapsed',
      );

      const menuButton = wrapper.get('header button');
      await menuButton.trigger('click');

      expect(wrapper.get('.ant-layout-sider').classes()).toContain('ant-layout-sider-collapsed');
    } finally {
      wrapper.unmount();
    }
  });
});
