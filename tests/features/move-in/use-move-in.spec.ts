import { mount } from '@vue/test-utils';
import { okDialog } from 'src/services/ok-dialog.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

const { router, route, service, modal, mainStore } = vi.hoisted(() => ({
  router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() },
  route: { params: {} as Record<string, string>, query: {} as Record<string, string> },
  modal: {
    alert: vi.fn().mockResolvedValue(true),
    confirm: vi.fn().mockResolvedValue(false),
  },
  mainStore: { facility: 'F1', operatorId: 'OP1' },
  service: {
    sendLotInfo: vi.fn(),
    sendMcfdcEqpInfo: vi.fn(),
    sendEqpInfo: vi.fn(),
    sendRecipeInfo: vi.fn(),
    sendLoginUserCheck: vi.fn(),
    sendLotInfoEnd: vi.fn(),
    sendMoveInLotInfo: vi.fn(),
    sendCheckDiCycle: vi.fn(),
    sendSlotInfo: vi.fn(),
    sendChangeEqpStatus: vi.fn(),
    sendMoveIn: vi.fn(),
    sendProbeCardInfo: vi.fn(),
    sendProbeCardValue: vi.fn(),
    sendSetProbeCardHistory: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => route,
}));
vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => mainStore,
}));
vi.mock('src/features/move-in/services/movein.service', () => service);
vi.mock('src/features/move-in/composables/useConfirmModal', () => ({
  useConfirmModal: () => modal,
}));

import { useMoveIn } from 'src/features/move-in/composables/use-move-in';

function createVm(attachToDocument = false) {
  const wrapper = mount(
    defineComponent({
      setup(_, { expose }) {
        const vm = useMoveIn();
        expose({ state: vm });
        return () =>
          h('div', { class: 'move-in-field-procard-main' }, [
            h('input', { disabled: vm.loading.value }),
          ]);
      },
    }),
    { attachTo: attachToDocument ? document.body : undefined },
  );

  return {
    wrapper,
    vm: (wrapper.vm as unknown as { state: ReturnType<typeof useMoveIn> }).state,
  };
}

