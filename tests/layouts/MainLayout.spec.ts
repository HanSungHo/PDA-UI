import { flushPromises, mount } from '@vue/test-utils';
import { QBtn, QDrawer } from 'quasar';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';

import MainLayout from 'layouts/MainLayout.vue';

describe('MainLayout', () => {
  it('renders the active page and toggles the navigation drawer', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Active page</div>' } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(MainLayout, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Active page');
    expect(wrapper.getComponent(QDrawer).props('modelValue')).toBe(false);

    const menuButton = wrapper
      .findAllComponents(QBtn)
      .find((button) => button.attributes('aria-label') === 'Menu');
    if (menuButton === undefined) {
      throw new Error('Menu button was not rendered');
    }

    vi.useFakeTimers();
    try {
      await menuButton.trigger('click');

      expect(wrapper.getComponent(QDrawer).props('modelValue')).toBe(true);
      await vi.runAllTimersAsync();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      try {
        await vi.runAllTimersAsync();
      } finally {
        try {
          wrapper.unmount();
        } finally {
          vi.useRealTimers();
        }
      }
    }
  });
});
