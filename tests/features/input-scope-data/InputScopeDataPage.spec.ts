import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAllScopeMocks } from '~/features/input-scope-data/mocks/input-scope-data.mock';
import InputScopeDataPage from '~/features/input-scope-data/pages/InputScopeDataPage.vue';

enableAutoUnmount(afterEach);

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockRouteQuery: Record<string, string> = { lotId: 'PAGE_LOT_01' };

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: mockRouteQuery,
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
    mockRouteQuery = { lotId: 'PAGE_LOT_01' };
  });

  it('renders page and forwards initialLotId from normalized lotId route query', async () => {
    const wrapper = mount(InputScopeDataPage);
    await flushPromises();

    expect(wrapper.exists()).toBe(true);
    const lotInput = wrapper.find<HTMLInputElement>('#isd_lot_id');
    expect(lotInput.element.value).toBe('PAGE_LOT_01');
  });

  it('ignores uppercase LOTID route query', async () => {
    mockRouteQuery = { LOTID: 'PAGE_LOT_02' };

    const wrapper = mount(InputScopeDataPage);
    await flushPromises();

    const lotInput = wrapper.find<HTMLInputElement>('#isd_lot_id');
    expect(lotInput.element.value).toBe('');
  });

  it('handles cancel navigation', async () => {
    const wrapper = mount(InputScopeDataPage);
    await flushPromises();

    const cancelBtn = wrapper.find('.isd__btn--tertiary');
    await cancelBtn.trigger('click');

    expect(mockBack.mock.calls.length + mockPush.mock.calls.length).toBeGreaterThan(0);
  });
});
