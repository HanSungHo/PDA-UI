import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseButton, BaseDropdownList, BaseInput, BaseScreen } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { useWaferSelectStore } from 'src/features/move-out/stores/wafer-select.store';
import RemoteAegisActionCard from 'src/features/remote-aegis/components/RemoteAegisActionCard.vue';
import RemoteAegisCommentCard from 'src/features/remote-aegis/components/RemoteAegisCommentCard.vue';
import RemoteAegisProductCard from 'src/features/remote-aegis/components/RemoteAegisProductCard.vue';
import RemoteAegisPage from 'src/features/remote-aegis/pages/RemoteAegisPage.vue';
import { remoteAegisService } from 'src/features/remote-aegis/services/remote-aegis.service';
import { useRemoteAegisStore } from 'src/features/remote-aegis/stores/remote-aegis.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('src/features/remote-aegis/services/remote-aegis.service', () => ({
  remoteAegisService: {
    fetchRemoteEqpInfo: vi.fn(),
    fetchMachinePortStatus: vi.fn(),
    executeMachinePortClear: vi.fn(),
    executeAegisModeChange: vi.fn(),
    fetchAegisLotInfo: vi.fn(),
    fetchCommentList: vi.fn(),
    fetchSlotInfo: vi.fn(),
    executeAegisRemoteStart: vi.fn(),
  },
}));

