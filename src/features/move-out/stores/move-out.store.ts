import { defineStore } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { computed, reactive, ref } from 'vue';

import {
  checkLoginUser,
  executeMoveOut,
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchLotInfo,
  fetchMoveOutFqcSampling,
  fetchSlotInfo,
  setProbeCardHistory,
  updateSkipWafer,
} from '../services/move-out.service';
import type {
  MoveOutBayOption,
  MoveOutLotInfo,
  MoveOutSlotInfo,
  MoveOutStockerOption,
} from '../types/move-out.types';
import type { WaferSelectResult } from '../types/wafer-select.types';
import type { WaferSkipResult } from '../types/wafer-skip.types';

export type MoveOutDialogKind = 'info' | 'error' | 'confirm';

export interface MoveOutMessage {
  kind: MoveOutDialogKind;
  title: string;
  message: string;
}

export interface MoveOutOkResult {
  branch: 'single' | 'batch' | 'skip-confirm';
  nextOperation?: string;
}

export interface MoveOutOkOptions {
  skipConfirmed?: boolean;
}

export interface MoveOutInputScopeResult {
  lotId: string;
  logo: string;
  waferList: string;
}

export const useMoveOutStore = defineStore('move-out', () => {
  const lot = ref<MoveOutLotInfo>();
  const isLoading = ref(false);
  const isProcessing = ref(false);
  const okEnabled = ref(false);
  const bayOptions = ref<MoveOutBayOption[]>([]);
  const stockerOptions = ref<MoveOutStockerOption[]>([]);
  const messages = ref<MoveOutMessage[]>([]);
  const slotQuantity = ref('');
  const slotCheckEtch = ref('');
  const createCategoryComment = ref('');
  const pendingInputScopeResult = ref<MoveOutInputScopeResult>();

  const form = reactive({
    comment: '',
    maskLogo: '',
    carry: false,
    nextProcessSkip: false,
    wfInterlockCancel: false,
    selectedBay: '',
    selectedStocker: '',
  });

  const whButtonText = computed(() => {
    if (lot.value?.createCategory === 'COUNT') return 'COUNT';
    if (lot.value?.createCategory === 'SLOT') return 'SLOT';
    return 'W/H';
  });

  const canReadComment = computed(() => Number(lot.value?.display.commentQty || 0) > 0);
  const canOpenBatch = computed(() => Boolean(lot.value?.batchId));
  const canInputScope = computed(() => lot.value?.photoOperType === 'VI');
  const wfInterlockDisabled = computed(() => lot.value?.pqcSkipUser === 'N');

  function pushMessage(kind: MoveOutDialogKind, title: string, message: string): void {
    messages.value.push({ kind, title, message });
  }

  function shiftMessage(): MoveOutMessage | undefined {
    return messages.value.shift();
  }

  function resetFormForLot(nextLot: MoveOutLotInfo): void {
    form.comment = '';
    form.maskLogo = '';
    form.carry = nextLot.batchId !== '';
    form.nextProcessSkip = false;
    form.wfInterlockCancel = false;
    form.selectedBay = nextLot.nextBay;
    form.selectedStocker = nextLot.nextStocker;
    createCategoryComment.value = nextLot.createCategory ? nextLot.lastEventComment : '';
    bayOptions.value = nextLot.nextBay ? [{ label: nextLot.nextBay, value: nextLot.nextBay }] : [];
    stockerOptions.value = nextLot.nextStocker
      ? [{ label: nextLot.nextStocker, value: nextLot.nextStocker }]
      : [];
  }

  async function loadLotInfo(lotId: string): Promise<void> {
    isLoading.value = true;
    messages.value = [];
    try {
      const nextLot = await fetchLotInfo({
        lotId,
        facility: DeviceInfo.FACILITY,
        operatorId: DeviceInfo.OPERATOR_ID,
      });
      lot.value = nextLot;
      okEnabled.value = true;
      resetFormForLot(nextLot);
      applyLotValidation(nextLot);
    } catch (error) {
      okEnabled.value = false;
      pushMessage('error', '에  러', error instanceof Error ? error.message : 'LOTINFO failed.');
    } finally {
      isLoading.value = false;
    }
  }

  function applyLotValidation(current: MoveOutLotInfo): void {
    if (current.etcMsg) pushMessage('info', '정보', current.etcMsg);
    if (current.status === 'WAIT') pushMessage('error', '에  러', '이미 MOVE OUT된 LOT입니다.');
    if (current.state !== 'WIP') {
      pushMessage('error', '에  러', `${current.state} 상태 입니다. MOVE OUT할수 없습니다.`);
      return;
    }
    if (current.holdStatus === 'ONHOLD') {
      pushMessage('error', '에  러', 'HOLD된 LOT입니다. MOVE OUT할수 없습니다.');
      return;
    }
    if (current.remoteCheck === 'Y') {
      okEnabled.value = false;
      pushMessage(
        'error',
        '에  러',
        '매뉴얼 Move Out이 불가한 장치입니다. 자동화 진행 이력을 확인 하세요.',
      );
      return;
    }
    if (current.batchId && current.machineState && current.machineCode) {
      pushMessage(
        'info',
        '장비 DOWN 알림',
        `${current.display.machine} 호기 ${current.machineState} \n(${current.machineCode}) Down 중!.`,
      );
    }
    if (Number(current.nwCommentQty || 0) > 0) {
      pushMessage(
        'info',
        '확  인',
        `읽지 않은 작업성 COMMENT가 [${current.nwCommentQty}]가 있습니다.\n읽은 후 진행 하세요.`,
      );
    }
    if (current.checkSkipWafer === 'N') {
      okEnabled.value = false;
    } else {
      applyLotInfoEtcCheck(current);
    }
    if (current.pcmCheck === 'N') {
      okEnabled.value = false;
      pushMessage(
        'error',
        '에  러',
        'PCM 재작업이 미완료된 Lot 입니다.\n재작업 완료 후 Move Out 하시기 바랍니다.',
      );
      return;
    }
    if (current.mvinWaferCheck) {
      okEnabled.value = false;
      pushMessage('error', '에  러', current.mvinWaferCheck);
      return;
    }
    if (current.btaWarning) pushMessage('info', 'Boat/Tube/APC 누적막 Warning', current.btaWarning);
    if (current.childBatchId) {
      pushMessage(
        'confirm',
        '확  인',
        ' 자 Batch 구성 Lot 입니다.\n 자 Batch Wafer 분리 하셨나요? ',
      );
    }
    if (current.checkGateInspMsg) {
      okEnabled.value = false;
      pushMessage(
        'error',
        'PQC검사 입력 확인',
        `${current.checkGateInspMsg}\nDATA 확인 후 실적 입력 바랍니다.`,
      );
    }
  }

  function applyLotInfoEtcCheck(current: MoveOutLotInfo): void {
    if (current.area === 'ETCH' && current.owner === 'GF3P' && current.createCategory === 'SLOT') {
      const waferCount = current.lastEventComment ? current.lastEventComment.split(',').length : 0;
      const productQuantity = Number(current.productQuantity || 0);
      if (current.checkEtch) okEnabled.value = productQuantity === waferCount;
    }
    if (current.checkInterlock) pushMessage('info', '확  인', current.checkInterlock);
    if (current.lampComment) pushMessage('info', '자주 검사 알림', current.lampComment);
    if (current.thicknessCheck) pushMessage('info', '두께 측정 알림', current.thicknessCheck);
    if (current.aramComment) {
      pushMessage('info', '이상연락 조치내용', current.aramComment);
    } else if (current.holdCodeOut) {
      pushMessage(
        'info',
        'HOLD 해제 COMMENTS',
        `[${current.holdCodeOut}]\n${current.holdCommentOut}`,
      );
    }
  }

  async function enableTransfer(checked: boolean): Promise<void> {
    form.carry = checked;
    if (!checked) return;
    try {
      bayOptions.value = await fetchAreaBayInfo();
    } catch (error) {
      pushMessage(
        'error',
        '에  러',
        error instanceof Error ? error.message : 'AREABAYINFO failed.',
      );
    }
  }

  async function loadStockers(bay: string): Promise<void> {
    form.selectedBay = bay;
    if (!bay) return;
    try {
      stockerOptions.value = await fetchBayStockerInfo(bay);
      if (stockerOptions.value.length === 1) form.selectedStocker = stockerOptions.value[0].value;
    } catch (error) {
      stockerOptions.value = [];
      pushMessage(
        'error',
        '에  러',
        error instanceof Error ? error.message : 'BAYSTOCKERINFO failed.',
      );
    }
  }

  async function prepareWaferSelect(): Promise<MoveOutSlotInfo | undefined> {
    if (!lot.value) return undefined;
    try {
      const slot = await fetchSlotInfo({
        lotId: lot.value.lotId,
        facility: DeviceInfo.FACILITY,
        operatorId: DeviceInfo.OPERATOR_ID,
      });
      slotQuantity.value = slot.quantity;
      slotCheckEtch.value = slot.checkEtch;
      return slot;
    } catch (error) {
      pushMessage('error', '에  러', error instanceof Error ? error.message : 'SLOTINFO failed.');
      return undefined;
    }
  }

  function stripLotPrefix(value: string, lotId: string): string {
    return value
      .split(',')
      .map((item) => item.replace(`${lotId}.`, ''))
      .join(',');
  }

  function applyWaferSelectResult(result: WaferSelectResult): void {
    if (!lot.value) return;
    const current = lot.value;
    if (!current.createCategory) {
      form.comment = `; W/H:#${stripLotPrefix(result.selectedWaferList, current.lotId)}`;
    } else {
      form.comment = result.selectedMachine;
    }
    if (current.createCategory === 'SLOT' && current.area === 'ETCH') {
      const selectedCount = result.selectedMachine ? result.selectedMachine.split(',').length : 0;
      const requiredCount = Number(slotQuantity.value || current.productQuantity || 0);
      if (slotCheckEtch.value && selectedCount !== requiredCount) {
        okEnabled.value = false;
        pushMessage(
          'error',
          'Move Out Interlock',
          'Etch Dummy/Test Lot은 모든 W/F Handling 이후에  Move Out이 가능 합니다. ',
        );
      } else if (slotCheckEtch.value) {
        okEnabled.value = true;
      }
    }
  }

  function applyInputScopeResult(result: MoveOutInputScopeResult): void {
    if (result.waferList) {
      form.comment = `; W/H:#${result.waferList}`;
    }
    if (result.logo) {
      form.maskLogo = result.logo;
    }
  }

  function setPendingInputScopeResult(result: MoveOutInputScopeResult): void {
    pendingInputScopeResult.value = result;
  }

  function consumePendingInputScopeResult(): MoveOutInputScopeResult | undefined {
    const result = pendingInputScopeResult.value;
    pendingInputScopeResult.value = undefined;
    return result;
  }

  async function updateSkipWaferResult(result: WaferSkipResult): Promise<void> {
    if (!lot.value) return;
    try {
      const updateResult = await updateSkipWafer({
        lotId: lot.value.lotId,
        machineName: lot.value.checkSkipWaferMachine,
        recipeName: lot.value.checkSkipWaferRecipe,
        skipWafer: result.skipWafer,
        operatorId: DeviceInfo.OPERATOR_ID,
        skipReason: result.reason,
        minusString: result.minusString,
      });
      if (updateResult.updateFlag === 'Y') {
        okEnabled.value = true;
        pushMessage('info', '확  인', '수량 보정이 완료되었습니다.');
      }
      applyLotInfoEtcCheck(lot.value);
    } catch (error) {
      pushMessage(
        'error',
        '에  러',
        error instanceof Error ? error.message : 'UPDATESKIPWAFER failed.',
      );
    }
  }

  function validateCarry(): boolean {
    if (!form.carry) return true;
    if (!form.selectedBay) {
      pushMessage('error', '에  러', 'BAY를 선택하세요.');
      return false;
    }
    if (!form.selectedStocker) {
      pushMessage('error', '에  러', 'STOCKER를 선택하세요.');
      return false;
    }
    return true;
  }

  async function executeOk(options: MoveOutOkOptions = {}): Promise<MoveOutOkResult | undefined> {
    if (!lot.value || !okEnabled.value) return undefined;
    isProcessing.value = true;
    try {
      const login = await checkLoginUser({
        operatorId: DeviceInfo.OPERATOR_ID,
        eqpId: lot.value.display.machine,
        automotiveFlag: lot.value.automotiveFlag,
      });
      if (login.areaCheck === 'N' || login.areaCheck === '') {
        okEnabled.value = false;
        pushMessage('error', '확  인', '로그인한 사용자가 진행할 수 없는 장비 입니다.');
        return undefined;
      }
      if (form.nextProcessSkip && !options.skipConfirmed) {
        return { branch: 'skip-confirm', nextOperation: lot.value.display.nextOperation };
      }
      if (!validateCarry()) return undefined;
      if (lot.value.batchId) return { branch: 'batch' };

      const result = await executeMoveOut({
        lotId: lot.value.lotId,
        facility: DeviceInfo.FACILITY,
        eqpId: lot.value.display.machine,
        operation: lot.value.operation,
        subOperation: lot.value.subOperation,
        recipe: lot.value.display.recipe,
        opType: lot.value.opType,
        isSkip: form.nextProcessSkip ? 'Y' : 'N',
        operatorId: DeviceInfo.OPERATOR_ID,
        comment: form.comment,
        isCarry: form.carry ? 'Y' : 'N',
        bay: form.selectedBay,
        stocker: form.selectedStocker,
        quantity: lot.value.display.quantity,
        inputMaskLogo: form.maskLogo,
        wfInterlock: form.wfInterlockCancel ? 'Y' : 'N',
      });
      if (result.tanpi) pushMessage('info', '정보', result.tanpi);
      if (result.sampleResult) pushMessage('info', '정보', result.sampleResult);

      const fqc = await fetchMoveOutFqcSampling({
        lotId: lot.value.lotId,
        opType: lot.value.opType,
        eqpId: lot.value.display.machine,
        oper: lot.value.operation,
        subOper: lot.value.subOperation,
      });
      for (const message of [fqc.cycleComment, fqc.recipeComment, fqc.updateCode, fqc.deleteCode]) {
        if (message) pushMessage('info', '확  인', message);
      }
      if (lot.value.processType === 'WT' || lot.value.processType === 'PCM') {
        await setProbeCardHistory({
          lotId: lot.value.lotId,
          facility: DeviceInfo.FACILITY,
          quantity: lot.value.display.quantity,
          machineName: '',
          operation: lot.value.operation,
          subOperation: lot.value.subOperation,
          operationDescription: lot.value.display.currentOperation,
          operatorId: DeviceInfo.OPERATOR_ID,
        });
      }
      return { branch: 'single' };
    } catch (error) {
      okEnabled.value = false;
      pushMessage('error', '에  러', error instanceof Error ? error.message : 'MOVEOUT failed.');
      return undefined;
    } finally {
      isProcessing.value = false;
    }
  }

  return {
    applyInputScopeResult,
    applyWaferSelectResult,
    bayOptions,
    canInputScope,
    canOpenBatch,
    canReadComment,
    createCategoryComment,
    consumePendingInputScopeResult,
    enableTransfer,
    executeOk,
    form,
    isLoading,
    isProcessing,
    loadLotInfo,
    loadStockers,
    lot,
    messages,
    okEnabled,
    prepareWaferSelect,
    setPendingInputScopeResult,
    shiftMessage,
    slotCheckEtch,
    slotQuantity,
    stockerOptions,
    updateSkipWaferResult,
    wfInterlockDisabled,
    whButtonText,
  };
});
