import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { SideDummyPage } from 'src/features/side-dummy';
import { sideDummyService } from 'src/features/side-dummy/services/side-dummy.service';
import { useSideDummyStore } from 'src/features/side-dummy/stores/side-dummy.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

describe('SideDummyPage', () => {
  let router: ReturnType<typeof createRouter>;
  let store: ReturnType<typeof useSideDummyStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    store = useSideDummyStore();

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          redirect: `/${ROUTE.sideDummy}`,
        },
        {
          path: `/${ROUTE.sideDummy}`,
          name: ROUTE.sideDummy,
          component: SideDummyPage,
        },
        {
          path: `/${ROUTE.main}`,
          name: ROUTE.main,
          component: { template: '<div>Main</div>' },
        },
      ],
    });

    await router.push(`/${ROUTE.sideDummy}`);
    await router.isReady();
  });

  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('renders header, product card, info card, and footer', () => {
    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('h1').text()).toBe('SIDE DUMMY');
    expect(wrapper.findComponent({ name: 'SideDummyProductCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'SideDummyInfoCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'SideDummyFooter' }).exists()).toBe(true);
    wrapper.unmount();
  });

  it('handles EQP search with manual input', async () => {
    const selectEqpSpy = vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
      ok: true,
      data: {
        LOTNAME: '',
        PROCESSOPERATIONNAME: '1000',
        PODESC: 'PHOTO OPERATION',
      },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'MC01';
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('search-eqp');
    await flushPromises();

    expect(selectEqpSpy).toHaveBeenCalledWith('MC01');
    expect(store.operId).toBe('1000');
    expect(store.isLotDisabled).toBe(false);
    wrapper.unmount();
  });

  it('handles EQP search with scanned EQP- prefix barcode', async () => {
    const selectEqpSpy = vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
      ok: true,
      data: {
        LOTNAME: 'DMM-LOT',
        PROCESSOPERATIONNAME: '2000',
      },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-MC01_';
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('eqp-enter');
    await flushPromises();

    expect(selectEqpSpy).toHaveBeenCalledWith('MC01');
    wrapper.unmount();
  });

  it('rejects scanned EQP barcode without EQP- prefix on eqp-enter', async () => {
    const selectEqpSpy = vi.spyOn(sideDummyService, 'selectEqp');

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'MC01';
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('eqp-enter');
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect(selectEqpSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('handles LOT search with scanned barcode envelope on lot-enter', async () => {
    const selectLotSpy = vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
      ok: true,
      data: {
        PROCESSOPERATIONNAME: '3000',
        PODESC: 'DIFF DESC',
      },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-01';
    store.lotId = ' WA2409001A'; // Scanned LOT barcode with leading space and check character
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('lot-enter');
    await flushPromises();

    expect(selectLotSpy).toHaveBeenCalledWith('WA2409001', 'EQP-01');
    expect(store.lotId).toBe('WA2409001');
    expect(store.isBtnInEnabled).toBe(true);
    wrapper.unmount();
  });

  it('rejects scanned LOT barcode without leading space on lot-enter', async () => {
    const selectLotSpy = vi.spyOn(sideDummyService, 'selectLot');

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-01';
    store.lotId = 'WA2409001A'; // Missing leading space envelope
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('lot-enter');
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('LOT#를 읽어주세요.');
    expect(selectLotSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('handles manual LOT search via search-lot click without requiring barcode envelope', async () => {
    const selectLotSpy = vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
      ok: true,
      data: {
        PROCESSOPERATIONNAME: '3000',
        PODESC: 'DIFF DESC',
      },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-01';
    store.lotId = 'WA2409001'; // Manually typed clean LOT
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('search-lot');
    await flushPromises();

    expect(selectLotSpy).toHaveBeenCalledWith('WA2409001', 'EQP-01');
    expect(store.isBtnInEnabled).toBe(true);
    expect(okDialog.isOpen.value).toBe(false);
    wrapper.unmount();
  });

  it('handles LOT search and triggers execute IN/OUT', async () => {
    vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
      ok: true,
      data: {
        PROCESSOPERATIONNAME: '3000',
        PODESC: 'DIFF DESC',
      },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-01';
    store.lotId = 'LOT-TEST';
    const productCard = wrapper.findComponent({ name: 'SideDummyProductCard' });
    await productCard.vm.$emit('search-lot');
    await flushPromises();

    expect(store.isBtnInEnabled).toBe(true);

    const insertSpy = vi.spyOn(sideDummyService, 'insertInOut').mockResolvedValueOnce({
      ok: true,
      data: { RET: 'OK' },
    });

    const footer = wrapper.findComponent({ name: 'SideDummyFooter' });
    await footer.vm.$emit('in');
    await flushPromises();

    expect(insertSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('handles NATIVE_ENTER_EVENT for barcode scanners', async () => {
    const selectEqpSpy = vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
      ok: true,
      data: { LOTNAME: '' },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-MC02_';
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(selectEqpSpy).toHaveBeenCalledWith('MC02');
    wrapper.unmount();
  });

  it('handles NATIVE_ENTER_EVENT for LOT barcode when LOT field is active', async () => {
    const selectLotSpy = vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
      ok: true,
      data: { PROCESSOPERATIONNAME: '3000' },
    });

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'MC01';
    store.isLotDisabled = false;
    store.isBtnInEnabled = false;
    store.lotId = ' WA2409001A';

    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(selectLotSpy).toHaveBeenCalledWith('WA2409001', 'MC01');
    expect(store.lotId).toBe('WA2409001');
    wrapper.unmount();
  });

  it('closes alert modal on OK button click', async () => {
    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '경고 메시지');
    await flushPromises();

    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('경고 메시지');

    store.closeAlert();
    await flushPromises();

    expect(store.alertDialog.open).toBe(false);
    wrapper.unmount();
  });

  it('navigates on handleClose', async () => {
    const pushSpy = vi.spyOn(router, 'push');

    const wrapper = mount(SideDummyPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    const footer = wrapper.findComponent({ name: 'SideDummyFooter' });
    await footer.vm.$emit('close');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.main}` });
    wrapper.unmount();
  });
});
