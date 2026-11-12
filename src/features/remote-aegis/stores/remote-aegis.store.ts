import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { computed, reactive, ref } from 'vue';

import { remoteAegisService } from '../services/remote-aegis.service';
import type {
  AegisConfirmDialogState,
  AegisPortStatusKind,
  RemoteAegisFocusTarget,
} from '../types/remote-aegis.types';

export const useRemoteAegisStore = defineStore('remote-aegis', () => {
  const mainStore = useMainStore();

  // Screen Form State
  const machineInput = ref<string>('');
  const lotIdInput = ref<string>('');
  const portOptions = ref<string[]>([]);
  const selectedPort = ref<string>('');
  const portState = ref<string>('');
  const recipeInput = ref<string>('');
  const prodMachineInput = ref<string>('');
  const waferCount = ref<string>('');
  const selectedWaferList = ref<string>('');
  const noticeItems = ref<string[]>([]);

  // Control State
  const isStartEnabled = ref<boolean>(false);
  const isClearPortEnabled = ref<boolean>(true);
  const isLoading = ref<boolean>(false);
  const focusTarget = ref<RemoteAegisFocusTarget>(null);
  const isReturningFromChild = ref<boolean>(false);

  // Internal Legacy State
  const mainEqpId = ref<string>('');
  const mainModel = ref<string>('');
  const searchOperation = ref<string>('');
  const searchSubOperation = ref<string>('');
  const searchProcessStep = ref<string>('');
  const searchOperSequence = ref<string>('');
  const wfProduct = ref<string>('');
  const wfOwnercode = ref<string>('');
  const wfOpercode = ref<string>('');

  // Confirmation Modal State (Promise-based)
  let confirmResolver: ((val: boolean) => void) | null = null;
  const confirmDialog = reactive<AegisConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
    cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
  });

  function askConfirm(options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }): Promise<boolean> {
    confirmDialog.title = options.title ?? COMMON_FIELD.TXTDIALOGTITLE_OK;
    confirmDialog.message = options.message;
    confirmDialog.confirmLabel = options.confirmLabel ?? COMMON_FIELD.POSITIVEBTNSTR;
    confirmDialog.cancelLabel = options.cancelLabel ?? COMMON_FIELD.NEGATIVEBTNSTR;
    confirmDialog.open = true;

    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve;
    });
  }

  function resolveConfirm(value: boolean): void {
    confirmDialog.open = false;
    if (confirmResolver) {
      const resolver = confirmResolver;
      confirmResolver = null;
      resolver(value);
    }
  }

  async function showAlert(title: string, message: string): Promise<void> {
    await okDialog.show(title, message, COMMON_FIELD.BTNOKSTR);
  }

  // Computed Properties
  const noticeText = computed(() => noticeItems.value.join('\n'));

  const portStatusKind = computed<AegisPortStatusKind>(() => {
    switch (portState.value.toUpperCase()) {
      case 'INIT':
        return 'init';
      case 'RUN':
        return 'run';
      case 'PENDING':
        return 'pending';
      case 'READY':
        return 'ready';
      case 'RESERVED':
        return 'reserved';
      case 'COMPLETE':
        return 'complete';
      case 'IDLE':
        return 'idle';
      default:
        return 'none';
    }
  });

  // State Helpers
  function clearEqpInfo(): void {
    portOptions.value = [];
    selectedPort.value = '';
    mainEqpId.value = '';
    mainModel.value = '';
  }

  function clearPortState(): void {
    portState.value = '';
  }

  function resetState(): void {
    machineInput.value = '';
    lotIdInput.value = '';
    portOptions.value = [];
    selectedPort.value = '';
    portState.value = '';
    recipeInput.value = '';
    prodMachineInput.value = '';
    waferCount.value = '';
    selectedWaferList.value = '';
    noticeItems.value = [];
    isStartEnabled.value = false;
    isClearPortEnabled.value = true;
    isLoading.value = false;
    focusTarget.value = null;
    isReturningFromChild.value = false;
    mainEqpId.value = '';
    mainModel.value = '';
    searchOperation.value = '';
    searchSubOperation.value = '';
    searchProcessStep.value = '';
    searchOperSequence.value = '';
    wfProduct.value = '';
    wfOwnercode.value = '';
    wfOpercode.value = '';
    confirmDialog.open = false;
    confirmResolver = null;
  }

  // Business Actions
  async function initScreen(initialEqpId?: string): Promise<void> {
    resetState();
    if (initialEqpId && initialEqpId !== 'NULL' && initialEqpId.trim() !== '') {
      mainEqpId.value = initialEqpId.trim();
      machineInput.value = initialEqpId.trim();
      await setEqpInfo();
    }
  }

  async function setEqpInfo(): Promise<void> {
    clearEqpInfo();
    const rawMachine = machineInput.value.trim();
    if (!rawMachine) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '장비명을 입력하여 주세요.');
      return;
    }

    let pmMsgToAlert = '';
    let isPCountBlocked = false;
    let portsToSet: string[] = [];
    let hasError = false;
    let errorToAlert = '';

    isLoading.value = true;
    try {
      const res = await remoteAegisService.fetchRemoteEqpInfo(rawMachine);
      if (!res.ok || !res.data) {
        hasError = true;
        errorToAlert = res.message;
      } else {
        const { pCount, portName, pmMessage, mainEqpId: fetchedMainEqpId } = res.data;
        mainEqpId.value = fetchedMainEqpId;
        if (pmMessage && pmMessage.trim() !== '') {
          pmMsgToAlert = pmMessage.trim();
        }
        if (pCount === 'N') {
          isPCountBlocked = true;
        } else {
          portsToSet = portName
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
        }
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    if (pmMsgToAlert) {
      await showAlert('PM주기 경고', pmMsgToAlert);
    }

    if (isPCountBlocked) {
      await showAlert(COMMON_FIELD.ERRMSG, '진행중인 LOT이 있어 진행이 불가합니다.');
      return;
    }

    portOptions.value = portsToSet;
    if (portsToSet.length > 0) {
      selectedPort.value = portsToSet[0];
      await setPortState();
    }
  }

  async function setPortState(): Promise<void> {
    clearPortState();
    const port = selectedPort.value;
    if (!port) return;

    isClearPortEnabled.value = false;
    let fetchedState = '';
    let fetchedAck = '';
    let hasError = false;
    let errorToAlert = '';

    isLoading.value = true;
    try {
      const res = await remoteAegisService.fetchMachinePortStatus(machineInput.value.trim(), port);
      if (!res.ok || !res.data) {
        hasError = true;
        errorToAlert = res.message;
      } else {
        fetchedState = res.data.portStateName.trim();
        fetchedAck = res.data.ackMsg.trim();
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    portState.value = fetchedState;

    if (fetchedState === 'RUN' || fetchedState === 'PENDING' || fetchedState === 'RESERVED') {
      isClearPortEnabled.value = true;
      isStartEnabled.value = false;
      await showAlert(
        '장비 MASSAGE',
        '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
      );
      if (fetchedAck) {
        await showAlert('PORT WORNING', fetchedAck);
      }
    } else if (!fetchedState) {
      isStartEnabled.value = false;
      isClearPortEnabled.value = false;
      await showAlert(
        '장비 MASSAGE',
        'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
      );
    } else if (fetchedState === 'READY') {
      isStartEnabled.value = true;
      isClearPortEnabled.value = true;
    } else {
      isStartEnabled.value = false;
      isClearPortEnabled.value = true;
    }
  }

  async function executeClearPort(): Promise<void> {
    const port = selectedPort.value;
    if (!port) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 Port를 먼저 선택하세요.');
      return;
    }

    const confirmed = await askConfirm({
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message: `PORT [${port}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
      confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
      cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
    });
    if (!confirmed) return;

    let hasError = false;
    let errorToAlert = '';
    isLoading.value = true;
    try {
      const res = await remoteAegisService.executeMachinePortClear(mainEqpId.value, port);
      if (!res.ok) {
        hasError = true;
        errorToAlert = res.message;
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    await showAlert('PORT 초기화', '해당 PORT 초기화 명령을 전송하였습니다.');
    await setPortState();
  }

  async function modeChangeLocal(): Promise<void> {
    const confirmed = await askConfirm({
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message: '장비를 LOCAL 모드로 바꾸시겠습니까?',
      confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
      cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
    });
    if (!confirmed) return;

    let hasError = false;
    let errorToAlert = '';
    isLoading.value = true;
    try {
      const targetEqp = machineInput.value.trim();
      const operatorId = mainStore.operatorId || DeviceInfo.OPERATOR_ID;
      const operatorName = mainStore.operatorName || DeviceInfo.OPERATOR_NAME;
      const res = await remoteAegisService.executeAegisModeChange(
        targetEqp,
        'LOCAL',
        operatorId,
        operatorName,
      );
      if (!res.ok) {
        hasError = true;
        errorToAlert = res.message;
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    await showAlert('모드 전환', '모드 전환 명령을 전송하였습니다.');
  }

  async function modeChangeRemote(): Promise<void> {
    const confirmed = await askConfirm({
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message: '장비를 REMOTE 모드로 바꾸시겠습니까?',
      confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
      cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
    });
    if (!confirmed) return;

    let hasError = false;
    let errorToAlert = '';
    isLoading.value = true;
    try {
      const targetEqp = machineInput.value.trim();
      const operatorId = mainStore.operatorId || DeviceInfo.OPERATOR_ID;
      const operatorName = mainStore.operatorName || DeviceInfo.OPERATOR_NAME;
      const res = await remoteAegisService.executeAegisModeChange(
        targetEqp,
        'REMOTE',
        operatorId,
        operatorName,
      );
      if (!res.ok) {
        hasError = true;
        errorToAlert = res.message;
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    await showAlert('모드 전환', '모드 전환 명령을 전송하였습니다.');
  }

  async function setLotInfo(onNavigateCommentList?: () => void): Promise<void> {
    noticeItems.value = [];
    const rawMachine = machineInput.value.trim();
    const rawLot = lotIdInput.value.trim();

    // Exact Legacy Check (RemoteAegisActivity.kt line 305): checks txtMachine.text.isEmpty()
    if (!rawMachine) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOTID를 입력하여 주세요.');
      return;
    }

    let hasError = false;
    let errorToAlert = '';
    let fetchedItems: Awaited<ReturnType<typeof remoteAegisService.fetchAegisLotInfo>>['data'];

    isLoading.value = true;
    try {
      const res = await remoteAegisService.fetchAegisLotInfo(rawLot, rawMachine);
      if (!res.ok || !res.data) {
        hasError = true;
        errorToAlert = res.message;
      } else {
        fetchedItems = res.data;
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    if (!fetchedItems || fetchedItems.length === 0) {
      return;
    }

    const item = fetchedItems[0];

    // Confirmation for RUN state
    if (item.lotProcessState === 'RUN') {
      const proceed = await askConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message: '현재 RUN 중인 LOT 입니다. REMOTE를 진행하겠습니까?',
        confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
        cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
      });
      if (!proceed) {
        lotIdInput.value = '';
        recipeInput.value = '';
        prodMachineInput.value = '';
        focusTarget.value = 'lot';
        return;
      }
    }

    // Confirmation for OnHold state
    if (item.lotHoldState === 'OnHold') {
      const proceed = await askConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message: '현재 HOLD 중인 LOT입니다. REMOTE를 진행하겠습니까?',
        confirmLabel: COMMON_FIELD.POSITIVEBTNSTR,
        cancelLabel: COMMON_FIELD.NEGATIVEBTNSTR,
      });
      if (!proceed) {
        lotIdInput.value = '';
        recipeInput.value = '';
        prodMachineInput.value = '';
        focusTarget.value = 'lot';
        return;
      }
    }

    const operParts = item.operCode.split('-');
    searchOperation.value = operParts[0] || '';
    searchSubOperation.value = operParts[1] || '';
    searchProcessStep.value = item.operDesc;
    searchOperSequence.value = '';

    const newNotices: string[] = [];
    if (item.safeLaunchLot === 'Y') {
      newNotices.push('Automotive Safe Launch 대상 Lot!');
    }
    if (item.inlineSampleMessage) {
      newNotices.push(item.inlineSampleMessage);
    }
    noticeItems.value = newNotices;

    if (item.operDesc.includes('PARTICLE') || item.operDesc.includes('PQC')) {
      prodMachineInput.value = item.machineName;
      recipeInput.value = item.recipe;
      wfOwnercode.value = item.ownerCode;
      wfProduct.value = item.productSpecName;
      wfOpercode.value = item.operCode;
      isStartEnabled.value = true;
    } else {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'LOT이 PARTICLE/PQC 공정이 아닙니다.');
      return;
    }

    // Comment List Check
    let uncheckedCount = 0;
    isLoading.value = true;
    try {
      const facility = mainStore.facility || DeviceInfo.FACILITY;
      const commentRes = await remoteAegisService.fetchCommentList(
        rawLot,
        facility,
        searchOperation.value,
        searchSubOperation.value,
        searchOperSequence.value,
      );
      if (commentRes.ok && commentRes.data) {
        uncheckedCount = commentRes.data.filter(
          (c) => c.isCheck === 'N' && c.trackType === 'MOVEIN',
        ).length;
      }
    } finally {
      isLoading.value = false;
    }

    if (uncheckedCount > 0) {
      const proceed = await askConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message: `미확인 MOVE IN EEN이 ${uncheckedCount}건 있습니다.\nEEN 확인 후 진행해주세요.`,
        confirmLabel: COMMON_FIELD.BTNYESSTR,
        cancelLabel: COMMON_FIELD.BTNNOSTR,
      });
      if (proceed) {
        onNavigateCommentList?.();
      }
    }
  }

  async function executeSelectWafer(): Promise<{
    lotId: string;
    enableWaferList: string;
    fixedCount: number;
    category: string;
    factory: string;
    product: string;
    ownerCode: string;
    operCode: string;
  } | null> {
    const rawLot = lotIdInput.value.trim();

    let waferListStr = '';
    let hasError = false;
    let errorToAlert = '';
    isLoading.value = true;
    try {
      const facility = mainStore.facility || DeviceInfo.FACILITY;
      const res = await remoteAegisService.fetchSlotInfo(rawLot, facility);
      if (!res.ok || !res.data) {
        hasError = true;
        errorToAlert = res.message;
      } else {
        waferListStr = res.data.waferList.trim();
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return null;
    }

    if (!waferListStr) {
      return null;
    }

    const count = waferListStr
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean).length;

    return {
      lotId: rawLot,
      enableWaferList: waferListStr,
      fixedCount: count,
      category: 'ETC',
      factory: 'FABCJ4',
      product: wfProduct.value,
      ownerCode: wfOwnercode.value,
      operCode: wfOpercode.value,
    };
  }

  async function executeStart(onNavigateCommentList?: () => void): Promise<void> {
    const rawLot = lotIdInput.value.trim();
    const rawMachine = machineInput.value.trim();
    const recipe = recipeInput.value.trim();
    const port = selectedPort.value.trim();
    const prodEqp = prodMachineInput.value.trim();
    const slot = selectedWaferList.value.trim();
    const facility = mainStore.facility || DeviceInfo.FACILITY;

    // Pre-start check for MOVEIN EEN comments
    let uncheckedCount = 0;
    let commentParseError = false;
    isLoading.value = true;
    try {
      const commentRes = await remoteAegisService.fetchCommentList(
        rawLot,
        facility,
        searchOperation.value,
        searchSubOperation.value,
        searchOperSequence.value,
      );
      if (commentRes.ok && commentRes.data) {
        if (commentRes.parseError) {
          // Android: getMessageBodyList throws JSONException → executeStart never sends START
          commentParseError = true;
        } else {
          uncheckedCount = commentRes.data.filter(
            (c) => c.isCheck === 'N' && c.trackType === 'MOVEIN',
          ).length;
        }
      }
    } finally {
      isLoading.value = false;
    }

    if (commentParseError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'COMMENT 정보를 가져올 수 없습니다.');
      return;
    }

    if (uncheckedCount > 0) {
      const proceed = await askConfirm({
        title: COMMON_FIELD.TXTDIALOGTITLE_OK,
        message: `미확인 MOVE IN EEN이 ${uncheckedCount}건 있습니다.\nEEN 확인 후 진행해주세요.`,
        confirmLabel: COMMON_FIELD.BTNYESSTR,
        cancelLabel: COMMON_FIELD.BTNNOSTR,
      });
      if (proceed) {
        onNavigateCommentList?.();
      }
      return;
    }

    let hasError = false;
    let errorToAlert = '';
    isLoading.value = true;
    try {
      const operatorId = mainStore.operatorId || DeviceInfo.OPERATOR_ID;
      const operatorName = mainStore.operatorName || DeviceInfo.OPERATOR_NAME;
      const res = await remoteAegisService.executeAegisRemoteStart({
        machineName: rawMachine,
        recipe,
        portName: port,
        runNo: rawLot,
        prodEqp,
        slot,
        userId: operatorId,
        userName: operatorName,
      });
      if (!res.ok) {
        hasError = true;
        errorToAlert = res.message;
      }
    } finally {
      isLoading.value = false;
    }

    if (hasError) {
      await showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorToAlert);
      return;
    }

    await showAlert('전송 성공', '성공적으로 START 명령을 전송하였습니다.');
    portState.value = 'PENDING';
    lotIdInput.value = '';
  }

  return {
    // State
    machineInput,
    lotIdInput,
    portOptions,
    selectedPort,
    portState,
    recipeInput,
    prodMachineInput,
    waferCount,
    selectedWaferList,
    noticeItems,
    isStartEnabled,
    isClearPortEnabled,
    isLoading,
    focusTarget,
    isReturningFromChild,
    mainEqpId,
    mainModel,
    searchOperation,
    searchSubOperation,
    searchProcessStep,
    searchOperSequence,
    wfProduct,
    wfOwnercode,
    wfOpercode,
    confirmDialog,

    // Computed
    noticeText,
    portStatusKind,

    // Actions
    resetState,
    clearEqpInfo,
    clearPortState,
    initScreen,
    setEqpInfo,
    setPortState,
    executeClearPort,
    modeChangeLocal,
    modeChangeRemote,
    setLotInfo,
    executeSelectWafer,
    executeStart,
    askConfirm,
    resolveConfirm,
    showAlert,
  };
});
