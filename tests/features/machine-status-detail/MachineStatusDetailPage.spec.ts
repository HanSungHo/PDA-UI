import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import {
  MachineStatusDetailPage,
  machineStatusDetailService,
  useMachineStatusDetailStore,
} from 'src/features/machine-status-detail';
import { okDialog } from 'src/services/ok-dialog.service';
import { CommonUtil } from 'src/utils/common-util';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';

describe('MachineStatusDetailPage', () => {
  let router: ReturnType<typeof createRouter>;
  let store: ReturnType<typeof useMachineStatusDetailStore>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    store = useMachineStatusDetailStore();

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          redirect: `/${ROUTE.machineStatusDetail}`,
        },
        {
          path: `/${ROUTE.machineStatusDetail}`,
          name: ROUTE.machineStatusDetail,
          component: MachineStatusDetailPage,
        },
        {
          path: `/${ROUTE.machineInform}`,
          name: ROUTE.machineInform,
          component: { template: '<div>Machine Inform</div>' },
        },
        {
          path: `/${ROUTE.machineStatus}`,
          name: ROUTE.machineStatus,
          component: { template: '<div>Machine Status List</div>' },
        },
        {
          path: `/${ROUTE.main}`,
          name: ROUTE.main,
          component: { template: '<div>Main</div>' },
        },
      ],
    });

    await router.push(`/${ROUTE.machineStatusDetail}`);
    await router.isReady();
  });

  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('renders BaseScreen with header title, 4 content cards, and standard action buttons', () => {
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('h1').text()).toBe('장비상태(변경)');
    const screen = wrapper.findComponent({ name: 'BaseScreen' });
    expect(screen.exists()).toBe(true);
    expect(screen.props('okLabel')).toBe('변경');
    expect(screen.props('cancelLabel')).toBe('닫기');

    expect(wrapper.findComponent({ name: 'MachineStatusDetailSearchCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MachineStatusDetailInfoCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MachineStatusDetailChangeCard' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MachineStatusDetailChamberCard' }).exists()).toBe(true);
    wrapper.unmount();
  });

  it('resets store on mount and on unmount', () => {
    const resetSpy = vi.spyOn(store, 'resetState');

    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });

    expect(resetSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    expect(resetSpy).toHaveBeenCalledTimes(2);
  });

  it('automatically queries EQP info on mount when EQPID query param is provided', async () => {
    const setEqpSpy = vi.spyOn(store, 'setEQPInfo').mockResolvedValueOnce(true);

    await router.push({
      path: `/${ROUTE.machineStatusDetail}`,
      query: { EQPID: 'mc01' },
    });

    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    expect(store.eqpId).toBe('MC01');
    expect(setEqpSpy).toHaveBeenCalledWith('MC01');
    wrapper.unmount();
  });

  it('handles scanned EQP barcode with EQP- prefix on eqp-enter and NATIVE_ENTER_EVENT', async () => {
    const eqpStatusSpy = vi.spyOn(machineStatusDetailService, 'eqpStatus').mockResolvedValue({
      ok: true,
      data: {
        FACILITY: 'FAB1',
        MAINSTATUS: 'RUN',
        EQPSTATUSCODE: 'R',
        EQPSTATUSDESC: '가동중',
        DOWNCODE: 'RN001',
        DOWNDESC: '정상가동',
      },
    });
    vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValue({
      ok: true,
      data: {},
    });
    vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockResolvedValue({
      ok: true,
      data: {},
    });

    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'EQP-MC01_';
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(store.eqpId).toBe('MC01');
    expect(eqpStatusSpy).toHaveBeenCalledWith('MC01', expect.any(String));
    wrapper.unmount();
  });

  it('clears info and shows READING ERROR when invalid barcode is scanned on eqp-enter', async () => {
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.facility = 'FAB1';
    store.mainStatus = 'RUN';
    store.eqpId = 'INVALID_BARCODE';

    const searchCard = wrapper.findComponent({ name: 'MachineStatusDetailSearchCard' });
    await searchCard.vm.$emit('eqp-enter');
    await flushPromises();

    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect(store.facility).toBe('');
    expect(store.mainStatus).toBe('');
    wrapper.unmount();
  });

  it('hides keyboard on comment-enter', async () => {
    const hideSpy = vi.spyOn(CommonUtil, 'hideKeyboard');
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    const changeCard = wrapper.findComponent({ name: 'MachineStatusDetailChangeCard' });
    await changeCard.vm.$emit('comment-enter');

    expect(hideSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('navigates to machineInform with MACHINENAME query on machine-inform click', async () => {
    const pushSpy = vi.spyOn(router, 'push');
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'MC07';
    const chamberCard = wrapper.findComponent({ name: 'MachineStatusDetailChamberCard' });
    await chamberCard.vm.$emit('machine-inform');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({
      path: `/${ROUTE.machineInform}`,
      query: { MACHINENAME: 'MC07' },
    });
    wrapper.unmount();
  });

  it('navigates explicitly to Main on close button click', async () => {
    const backSpy = vi.spyOn(router, 'back');
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    const screen = wrapper.findComponent({ name: 'BaseScreen' });
    await screen.vm.$emit('cancel');
    await flushPromises();

    expect(backSpy).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('binds confirm dialog buttons to store confirmText and cancelText dynamically (예 / 아니오 parity)', async () => {
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    // Trigger confirm with Yes/No buttons
    store.showConfirm({
      title: '비작업 확인',
      message: '비작업 LOT을 계속 진행하시겠습니까?',
      confirmText: COMMON_FIELD.BTNYESSTR,
      cancelText: COMMON_FIELD.BTNNOSTR,
    });
    await flushPromises();

    const modals = wrapper.findAllComponents({ name: 'BaseModal' });
    const confirmModal = modals[1]!;
    expect(confirmModal.exists()).toBe(true);
    expect(confirmModal.props('open')).toBe(true);

    const buttons = confirmModal.findAllComponents({ name: 'BaseButton' });
    expect(buttons[0]!.props('label')).toBe('아니오');
    expect(buttons[1]!.props('label')).toBe('예');

    wrapper.unmount();
  });

  it('delegates search-eqp, dropdown changes, chamber toggle, change action, and alert close completion', async () => {
    const backSpy = vi.spyOn(router, 'back');
    const setEqpSpy = vi.spyOn(store, 'setEQPInfo').mockResolvedValue(true);
    const selectStateSpy = vi.spyOn(store, 'selectEqpState').mockResolvedValue();
    const selectDownSpy = vi.spyOn(store, 'selectDownCode').mockResolvedValue();
    const chamberSpy = vi.spyOn(store, 'handleChamberChecked').mockResolvedValue(true);
    const changeSpy = vi.spyOn(store, 'changeData').mockResolvedValue(true);

    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.eqpId = 'MC01';
    const searchCard = wrapper.findComponent({ name: 'MachineStatusDetailSearchCard' });
    await searchCard.vm.$emit('search-eqp');
    expect(setEqpSpy).toHaveBeenCalledWith('MC01');

    const changeCard = wrapper.findComponent({ name: 'MachineStatusDetailChangeCard' });
    await changeCard.vm.$emit('update:selectedEqpState', 'C');
    expect(selectStateSpy).toHaveBeenCalledWith('C');

    await changeCard.vm.$emit('update:selectedDownCode', 'CA001');
    expect(selectDownSpy).toHaveBeenCalledWith('CA001');

    const chamberCard = wrapper.findComponent({ name: 'MachineStatusDetailChamberCard' });
    await chamberCard.vm.$emit('update:isChamberChecked', true);
    expect(chamberSpy).toHaveBeenCalledWith(true);

    const screen = wrapper.findComponent({ name: 'BaseScreen' });
    await screen.vm.$emit('ok');
    expect(changeSpy).toHaveBeenCalled();

    // Test immediate completion navigation when alert is not open
    store.alertDialog.open = false;
    store.isCompleted = true;
    await flushPromises();
    expect(backSpy).toHaveBeenCalledTimes(1);

    // Test completion navigation deferred until alert close when VAILOADING alert is open
    backSpy.mockClear();
    void store.showAlert('정기 정검 도달', '[CH1] VIA Loading W/F 진행 필요!');
    store.isCompleted = true;
    await flushPromises();
    expect(backSpy).not.toHaveBeenCalled();

    const modals = wrapper.findAllComponents({ name: 'BaseModal' });
    await modals[0]!.findComponent({ name: 'BaseButton' }).trigger('click');
    await flushPromises();
    expect(backSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('dequeues only one queued alert when the alert action closes and the modal finishes hiding', async () => {
    const wrapper = mount(MachineStatusDetailPage, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    store.showAlert('첫 번째', '현재 알림');
    store.showAlert('두 번째', '다음 알림');
    store.showAlert('세 번째', '마지막 알림');
    await flushPromises();

    const alertModal = wrapper.findAllComponents({ name: 'BaseModal' })[0]!;
    const okButton = alertModal.findComponent({ name: 'BaseButton' });
    await okButton.trigger('click');
    await alertModal.vm.$emit('afterClose');
    await flushPromises();

    expect(store.alertDialog.message).toBe('다음 알림');
    expect(store.dialogQueue).toHaveLength(1);
    expect(store.dialogQueue[0]?.message).toBe('마지막 알림');

    wrapper.unmount();
  });
});