describe('RemoteAegisPage', () => {
  let router: ReturnType<typeof createRouter>;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: `/${ROUTE.remoteAegis}`, component: RemoteAegisPage },
        { path: `/${ROUTE.main}`, component: { template: '<div>Main</div>' } },
        { path: `/${ROUTE.esheet}`, component: { template: '<div>ESheet</div>' } },
        { path: `/${ROUTE.waferSelect}`, component: { template: '<div>WaferSelect</div>' } },
        { path: `/${ROUTE.commentList}`, component: { template: '<div>CommentList</div>' } },
      ],
    });
  });

  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('renders BaseScreen, 3 ds-screen__card sections, all layout="horizontal", and footer button', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    // Check title (clean Figma title when default, and includes operator name when logged in)
    expect(wrapper.find('h1').text()).toBe('AEGIS Remote Start');
    const mainStore = pinia.state.value.main as { operatorName?: string };
    if (mainStore) {
      mainStore.operatorName = '홍길동';
      await wrapper.vm.$nextTick();
      expect(wrapper.find('h1').text()).toBe('AEGIS Remote Start (홍길동)');
    }

    // Check 3 cards exist
    expect(wrapper.findComponent(RemoteAegisProductCard).exists()).toBe(true);
    expect(wrapper.findComponent(RemoteAegisCommentCard).exists()).toBe(true);
    expect(wrapper.findComponent(RemoteAegisActionCard).exists()).toBe(true);

    // Check all cards have ds-screen__card class
    const cards = wrapper.findAll('.ds-screen__card');
    expect(cards.length).toBeGreaterThanOrEqual(3);

    // Check all BaseInput have layout="horizontal"
    const inputs = wrapper.findAllComponents(BaseInput);
    expect(inputs.length).toBeGreaterThanOrEqual(5);
    inputs.forEach((input) => {
      expect(input.props('layout')).toBe('horizontal');
    });

    // Check all BaseDropdownList have layout="horizontal"
    const dropdowns = wrapper.findAllComponents(BaseDropdownList);
    expect(dropdowns.length).toBeGreaterThanOrEqual(1);
    dropdowns.forEach((dropdown) => {
      expect(dropdown.props('layout')).toBe('horizontal');
    });

    // Check footer button
    const screen = wrapper.findComponent(BaseScreen);
    expect(screen.text()).toContain('MOVE OUT (ESHEET)');

    wrapper.unmount();
  });

  it('initializes with query Eqpid and resets state on unmount', async () => {
    const store = useRemoteAegisStore();
    const initSpy = vi.spyOn(store, 'initScreen').mockResolvedValue();
    const resetSpy = vi.spyOn(store, 'resetState');

    await router.push(`/${ROUTE.remoteAegis}?Eqpid=AEGIS01`);
    await router.isReady();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    expect(initSpy).toHaveBeenCalledWith('AEGIS01');
    wrapper.unmount();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('handles machine-enter barcode parsing via barcodeStyleEqpId and search-machine', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const store = useRemoteAegisStore();
    const setEqpInfoSpy = vi.spyOn(store, 'setEqpInfo').mockResolvedValue();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const productCard = wrapper.findComponent(RemoteAegisProductCard);

    // 1. Invalid EQP barcode format triggers READING ERROR
    store.machineInput = 'INVALID_EQP';
    productCard.vm.$emit('machine-enter');
    await flushPromises();
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(setEqpInfoSpy).not.toHaveBeenCalled();

    // 2. Valid barcode with prefix EQP- strips prefix and calls setEqpInfo
    okDialog.confirm();
    store.machineInput = 'EQP-AEGIS01_';
    productCard.vm.$emit('machine-enter');
    await flushPromises();
    expect(store.machineInput).toBe('AEGIS01');
    expect(setEqpInfoSpy).toHaveBeenCalled();

    // 3. search-machine calls setEqpInfo directly
    setEqpInfoSpy.mockClear();
    productCard.vm.$emit('search-machine');
    expect(setEqpInfoSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('handles lot-enter barcode parsing via barcodeStyleLotId and search-lot', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const store = useRemoteAegisStore();
    const setLotInfoSpy = vi.spyOn(store, 'setLotInfo').mockResolvedValue();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const productCard = wrapper.findComponent(RemoteAegisProductCard);

    // 1. Invalid lot barcode (missing leading space) triggers READING ERROR
    store.lotIdInput = 'INVALID_LOT';
    productCard.vm.$emit('lot-enter');
    await flushPromises();
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(setLotInfoSpy).not.toHaveBeenCalled();

    // 2. Valid barcode with leading space and suffix stripped
    okDialog.confirm();
    store.lotIdInput = ' LOT01_';
    productCard.vm.$emit('lot-enter');
    await flushPromises();
    expect(store.lotIdInput).toBe('LOT01');
    expect(setLotInfoSpy).toHaveBeenCalled();

    // 3. search-lot calls setLotInfo directly
    setLotInfoSpy.mockClear();
    productCard.vm.$emit('search-lot');
    expect(setLotInfoSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('handles WF선택, starts waferSelectStore, navigates, and reacts to waferSelectStore.result', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const store = useRemoteAegisStore();
    const waferStore = useWaferSelectStore();
    const pushSpy = vi.spyOn(router, 'push');

    vi.spyOn(store, 'executeSelectWafer').mockResolvedValue({
      lotId: 'LOT01',
      enableWaferList: '01,02,03',
      fixedCount: 3,
      category: 'ETC',
      factory: 'FABCJ4',
      product: 'PROD1',
      ownerCode: 'OWN1',
      operCode: 'OP1',
    });

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const productCard = wrapper.findComponent(RemoteAegisProductCard);
    productCard.vm.$emit('select-wafer');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.waferSelect}` });
    expect(waferStore.input?.lotId).toBe('LOT01');

    // Simulate returning from wafer selection
    waferStore.complete({
      sequence: '1',
      selectedWaferList: '01,02',
      selectedMachine: 'M1',
    });
    await flushPromises();

    expect(store.selectedWaferList).toBe('01,02');
    expect(store.waferCount).toBe('2');

    wrapper.unmount();
  });

  it('handles MOVE OUT (ESHEET) and cancel buttons', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const pushSpy = vi.spyOn(router, 'push');
    const backSpy = vi.spyOn(router, 'back');

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    // 1. MOVE OUT (ESHEET) preserves state by setting isReturningFromChild
    const store = useRemoteAegisStore();
    const footerBtn = wrapper
      .findAllComponents(BaseButton)
      .find((b) => (b.props() as { label?: string }).label === 'MOVE OUT (ESHEET)');
    expect(footerBtn?.exists()).toBe(true);
    await footerBtn?.trigger('click');
    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.esheet}` });
    expect(store.isReturningFromChild).toBe(true);

    // 2. Cancel: with history -> router.back()
    router.options.history.state.back = '/main';
    const actionCard = wrapper.findComponent(RemoteAegisActionCard);
    actionCard.vm.$emit('cancel');
    expect(backSpy).toHaveBeenCalled();

    // 3. Cancel: without history -> router.push(/main)
    router.options.history.state.back = null;
    actionCard.vm.$emit('cancel');
    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.main}` });

    wrapper.unmount();
  });

  it('renders OkDialog with role="alert" in document.body when empty machine is submitted', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    const store = useRemoteAegisStore();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    const okDialogComponent = wrapper.findComponent(OkDialog);
    expect(okDialogComponent.exists()).toBe(true);
    expect(okDialogComponent.props('open')).toBe(false);

    // Call setEqpInfo with empty machine input
    store.machineInput = '';
    const promise = store.setEqpInfo();
    await wrapper.vm.$nextTick();

    expect(okDialogComponent.props('open')).toBe(true);
    expect(okDialogComponent.props('message')).toBe('장비명을 입력하여 주세요.');

    const alertElement = document.body.querySelector('[role="alert"]');
    expect(alertElement).not.toBeNull();
    expect(alertElement?.textContent).toContain('장비명을 입력하여 주세요.');

    okDialogComponent.vm.$emit('confirm');
    await promise;
    await wrapper.vm.$nextTick();

    expect(okDialog.isOpen.value).toBe(false);
    wrapper.unmount();
  });

  it('handles NATIVE_ENTER_EVENT on window for scanner', async () => {
    await router.push(`/${ROUTE.remoteAegis}`);
    await router.isReady();

    vi.mocked(remoteAegisService.fetchRemoteEqpInfo).mockResolvedValue({
      ok: true,
      message: '',
      data: {
        pCount: 'Y',
        portName: 'P1',
        pmMessage: '',
        mainEqpId: 'AEGIS02',
      },
    });
    vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValue({
      ok: true,
      message: '',
      data: {
        portStateName: 'READY',
        ackMsg: '',
      },
    });

    const store = useRemoteAegisStore();

    const wrapper = mount(RemoteAegisPage, {
      global: {
        plugins: [pinia, router],
        stubs: {
          BaseLoading: true,
        },
      },
    });

    // Fire native enter event for machine
    const event = new CustomEvent(NATIVE_ENTER_EVENT, {
      detail: { value: 'EQP-AEGIS02_' },
    });
    window.dispatchEvent(event);
    await flushPromises();

    expect(store.machineInput).toBe('AEGIS02');
    wrapper.unmount();
  });
});
