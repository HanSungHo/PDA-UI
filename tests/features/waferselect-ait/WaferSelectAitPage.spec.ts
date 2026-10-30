import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import WaferSelectAitPage from '~/features/waferselect-ait/pages/WaferSelectAitPage.vue';
import { useWaferSelectAitStore } from '~/features/waferselect-ait/stores/waferselect-ait.store';
import type { WaferSelectAitInput } from '~/features/waferselect-ait/types/waferselect-ait.types';
import apiClient from '~/services/api-client';

vi.mock('~/services/api-client', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const fixture = {
  LOTID: 'ait001',
  SEQUENCE: 'SEQ',
  FIXEDCOUNT: 1,
  EXISTWAFERLIST: 'W.01,W.02',
  CATEGORY: 'ETC',
};
const wrappers: ReturnType<typeof mount>[] = [];

async function open(input: WaferSelectAitInput = fixture) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useWaferSelectAitStore();
  store.start(input);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/caller', component: { template: '<div>caller</div>' } },
      { path: '/waferselect-ait', component: WaferSelectAitPage },
    ],
  });
  await router.push('/caller');
  await router.push('/waferselect-ait');
  // Memory history omits the browser history state's `back` metadata.
  router.options.history.state.back = '/caller';
  const wrapper = mount(
    { template: '<router-view />' },
    { global: { plugins: [pinia, router] }, attachTo: document.body },
  );
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, store, router };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-29T00:00:00Z'));
});

afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers.length = 0;
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('AIT page', () => {
  it('accepts the Remote AIT caller extras and returns its exact result contract once', async () => {
    // RemoteAITActivity.executeSelectWafer passes these four extras, without SEQUENCE.
    const { wrapper, store, router } = await open({
      LOTID: 'AIT001',
      EXISTWAFERLIST: 'W.01,W.02',
      FIXEDCOUNT: '2',
      CATEGORY: 'ETC',
    });
    await wrapper.findAll('.waferselect-ait__slot')[1]!.trigger('click');
    await wrapper.get('[data-testid="confirm"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/caller');
    expect(store.consumeResult()).toEqual({
      SEQUENCE: 'null',
      SELECTEDWAFERLIST: 'W.02',
      SELECTEDMACHINE: '',
    });
    expect(store.consumeResult()).toBeUndefined();
  });

  it('shares a strict 1000ms click gate across select-all, reset, confirm and cancel', async () => {
    const { wrapper, store, router } = await open();
    await wrapper.get('[data-testid="select-all"]').trigger('click');
    await wrapper.get('[data-testid="select-all"]').trigger('click');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('W.01');
    vi.advanceTimersByTime(1000);
    await wrapper.get('[data-testid="reset-wafer"]').trigger('click');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('W.01');
    vi.advanceTimersByTime(1);
    await wrapper.get('[data-testid="reset-wafer"]').trigger('click');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('');
    await wrapper.get('[data-testid="confirm"]').trigger('click');
    await wrapper.get('[data-testid="cancel"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/waferselect-ait');
    expect(store.result).toBeUndefined();
    vi.advanceTimersByTime(1001);
    await wrapper.get('[data-testid="confirm"]').trigger('click');
    await flushPromises();
    expect(store.result?.SELECTEDWAFERLIST).toBe('');
    expect(router.currentRoute.value.path).toBe('/caller');
  });

  it('renders exact copy, uppercase LOT and limit dialog without calling API', async () => {
    const { wrapper } = await open();
    expect(wrapper.text()).toContain('WAFER 선택');
    expect(wrapper.text()).toContain('LOT No.');
    const lot = wrapper.get('input');
    expect((lot.element as HTMLInputElement).value).toBe('AIT001');
    await lot.setValue('abc');
    await flushPromises();
    expect((lot.element as HTMLInputElement).value).toBe('ABC');
    await lot.setValue('abc');
    await flushPromises();
    expect((lot.element as HTMLInputElement).value).toBe('ABC');
    const slots = wrapper.findAll('.waferselect-ait__slot');
    expect(slots).toHaveLength(25);
    expect(slots[2]?.text()).toBe('');
    await slots[0]!.trigger('click');
    await slots[1]!.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('에  러');
    expect(document.body.textContent).toContain('선택한 WAFER개수가 지정된 개수를 초과하였습니다.');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('W.01');
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('selects all, resets and confirms a sorted result to caller', async () => {
    const { wrapper, store, router } = await open({ ...fixture, FIXEDCOUNT: 2 });
    await wrapper.get('[data-testid="select-all"]').trigger('click');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('W.01,W.02');
    vi.advanceTimersByTime(1001);
    await wrapper.get('[data-testid="reset-wafer"]').trigger('click');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('');
    await wrapper.findAll('.waferselect-ait__slot')[1]!.trigger('click');
    vi.advanceTimersByTime(1001);
    await wrapper.get('[data-testid="confirm"]').trigger('click');
    await flushPromises();
    expect(store.result).toEqual({
      SEQUENCE: 'SEQ',
      SELECTEDWAFERLIST: 'W.02',
      SELECTEDMACHINE: '',
    });
    expect(router.currentRoute.value.path).toBe('/caller');
  });

  it('allows confirming an empty result', async () => {
    const { wrapper, store } = await open();
    await wrapper.get('[data-testid="confirm"]').trigger('click');
    await flushPromises();
    expect(store.result?.SELECTEDWAFERLIST).toBe('');
  });

  it('cancel discards changed selection', async () => {
    const { wrapper, store, router } = await open();
    await wrapper.findAll('.waferselect-ait__slot')[0]!.trigger('click');
    await wrapper.get('[data-testid="cancel"]').trigger('click');
    await flushPromises();
    expect(store.result).toBeUndefined();
    expect(store.input).toBeUndefined();
    expect(router.currentRoute.value.path).toBe('/caller');
  });

  it('back navigation clears the session without confirming', async () => {
    const { store, router } = await open();
    router.back();
    await flushPromises();
    expect(store.input).toBeUndefined();
    expect(store.result).toBeUndefined();
  });

  it('view-only preserves select-all space and hides edit controls', async () => {
    const { wrapper } = await open({ ...fixture, EDITABLE: 'N', FIXEDCOUNT: 0 });
    expect(wrapper.get('input').attributes()).toHaveProperty('disabled');
    expect(wrapper.get('[data-testid="select-all"]').attributes('aria-hidden')).toBe('true');
    expect(wrapper.find('[data-testid="reset-wafer"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="confirm"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="cancel"]').text()).toBe('취소');
    expect(wrapper.get('[data-testid="wafer-result"]').text()).toBe('W.01,W.02');
    expect(
      wrapper
        .findAll('.waferselect-ait__slot')
        .every((slot) => slot.attributes('disabled') !== undefined),
    ).toBe(true);
  });
});
