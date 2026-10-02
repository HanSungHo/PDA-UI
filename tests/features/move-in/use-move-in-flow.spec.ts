import { mount } from '@vue/test-utils';
import { useMoveIn } from 'src/features/move-in/composables/use-move-in';
import { MOVE_IN_UI } from 'src/features/move-in/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

const {
  routerBack,
  routerPush,
  routerReplace,
  sendLotInfo,
  sendCheckInspection,
  sendCheckDiCycle,
  sendDummyEqpInfo,
  sendDummyEqpInput,
  sendMoveInLotInfo,
  sendMoveIn,
  sendLotInfoEnd,
  sendLoginUserCheck,
  sendProbeCardInfo,
  sendProbeCardValue,
  sendSlotInfo,
  showAlert,
  showConfirm,
  mainStore,
} = vi.hoisted(() => ({
  routerBack: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  sendLotInfo: vi.fn(),
  sendCheckInspection: vi.fn(),
  sendCheckDiCycle: vi.fn(),
  sendDummyEqpInfo: vi.fn(),
  sendDummyEqpInput: vi.fn(),
  sendMoveInLotInfo: vi.fn(),
  sendMoveIn: vi.fn(),
  sendLotInfoEnd: vi.fn(),
  sendLoginUserCheck: vi.fn(),
  sendProbeCardInfo: vi.fn(),
  sendProbeCardValue: vi.fn(),
  sendSlotInfo: vi.fn(),
  showAlert: vi.fn(),
  showConfirm: vi.fn(),
  mainStore: { facility: 'F1', operatorId: 'OP1' },
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {}, query: {} }),
  useRouter: () => ({ back: routerBack, push: routerPush, replace: routerReplace }),
}));

vi.mock('src/features/move-in/services/movein.service', () => ({
  sendLotInfo,
  sendCheckInspection,
  sendCheckDiCycle,
  sendDummyEqpInfo,
  sendDummyEqpInput,
  sendMoveInLotInfo,
  sendMoveIn,
  sendLotInfoEnd,
  sendLoginUserCheck,
  sendProbeCardInfo,
  sendProbeCardValue,
  sendSlotInfo,
}));

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => mainStore,
}));

vi.mock('src/features/move-in/composables/useConfirmModal', () => ({
  useConfirmModal: () => ({ alert: showAlert, confirm: showConfirm }),
}));

