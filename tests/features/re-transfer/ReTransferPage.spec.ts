import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseScreen } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import ReTransferPage from 'src/features/re-transfer/pages/ReTransferPage.vue';
import { useReTransferStore } from 'src/features/re-transfer/stores/re-transfer.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

describe('ReTransferPage', () => {
  let router: ReturnType<typeof createRouter>;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: `/${ROUTE.reTransfer}`, component: ReTransferPage },
        { path: `/${ROUTE.main}`, component: { template: '<div>Main</div>' } },
      ],
    });
  });

  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('mounts and renders BaseScreen header, built-in footer, and action cards', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    expect(wrapper.find('h1').text()).toBe('반송');
    expect(wrapper.findComponent({ name: 'ReTransferSearchCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ReTransferDetailCard' }).exists()).toBe(true);
    const screen = wrapper.findComponent(BaseScreen);
    expect(screen.props('okLabel')).toBe('확인');
    expect(screen.props('cancelLabel')).toBe('취소');
    wrapper.unmount();
  });

  it('automatically triggers fetchCarryInfo if query LOTID is provided and resets state on unmount', async () => {
    const store = useReTransferStore();
    const fetchSpy = vi.spyOn(store, 'fetchCarryInfo').mockResolvedValue(true);
    const resetSpy = vi.spyOn(store, 'resetState');

    await router.push(`/${ROUTE.reTransfer}?LOTID=lot100`);
    await router.isReady();

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });
    await flushPromises();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('LOT100');

    wrapper.unmount();
    expect(resetSpy).toHaveBeenCalledTimes(2);
  });

  it('handles cancel by calling router.back() when history.state.back exists, otherwise routing to Main', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const pushSpy = vi.spyOn(router, 'push');
    const backSpy = vi.spyOn(router, 'back').mockImplementation(() => {});

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const screen = wrapper.findComponent(BaseScreen);

    // Case 1: No history back -> routes to Main
    router.options.history.state.back = null;
    screen.vm.$emit('cancel');
    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.main}` });

    // Case 2: Has history back -> calls router.back()
    router.options.history.state.back = '/lot-status';
    screen.vm.$emit('cancel');
    expect(backSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('handles searchCard events: search-lot vs lot-enter (BarcodeStyle.lotId parity)', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const store = useReTransferStore();
    const fetchSpy = vi.spyOn(store, 'fetchCarryInfo').mockResolvedValue(true);
    const clearSpy = vi.spyOn(store, 'clearInfo');

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const searchCard = wrapper.findComponent({ name: 'ReTransferSearchCard' });

    // 1. update:lotId and search-lot (direct search without barcode framing check)
    searchCard.vm.$emit('update:lotId', 'LOT300');
    searchCard.vm.$emit('search-lot');
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledWith('LOT300');

    // 2. lot-enter without leading space triggers READING ERROR and clears info
    fetchSpy.mockClear();
    clearSpy.mockClear();
    searchCard.vm.$emit('lot-enter');
    await flushPromises();
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(clearSpy).toHaveBeenCalled();
    expect(store.lotId).toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();

    // 3. lot-enter with invalid barcode starting with space only
    fetchSpy.mockClear();
    clearSpy.mockClear();
    searchCard.vm.$emit('update:lotId', ' ');
    searchCard.vm.$emit('lot-enter');
    await flushPromises();
    expect(clearSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    // 4. lot-enter with valid barcode framing
    fetchSpy.mockClear();
    searchCard.vm.$emit('update:lotId', ' LOT350\n');
    searchCard.vm.$emit('lot-enter');
    await flushPromises();
    expect(store.lotId).toBe('LOT350');
    expect(fetchSpy).toHaveBeenCalledWith('LOT350');
    wrapper.unmount();
  });

  it('handles barcode scanner native enter event via barcodeStyleLotId', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const store = useReTransferStore();
    const fetchSpy = vi.spyOn(store, 'fetchCarryInfo').mockResolvedValue(true);
    const clearSpy = vi.spyOn(store, 'clearInfo');

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    // 1. Scanned with valid barcode framing
    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT, { detail: { value: ' LOT200\n' } }));
    await flushPromises();
    expect(store.lotId).toBe('LOT200');
    expect(fetchSpy).toHaveBeenCalledWith('LOT200');

    // 2. Scanned invalid barcode (no leading space) clears info and resets lotId
    fetchSpy.mockClear();
    clearSpy.mockClear();
    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT, { detail: { value: 'INVALID' } }));
    await flushPromises();
    expect(store.lotId).toBe('');
    expect(clearSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('handles detailCard emissions: select-fab, select-bay, update:selectedStocker, update:selectedPort, update:selectedPda', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const store = useReTransferStore();
    const selectFabSpy = vi.spyOn(store, 'selectFab').mockResolvedValue();
    const selectBaySpy = vi.spyOn(store, 'selectBay').mockResolvedValue();

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const detailCard = wrapper.findComponent({ name: 'ReTransferDetailCard' });

    detailCard.vm.$emit('select-fab', 'FAB5');
    expect(selectFabSpy).toHaveBeenCalledWith('FAB5');

    detailCard.vm.$emit('select-bay', 'BAY03');
    expect(selectBaySpy).toHaveBeenCalledWith('BAY03');

    detailCard.vm.$emit('update:selectedStocker', 'STK05');
    expect(store.selectedStocker).toBe('STK05');

    detailCard.vm.$emit('update:selectedPort', 'PORT05');
    expect(store.selectedPort).toBe('PORT05');

    detailCard.vm.$emit('update:selectedPda', 'PDA05');
    expect(store.selectedPda).toBe('PDA05');
    wrapper.unmount();
  });

  it('handles execute carry execution via BaseScreen @ok', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const store = useReTransferStore();
    store.lotId = 'LOT_NEW';
    vi.spyOn(store, 'executeCarry').mockResolvedValue(true);

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const screen = wrapper.findComponent(BaseScreen);
    screen.vm.$emit('ok');
    await wrapper.vm.$nextTick();

    expect(store.executeCarry).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens the global okDialog service state and refocuses the lot input on confirm', async () => {
    await router.push(`/${ROUTE.reTransfer}`);
    await router.isReady();

    const store = useReTransferStore();

    const wrapper = mount(ReTransferPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    expect(okDialog.isOpen.value).toBe(false);

    // Trigger an alert via store.fetchCarryInfo('')
    const fetchPromise = store.fetchCarryInfo('');
    await wrapper.vm.$nextTick();

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.message.value).toBe('LOT NO를 입력해주세요');
    expect(okDialog.title.value).toBe('에  러');

    // Confirm dialog -> resolves showAlert, sets store.focusTarget = 'lot', and refocuses input
    const searchCardInstance = (
      wrapper.vm as unknown as { searchCardRef: { focusLot: () => void } }
    ).searchCardRef;
    const focusSpy = vi.spyOn(searchCardInstance, 'focusLot');

    okDialog.confirm();
    await fetchPromise;
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(false);
    expect(store.focusTarget).toBeNull();
    expect(focusSpy).toHaveBeenCalled();
    wrapper.unmount();
  });
});
