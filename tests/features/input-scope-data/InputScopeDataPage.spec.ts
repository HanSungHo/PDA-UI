import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAllScopeMocks } from '~/features/input-scope-data/mocks/input-scope-data.mock';
import InputScopeDataPage from '~/features/input-scope-data/pages/InputScopeDataPage.vue';

enableAutoUnmount(afterEach);

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: { lotId: 'PAGE_LOT_01' },
    params: {},
  }),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('InputScopeDataPage.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    resetAllScopeMocks();
    vi.clearAllMocks();
  });

  it('renders page and forwards initialLotId from route query', async () => {
    const wrapper = mount(InputScopeDataPage);
    await flushPromises();

    expect(wrapper.exists()).toBe(true);
    const lotInput = wrapper.find<HTMLInputElement>('#isd_lot_id');
    expect(lotInput.element.value).toBe('PAGE_LOT_01');
  });

  it('handles cancel navigation', async () => {
    const wrapper = mount(InputScopeDataPage);
    await flushPromises();

    const cancelBtn = wrapper.find('.isd__btn--tertiary');
    await cancelBtn.trigger('click');

    expect(mockBack.mock.calls.length + mockPush.mock.calls.length).toBeGreaterThan(0);
  });
});