describe('useMoveIn', () => {
  afterEach(() => {
    vi.clearAllMocks();
    showAlert.mockResolvedValue(true);
    showConfirm.mockResolvedValue(false);
  });

  it('loads available wafers and opens the selection flow instead of prompting', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    vm.lotId.value = 'LOT-001';
    sendSlotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><WAFERLIST>01,02</WAFERLIST></MSGBODY></AIFMSG>',
    });

    try {
      await vm.onWHClick();

      expect(sendSlotInfo).toHaveBeenCalledWith('LOT-001', expect.any(String));
      expect(vm.waferDialogOpen.value).toBe(true);
      expect(vm.waferOptions.value).toEqual(['01', '02']);
      expect(prompt).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
      prompt.mockRestore();
    }
  });

  it('opens the COUNT flow without requiring a wafer list', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    const originalAlert = window.alert;
    window.alert = vi.fn();
    vm.createCategory.value = 'COUNT';
    sendSlotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><WAFERLIST></WAFERLIST></MSGBODY></AIFMSG>',
    });

    try {
      await vm.onWHClick();

      expect(vm.whLabel.value).toBe('COUNT');
      expect(vm.waferDialogOpen.value).toBe(true);
    } finally {
      window.alert = originalAlert;
      wrapper.unmount();
    }
  });

  it('validates COUNT through DUMMYEQPINPUT and stores the returned comment', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.createCategory.value = 'COUNT';
    vm.countName.value = '120';
    sendDummyEqpInput.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><LOTCOMMENT>COUNT 120</LOTCOMMENT><MSG></MSG></MSGBODY></AIFMSG>',
    });

    try {
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(sendDummyEqpInput).toHaveBeenCalled());

      expect(sendDummyEqpInput).toHaveBeenCalledWith('LOT-001', '120', 'COUNT');
      expect(vm.comment.value).toBe('COUNT 120');
      expect(vm.countName.value).toBe('120');
      expect(vm.waferDialogOpen.value).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('formats selected wafer IDs as the legacy W/H comment', () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.waferDialogOpen.value = true;
    vm.toggleWaferSelection('LOT-001.01');
    vm.toggleWaferSelection('LOT-001.02');

    try {
      vm.confirmWaferSelection();

      expect(vm.comment.value).toBe('; W/H:#01,02');
      expect(vm.waferDialogOpen.value).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('validates selected wafers through DUMMYEQPINPUT in SLOT mode', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.createCategory.value = 'SLOT';
    vm.selectedWafers.value = ['LOT-001.01'];
    sendDummyEqpInput.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><LOTCOMMENT>SLOT 01</LOTCOMMENT><MSG></MSG></MSGBODY></AIFMSG>',
    });

    try {
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(sendDummyEqpInput).toHaveBeenCalled());

      expect(sendDummyEqpInput).toHaveBeenCalledWith('LOT-001', '01', 'SLOT');
      expect(vm.comment.value).toBe('SLOT 01');
      expect(vm.waferDialogOpen.value).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('assigns the resolved DIFF machine to selected wafers and includes it in the SLOT comment', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.area.value = 'DIFF';
    vm.createCategory.value = 'SLOT';
    vm.selectedWafers.value = ['LOT-001.01'];
    vm.machineSearchId.value = 'eqp-01';
    sendDummyEqpInfo.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><EQPID>EQP-01</EQPID></MSGBODY></AIFMSG>',
    });
    sendDummyEqpInput.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><LOTCOMMENT>SLOT 01(EQP-01)</LOTCOMMENT></MSGBODY></AIFMSG>',
    });

    try {
      await vm.lookupWaferMachine();

      expect(sendDummyEqpInfo).toHaveBeenCalledWith('EQP-01', 'LOT-001');
      expect(vm.waferMachines.value['LOT-001.01']).toBe('EQP-01');

      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(sendDummyEqpInput).toHaveBeenCalled());
      expect(sendDummyEqpInput).toHaveBeenCalledWith('LOT-001', '01(EQP-01)', 'SLOT');
    } finally {
      wrapper.unmount();
    }
  });

  it('blocks DIFF SLOT submission until every selected wafer has an equipment assignment', () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.area.value = 'DIFF';
    vm.createCategory.value = 'SLOT';
    vm.selectedWafers.value = ['LOT-001.01'];

    try {
      vm.confirmWaferSelection();

      expect(showAlert).toHaveBeenCalledWith(MOVE_IN_UI.alerts.selectMachine, expect.any(String));
      expect(sendDummyEqpInput).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('retains pre-move-in measurement and etch warnings for the result step', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.eqpId.value = 'EQP-001';
    vm.recipeText.value = 'RCP-001';
    sendMoveInLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<NWCOMMENTQTY>0</NWCOMMENTQTY>',
        '<FICDCHMBER>CHAMBER A</FICDCHMBER>',
        '<CUMCYCLE>cycle warning</CUMCYCLE>',
        '<CUMCYCLEQTY>42</CUMCYCLEQTY>',
        '<ETCHREWORKMSG>etch warning</ETCHREWORKMSG>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getLotInfoOk();

      expect(vm.pendingWarnings.value).toEqual({
        ficdChamber: 'CHAMBER A',
        cumulativeCycle: 'cycle warning',
        cumulativeCycleQty: '42',
        etchRework: 'etch warning',
      });
      expect(showConfirm).toHaveBeenCalledWith(
        '선택 RECIPE\nRCP-001\n선택 Run No\nLOT-001\n계속 진행하시겠습니까?',
        expect.any(String),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('maps inspection warnings from the legacy CHECKINSPACTION response', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.operation.value = 'OP-10';
    vm.subOperation.value = 'S2';
    sendCheckInspection.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<MACROMSG>macro warning</MACROMSG>',
        '<SCOPEMSG>scope warning</SCOPEMSG>',
        '<CDMSG>CD point</CDMSG>',
        '<sOvMSG>overlay warning</sOvMSG>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getInspection();

      expect(sendCheckInspection).toHaveBeenCalledWith(
        'LOT-001',
        expect.any(String),
        'DIMVIN',
        'OP-10',
        'S2',
      );
      expect(vm.inspectionWarnings.value).toEqual({
        macro: 'macro warning',
        scope: 'scope warning',
        cd: 'CD point',
        overlay: 'overlay warning',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('shows pre-move inspection warnings with the legacy Korean messages', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<STATUS>WAIT</STATUS>',
        '<STATE>WIP</STATE>',
        '<MEASTYPE>CD</MEASTYPE>',
        '<SAMPLINGMSG>LOT-002</SAMPLINGMSG>',
        '<CHAMBERSLOTLIST>CH-A: 2</CHAMBERSLOTLIST>',
        '<MEASOPERATIONNAME>OP-10</MEASOPERATIONNAME>',
        '<FQCLOTNAME>LOT-FQC</FQCLOTNAME>',
        '<FICDLOT>LOT-FICD</FICDLOT>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getLotInfo();

      expect(showAlert).toHaveBeenCalledWith(
        '동일한 Batch에 검사대상 Lot이 있습니다.\nLOT-002',
        '검사대상',
      );
      expect(showAlert).toHaveBeenCalledWith('CH-A: 2', 'Chamber 호기별 진행 Slot 정보');
      expect(showAlert).toHaveBeenCalledWith(
        'LOT-FQC 은 공정이물 검사 대상 Lot 입니다.',
        '검사대상',
      );
      expect(showAlert).toHaveBeenCalledWith('LOT-FICD 은 FICD검사 대상 Lot 입니다.', '검사대상');
    } finally {
      wrapper.unmount();
    }
  });

  it('waits for the PHOTO inspection notice to close before opening the child screen', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    let resolveNotice!: (result: boolean) => void;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<STATUS>WAIT</STATUS>',
        '<STATE>WIP</STATE>',
        '<AREA>PHOTO</AREA>',
        '<OPTYPE>P</OPTYPE>',
        '<PHOTOTYPE>DI</PHOTOTYPE>',
        '<OPERATION>OP-10</OPERATION>',
        '<ETCMSG>Pending notice</ETCMSG>',
        '<MEASTYPE>UV</MEASTYPE>',
        '<SAMPLINGREASON>Y</SAMPLINGREASON>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });
    showAlert.mockReturnValueOnce(new Promise((resolve) => (resolveNotice = resolve)));

    try {
      const task = vm.getLotInfo();
      await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());

      expect(showAlert).toHaveBeenCalledWith('Pending notice', '에  러');
      expect(routerPush).not.toHaveBeenCalled();
      resolveNotice(true);
      await task;

      expect(routerPush).toHaveBeenCalledWith({
        name: 'move-in-inline',
        params: { lotId: 'LOT-001' },
        query: { lotId: 'LOT-001', operation: 'OP-10' },
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('suppresses the LAMU inspection notice for EPI sampling', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<STATUS>WAIT</STATUS>',
        '<STATE>WIP</STATE>',
        '<MEASTYPE>LAMU</MEASTYPE>',
        '<SAMPLINGREASON>EPI_SAMPLING</SAMPLINGREASON>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getLotInfo();

      expect(showAlert).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('shows post-move inspection results with legacy Korean titles and messages', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.eqpId.value = 'EQP-001';
    vm.pendingWarnings.value = {
      ficdChamber: 'CHAMBER A',
      cumulativeCycle: '누적 cycle',
      cumulativeCycleQty: '42',
      etchRework: 'REWORK LOT',
    };
    vm.inspectionWarnings.value = {
      cd: 'CD-01',
      macro: 'MACRO-01',
      scope: 'SCOPE-01',
      overlay: 'OVERLAY-01',
    };
    sendMoveIn.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });
    sendLotInfoEnd.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });

    try {
      await vm.moveIn();

      expect(showAlert).toHaveBeenCalledWith('CHAMBER A', '측정 CHAMBER 확인');
      expect(showAlert).toHaveBeenCalledWith('누적 cycle', '누적 장수 (42)');
      expect(showAlert).toHaveBeenCalledWith('[CD 측정]\n CD-01', 'CD 측정 POINT');
      expect(showAlert).toHaveBeenCalledWith('▶ Macro 측정 [ MACRO-01 ]', 'Macro 측정 정보');
      expect(showAlert).toHaveBeenCalledWith('SCOPE-01', 'Scope 측정 정보');
      expect(showAlert).toHaveBeenCalledWith('OVERLAY-01', 'Overlay 측정 정보');
      expect(showAlert).toHaveBeenCalledWith('REWORK LOT', 'Etch Rework Lot');
    } finally {
      wrapper.unmount();
    }
  });

  it('waits for the post-move warning to close before ending the LOT flow', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    let resolveNotice!: (result: boolean) => void;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.eqpId.value = 'EQP-001';
    vm.pendingWarnings.value = {
      ficdChamber: 'CHAMBER A',
      cumulativeCycle: '',
      cumulativeCycleQty: '',
      etchRework: '',
    };
    sendMoveIn.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });
    sendLotInfoEnd.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY></MSGBODY></AIFMSG>',
    });
    showAlert.mockReturnValueOnce(new Promise((resolve) => (resolveNotice = resolve)));

    try {
      const task = vm.moveIn();
      await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());

      expect(sendLotInfoEnd).not.toHaveBeenCalled();
      resolveNotice(true);
      await task;

      expect(sendLotInfoEnd).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
    }
  });

  it('maps PROBECARDINFO and PROBECARDVALUE into OD and Z fields for WT', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.probeCard.value = 'PROBE-01';
    vm.eqpId.value = 'EQP-01';
    vm.product.value = 'PRODUCT-01';
    vm.processType.value = 'WT';
    sendProbeCardInfo.mockResolvedValue({
      isSuccessFul: true,
      result:
        '<AIFMSG><MSGBODY><PROBECARDSTATUS>Y</PROBECARDSTATUS><PROBECARDNO>PC-001</PROBECARDNO></MSGBODY></AIFMSG>',
    });
    sendProbeCardValue.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><VALUE_OD>1.25</VALUE_OD><VALUE_Z>2.5</VALUE_Z></MSGBODY></AIFMSG>',
    });

    try {
      await vm.getProbeCardInfo();

      expect(sendProbeCardInfo).toHaveBeenCalledWith('PROBE-01', 'EQP-01');
      expect(sendProbeCardValue).toHaveBeenCalledWith('PROBE-01', 'PRODUCT-01', 'EQP-01');
      expect(vm.probeCardId.value).toBe('PC-001');
      expect(vm.probeOD.value).toBe('1.25');
      expect(vm.probeZ.value).toBe('2.5');
    } finally {
      wrapper.unmount();
    }
  });

  it('maps inline and process-inquire activity results into the parent Move In state', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';

    try {
      vm.applyInlineActivityResult({
        EQPGROUP: 'PHOTO-GROUP',
        EQPID: 'PHOTO-EQP',
        RECIPE: 'PHOTO-RCP',
        COMMENTQTY: '3',
        NRWCMTCOUNT: '1',
        NEST: 'NEST-2',
        ITDENTCODE: 'CED',
        MASKTAG: 'MASK-01',
      });

      expect(vm.standardMachine.value).toBe('PHOTO-GROUP');
      expect(vm.eqpId.value).toBe('PHOTO-EQP');
      expect(vm.recipeText.value).toBe('PHOTO-RCP');
      expect(vm.commentSize.value).toBe('3');
      expect(vm.unreadCommentCount.value).toBe(1);
      expect(vm.comment.value).toBe('NEST : NEST-2');

      sendCheckInspection.mockResolvedValue({
        isSuccessFul: true,
        result: '<AIFMSG><MSGBODY><MACROMSG>macro</MACROMSG></MSGBODY></AIFMSG>',
      });
      const finished = await vm.applyProcessInquireResult({
        CURRENTSTEP: 'VI(OP-20)',
        RECIPE: 'VI-RCP',
        EQPGROUP: 'OLD-GROUP',
        CHANGEEQPGROUP: 'NEW-GROUP',
        PROCESSSTEP: 'VI',
        COMMENTQTY: '5',
        NRWCOMMENTQTY: '2',
        SUBOPERATION: 'S3',
        SCOPESUB: 'Y',
      });

      expect(finished).toBe(false);
      expect(vm.currentOperation.value).toBe('VI(OP-20)');
      expect(vm.standardMachine.value).toBe('NEW-GROUP');
      expect(vm.commentSize.value).toBe('5');
      expect(vm.unreadCommentCount.value).toBe(2);
      expect(vm.subOperation.value).toBe('S3');
      expect(vm.scopeSub.value).toBe('Y');
      expect(vm.inspectionWarnings.value.macro).toBe('macro');
    } finally {
      wrapper.unmount();
    }
  });

  it('opens Move In Inline with the current LOT and operation', () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.operation.value = 'OP-10';

    try {
      vm.openInlineActivity();

      expect(routerPush).toHaveBeenCalledWith({
        name: 'move-in-inline',
        params: { lotId: 'LOT-001' },
        query: { lotId: 'LOT-001', operation: 'OP-10' },
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('opens Inline for PHOTO P lots whose PHOTO type is not NN', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<AREA>PHOTO</AREA>',
        '<OPTYPE>P</OPTYPE>',
        '<PHOTOTYPE>DI</PHOTOTYPE>',
        '<OPERATION>OP-10</OPERATION>',
        '<STATUS>WAIT</STATUS>',
        '<STATE>WIP</STATE>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getLotInfo();

      expect(routerPush).toHaveBeenCalledWith({
        name: 'move-in-inline',
        params: { lotId: 'LOT-001' },
        query: { lotId: 'LOT-001', operation: 'OP-10' },
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('applies the successful Inline result and returns to Move In', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    const equipmentWrapper = document.createElement('div');
    equipmentWrapper.className = 'move-in-field-equipment';
    const equipmentInput = document.createElement('input');
    equipmentWrapper.append(equipmentInput);
    document.body.append(equipmentWrapper);
    const focusSpy = vi.spyOn(equipmentInput, 'focus');

    try {
      await vm.completeInlineActivity({
        eqpGroup: 'PHOTO-GROUP',
        eqpId: 'PHOTO-EQP',
        recipe: 'PHOTO-RCP',
        commentQty: '3',
        nrwCmtCount: '1',
        nest: 'NEST-2',
        identCode: 'CED',
        maskTag: 'MASK-01',
      });

      expect(routerReplace).toHaveBeenCalledWith({
        name: 'move-in',
        params: { lotId: 'LOT-001' },
      });
      expect(vm.standardMachine.value).toBe('PHOTO-GROUP');
      expect(vm.eqpId.value).toBe('PHOTO-EQP');
      expect(vm.recipeText.value).toBe('PHOTO-RCP');
      expect(vm.commentSize.value).toBe('3');
      expect(vm.unreadCommentCount.value).toBe(1);
      expect(vm.comment.value).toBe('NEST : NEST-2');
      expect(vm.identCodeList.value).toBe('CED');
      expect(vm.reticleId.value).toBe('MASK-01');
      expect(focusSpy).toHaveBeenCalledOnce();
    } finally {
      equipmentWrapper.remove();
      wrapper.unmount();
    }
  });

  it('returns from Inline and closes Move In when the child is canceled', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';

    try {
      await vm.cancelInlineActivity();

      expect(routerReplace).toHaveBeenCalledWith({
        name: 'move-in',
        params: { lotId: 'LOT-001' },
      });
      expect(routerBack).toHaveBeenCalledOnce();
    } finally {
      wrapper.unmount();
    }
  });

  it('opens Process Inquire with the legacy lot and skip context for PHOTO non-P lots', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vm.lotId.value = 'LOT-001';
    sendLotInfo.mockResolvedValue({
      isSuccessFul: true,
      result: [
        '<AIFMSG><MSGBODY>',
        '<AREA>PHOTO</AREA>',
        '<OPTYPE>M</OPTYPE>',
        '<PHOTOTYPE>DI</PHOTOTYPE>',
        '<OPERATION>OP-20</OPERATION>',
        '<SUBOPERATION>02</SUBOPERATION>',
        '<PROCESSSTEP>VI</PROCESSSTEP>',
        '<STATUS>WAIT</STATUS>',
        '<STATE>WIP</STATE>',
        '<REWORKSKIPFLAG>Y</REWORKSKIPFLAG>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    });

    try {
      await vm.getLotInfo();

      expect(routerPush).toHaveBeenCalledWith({
        name: 'move-in-process-inquire',
        params: { lotId: 'LOT-001' },
        query: {
          LOTID: 'LOT-001',
          OPERATION: 'OP-20',
          ISSKIP: 'Y',
          REWORKSKIP: 'Y',
        },
      });
      expect(alert).not.toHaveBeenCalledWith(MOVE_IN_UI.alerts.processInquireFlow);
    } finally {
      alert.mockRestore();
      wrapper.unmount();
    }
  });

  it('returns to Move In after Process Inquire cancellation without discarding parent state', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.recipeText.value = 'RCP-01';

    try {
      await vm.closeProcessInquire();

      expect(routerReplace).toHaveBeenCalledWith({
        name: 'move-in',
        params: { lotId: 'LOT-001' },
      });
      expect(vm.recipeText.value).toBe('RCP-01');
    } finally {
      wrapper.unmount();
    }
  });

  it('applies Process Inquire results and exits Move In when FINISH is returned', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';

    try {
      await vm.completeProcessInquire({ FINISH: 'Y' });

      expect(routerReplace).toHaveBeenCalledWith({
        name: 'move-in',
        params: { lotId: 'LOT-001' },
      });
      expect(routerBack).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('applies a Process Inquire context result before returning to the parent route', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    sendCheckInspection.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><MACROMSG>macro</MACROMSG></MSGBODY></AIFMSG>',
    });

    try {
      await vm.completeProcessInquire({
        CURRENTSTEP: 'VI(OP-20)',
        RECIPE: 'RCP-20',
        COMMENTQTY: '3',
        NRWCOMMENTQTY: '1',
      });

      expect(vm.recipeText.value).toBe('RCP-20');
      expect(vm.commentSize.value).toBe('3');
      expect(vm.unreadCommentCount.value).toBe(1);
      expect(vm.inspectionWarnings.value.macro).toBe('macro');
      expect(routerReplace).toHaveBeenCalledWith({
        name: 'move-in',
        params: { lotId: 'LOT-001' },
      });
      expect(routerBack).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('requires ten characters before PQC skip reaches CHECKDICYCLE', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.area.value = 'PQC';
    vm.comment.value = '123456789';
    vm.skipCurrentOperation.value = true;

    try {
      vm.onOK();
      await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());

      expect(showAlert).toHaveBeenCalledWith(
        'PQC공정 SKIP시 Comment를 10자 이상 입력해야 합니다.',
        expect.any(String),
      );
      expect(sendCheckDiCycle).not.toHaveBeenCalled();
      expect(sendLoginUserCheck).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('uses CHECKDICYCLE for a valid skipped submit without requiring equipment login', async () => {
    let vm!: ReturnType<typeof useMoveIn>;
    const Harness = defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    });
    const wrapper = mount(Harness);
    vm.lotId.value = 'LOT-001';
    vm.area.value = 'PQC';
    vm.operation.value = 'OP-10';
    vm.subOperation.value = 'S2';
    vm.comment.value = '1234567890';
    vm.skipCurrentOperation.value = true;
    sendCheckDiCycle.mockResolvedValue({
      isSuccessFul: true,
      result: '<AIFMSG><MSGBODY><DICYCLE>N</DICYCLE></MSGBODY></AIFMSG>',
    });

    try {
      vm.onOK();
      await vi.waitFor(() => expect(sendCheckDiCycle).toHaveBeenCalled());

      expect(sendCheckDiCycle).toHaveBeenCalledWith('LOT-001', expect.any(String), 'OP-10', 'S2');
      await vi.waitFor(() =>
        expect(showConfirm).toHaveBeenCalledWith(
          '이번 공정을 SKIP 하시겠습니까?',
          expect.any(String),
        ),
      );
      expect(sendLoginUserCheck).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });
});