describe('useMoveIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params = {};
    route.query = {};
    modal.alert.mockResolvedValue(true);
    modal.confirm.mockResolvedValue(false);
    service.sendLotInfo.mockResolvedValue({
      isSuccess: true,
      result: '<AIFMSG><MSGBODY><STATE>WIP</STATE></MSGBODY></AIFMSG>',
    });
  });

  it('exposes legacy screen state and handlers', () => {
    const { vm } = createVm();

    expect(vm.lotId.value).toBe('');
    expect(vm.productDisplay.value).toBe('');
    expect(vm.whLabel.value).toBe('W/H');
    expect(vm.readBtnEnabled.value).toBe(false);
    expect(vm.okEnabled.value).toBe(true);
  });

  it('validates the equipment barcode on commit and focuses Probe Card for WT', async () => {
    const { vm, wrapper } = createVm(true);
    let resolveMcfdc!: (response: unknown) => void;
    service.sendMcfdcEqpInfo.mockReturnValue(
      new Promise((resolve) => {
        resolveMcfdc = resolve;
      }),
    );
    service.sendEqpInfo.mockResolvedValue({
      isSuccess: true,
      result:
        '<AIFMSG><MSGBODY><MAINEQPID>MACHINE</MAINEQPID><SUBEQPID>MACHINE</SUBEQPID></MSGBODY></AIFMSG>',
    });
    service.sendRecipeInfo.mockResolvedValue({
      isSuccess: true,
      result: '<AIFMSG><MSGBODY><RECIPE>RECIPE-01</RECIPE></MSGBODY></AIFMSG>',
    });
    vm.eqpId.value = 'EQP-MACHINE*';
    vm.processType.value = 'WT';
    vm.probeCardEnabled.value = true;

    const commit = vm.onEqpIdCommit();
    await nextTick();
    const probeCardInput = wrapper.element.querySelector(
      '.move-in-field-procard-main input',
    ) as HTMLInputElement | null;
    expect(vm.loading.value).toBe(true);
    expect(probeCardInput?.disabled).toBe(true);
    expect(document.activeElement).not.toBe(probeCardInput);
    resolveMcfdc({
      isSuccess: true,
      result: '<AIFMSG><MSGBODY><STATUS>Local</STATUS><EQPID>MACHINE</EQPID></MSGBODY></AIFMSG>',
    });
    await commit;

    expect(vm.eqpId.value).toBe('MACHINE');
    expect(service.sendMcfdcEqpInfo).toHaveBeenCalledWith('MACHINE');
    expect(wrapper.element.querySelector('.move-in-field-procard-main input')).toBe(
      document.activeElement,
    );
    wrapper.unmount();
  });

  it('rejects non-barcode equipment and does not call the equipment service', () => {
    const { vm } = createVm();
    const showDialog = vi.spyOn(okDialog, 'show').mockResolvedValue(1);
    vm.eqpId.value = 'MACHINE';

    vm.onEqpIdCommit();

    expect(vm.eqpId.value).toBe('');
    expect(service.sendMcfdcEqpInfo).not.toHaveBeenCalled();
    expect(showDialog).toHaveBeenCalledWith(
      'READING ERROR',
      expect.any(String),
      expect.any(String),
    );
    showDialog.mockRestore();
  });

  it('validates the Probe Card barcode and sends its parsed value', () => {
    const { vm } = createVm();
    vm.eqpId.value = 'EQ-01';
    vm.probeCard.value = ' CARD-01*';

    vm.onProbeCardCommit();

    expect(vm.probeCard.value).toBe('CARD-01');
    expect(service.sendProbeCardInfo).toHaveBeenCalledWith('CARD-01', 'EQ-01');
  });

  it('clears invalid Probe Card input and restores focus without calling the service', async () => {
    const { vm, wrapper } = createVm(true);
    const showDialog = vi.spyOn(okDialog, 'show').mockResolvedValue(1);
    vm.eqpId.value = 'EQ-01';
    vm.probeCard.value = 'CARD-01';

    vm.onProbeCardCommit();
    await nextTick();

    expect(vm.probeCard.value).toBe('');
    expect(service.sendProbeCardInfo).not.toHaveBeenCalled();
    expect(wrapper.element.querySelector('.move-in-field-procard-main input')).toBe(
      document.activeElement,
    );
    expect(showDialog).toHaveBeenCalledWith(
      'READING ERROR',
      expect.any(String),
      expect.any(String),
    );
    showDialog.mockRestore();
    wrapper.unmount();
  });

  it('keeps the automotive flag from LOTINFO for conditional display', async () => {
    route.params = { lotId: 'L-AUTO' };
    service.sendLotInfo.mockResolvedValue({
      isSuccess: true,
      result:
        '<AIFMSG><MSGBODY><STATE>WIP</STATE><AUTOMOTIVEFLAG>Y</AUTOMOTIVEFLAG></MSGBODY></AIFMSG>',
    });

    const { vm, wrapper } = createVm();
    await vi.waitFor(() => expect(vm.autoMotiveFlag.value).toBe('Y'));

    wrapper.unmount();
  });

  it('shows standard-machine info with the legacy Korean title', () => {
    const { vm } = createVm();
    vm.standardMachine.value = 'FAB-GROUP';

    vm.showStandardMachineInfo();

    expect(modal.alert).toHaveBeenCalledWith('FAB-GROUP', '기준장비');
  });

  it('loads the LOT from the Vue route param and calls LOTINFO(MVIN)', async () => {
    route.params = { lotId: 'L-100' };

    const { vm, wrapper } = createVm();
    await vi.waitFor(() =>
      expect(service.sendLotInfo).toHaveBeenCalledWith('L-100', 'F1', 'MVIN', 'OP1'),
    );
    expect(vm.lotId.value).toBe('L-100');
    wrapper.unmount();
  });

  it.each([
    ['RUN status', '<STATUS>RUN</STATUS><STATE>WIP</STATE>', '이미 MOVE IN된 LOT입니다.'],
    [
      'non-WIP state',
      '<STATUS>WAIT</STATUS><STATE>HOLD</STATE>',
      'HOLD 상태 입니다. MOVE IN할수 없습니다.',
    ],
    [
      'on-hold status',
      '<STATE>WIP</STATE><HOLDSTATUS>ONHOLD</HOLDSTATUS>',
      'HOLD된 LOT입니다. MOVE IN할수 없습니다.',
    ],
    [
      'batched dummy/test LOT',
      '<STATE>WIP</STATE><PROCESSNAME>MW_TEST</PROCESSNAME><BATCHID>B-01</BATCHID>',
      'BATCH로 묶인 Dummy/Test LOT으로 \nMOVE_IN 할수 없습니다.',
    ],
    [
      'bake rework interlock',
      '<STATE>WIP</STATE><BAKECHECK>Y</BAKECHECK>',
      'L-100 은(는) PIQ Bake Rework 진행 Lot으로, \nMP Add Etch Rework 진행이 필요합니다.',
    ],
  ])('disables OK and prevents submit for the %s interlock', async (_name, fields, message) => {
    const { vm, wrapper } = createVm();
    service.sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: `<AIFMSG><MSGBODY>${fields}</MSGBODY></AIFMSG>`,
    });

    vm.lotId.value = 'L-100';
    await vm.getLotInfo();
    vm.onOK();

    expect(vm.okEnabled.value).toBe(false);
    expect(modal.alert).toHaveBeenCalledWith(message, '에  러');
    expect(service.sendLoginUserCheck).not.toHaveBeenCalled();
    expect(service.sendCheckDiCycle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('formats the legacy product display and marks changed recipe and equipment group', async () => {
    const { vm, wrapper } = createVm();
    service.sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<STATE>WIP</STATE>',
        '<PRODUCT>PROD-01</PRODUCT>',
        '<JOBCODE>JOB-22</JOBCODE>',
        '<RECIPE>RCP-OLD</RECIPE>',
        '<CHANGERECIPE>RCP-NEW</CHANGERECIPE>',
        '<EQPGROUP>GROUP-OLD</EQPGROUP>',
        '<CHANGEEQPGROUP>GROUP-NEW</CHANGEEQPGROUP>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    vm.lotId.value = 'L-100';
    await vm.getLotInfo();

    expect(vm.productDisplay.value).toBe('PROD-01(JOB-22)');
    expect(vm.recipeChanged.value).toBe(true);
    expect(vm.standardMachineChanged.value).toBe(true);
    wrapper.unmount();
  });

  it('reports a failed Probe Card History response and still completes LOTINFOEND', async () => {
    const { vm, wrapper } = createVm();
    vm.lotId.value = 'L-100';
    vm.eqpId.value = 'EQ-01';
    vm.recipeText.value = 'RCP-01';
    vm.probeCard.value = 'PC-01';
    vm.probeCardId.value = 'PCID-01';
    modal.confirm.mockResolvedValue(true);
    service.sendMoveInLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });
    service.sendMoveIn.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });
    service.sendSetProbeCardHistory.mockResolvedValue({
      isSuccessFul: false,
      result: '<AIFMSG><MSGBODY><ERRMSG>History save failed</ERRMSG></MSGBODY></AIFMSG>',
    });
    service.sendLotInfoEnd.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });

    await vm.getLotInfoOk();

    expect(modal.alert).toHaveBeenCalledWith('History save failed', '에  러');
    expect(service.sendLotInfoEnd).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('accepts the legacy query-string LOT fallback', async () => {
    route.query = { lotId: 'L-QUERY' };

    const { vm, wrapper } = createVm();
    await vi.waitFor(() => expect(service.sendLotInfo).toHaveBeenCalled());
    expect(vm.lotId.value).toBe('L-QUERY');
    wrapper.unmount();
  });

  it('opens Batch LOT List with the current batch and facility', () => {
    const { vm, wrapper } = createVm();
    vm.lotId.value = 'LOT-CURRENT';
    vm.batchId.value = 'BAT-42';

    vm.onBatIdClick();

    expect(router.push).toHaveBeenCalledWith({
      name: 'move-in-batch-lot-list',
      params: { lotId: 'LOT-CURRENT' },
      query: { batId: 'BAT-42', facility: 'F1' },
    });
    wrapper.unmount();
  });

  it('opens Comment List with all legacy LOT and operation context', async () => {
    const { vm, wrapper } = createVm();
    vm.lotId.value = 'LOT-CURRENT';
    service.sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result:
        '<AIFMSG><MSGBODY><STATE>WIP</STATE><OPERATION>OP-20</OPERATION><SUBOPERATION>S-03</SUBOPERATION><PROCESSSTEP>PHOTO</PROCESSSTEP><OPERSEQUENCE>001</OPERSEQUENCE></MSGBODY></AIFMSG>',
    });
    await vm.getLotInfo();

    vm.onReadClick();

    expect(router.push).toHaveBeenCalledWith({
      name: 'move-in-comment-list',
      params: { lotId: 'LOT-CURRENT' },
      query: {
        lotId: 'LOT-CURRENT',
        operation: 'OP-20',
        subOperation: 'S-03',
        processStep: 'PHOTO',
        operSequence: '001',
        facility: 'F1',
      },
    });
    wrapper.unmount();
  });

  it('opens Batch Move In with the Android activity extras', async () => {
    const { vm, wrapper } = createVm();
    vm.lotId.value = 'LOT-CURRENT';
    vm.batchId.value = 'BAT-42';
    vm.eqpId.value = 'EQP-01';
    vm.recipeText.value = 'RCP-01';

    await vm.moveIn();

    expect(router.push).toHaveBeenCalledWith({
      name: 'move-in-batch-move-in',
      params: { lotId: 'LOT-CURRENT' },
      query: {
        batchId: 'BAT-42',
        lotId: 'LOT-CURRENT',
        eqpId: 'EQP-01',
        recipe: 'RCP-01',
        isSkip: 'N',
        facility: 'F1',
      },
    });
    expect(service.sendMoveIn).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('applies the selected Batch LOT and reloads LOT data', async () => {
    const { vm, wrapper } = createVm();

    await vm.completeBatchLotList('LOT-SELECTED');

    expect(router.replace).toHaveBeenCalledWith({
      name: 'move-in',
      params: { lotId: 'LOT-SELECTED' },
    });
    expect(service.sendLotInfo).toHaveBeenCalledWith('LOT-SELECTED', 'F1', 'MVIN', 'OP1');
    expect(vm.lotId.value).toBe('LOT-SELECTED');
    wrapper.unmount();
  });

  it('blocks submit without LOT and navigates back on cancel', () => {
    const { vm } = createVm();

    vm.onOK();
    vm.onCancel();

    expect(modal.alert).toHaveBeenCalledWith('LOT No를 입력하세요.', '에  러');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(service.sendLoginUserCheck).not.toHaveBeenCalled();
  });

  it('resets all editable state', () => {
    const { vm } = createVm();
    vm.lotId.value = 'L1';
    vm.eqpId.value = 'EQ1';
    vm.comment.value = 'note';
    vm.skipCurrentOperation.value = true;

    vm.reset();

    expect(vm.lotId.value).toBe('');
    expect(vm.eqpId.value).toBe('');
    expect(vm.comment.value).toBe('');
    expect(vm.skipCurrentOperation.value).toBe(false);
  });
});
