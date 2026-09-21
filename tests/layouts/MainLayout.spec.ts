import { flushPromises, mount } from '@vue/test-utils';
import MainLayout from 'src/layouts/MainLayout.vue';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('MainLayout', () => {
  it('renders the active page without the starter navigation shell', async () => {
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
      expect(wrapper.text()).not.toContain('ATOP26-SMART');
      expect(wrapper.find('.ant-layout-sider').exists()).toBe(false);
      expect(wrapper.find('.ant-layout-header').exists()).toBe(false);
      expect(wrapper.find('.ant-layout-footer').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
