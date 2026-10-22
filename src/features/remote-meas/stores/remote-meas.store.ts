import { defineStore } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, ref } from 'vue';

import { remoteMeasService } from '../services/remote-meas.service';
import type {
  MeasFlag,
  PortStatusKind,
  RemoteMeasLotInfo,
  RemoteMeasStartPayload,
} from '../types/remote-meas.types';

export const useRemoteMeasStore = defineStore('remote-meas', () => {
  const mainStore = useMainStore();

  // Core Lot State
  const lotId = ref('');
  const lotInfo = ref<RemoteMeasLotInfo | null>(null);

  // Equipment & Port State
  const superEqpId = ref('');
  const procEqpId = ref('');
  const eqpArea = ref('');
  const eqpType = ref('');
  const recipeName = ref('');
  const selectedPort = ref('');
  const portOptions = ref<Array<{ label: string; value: string }>>([]);
  const portState = ref<PortStatusKind>('');
  const portLotName = ref('');

  // Measurement Specific Fields
  const selectedFlag = ref<MeasFlag | ''>('T');
  const flagOptions = ref<Array<{ label: string; value: MeasFlag }>>([
    { label: 'P', value: 'P' },
    { label: 'T', value: 'T' },
    { label: 'E', value: 'E' },
  ]);
  const prodMachine = ref('');
  const selectedWaferList = ref('');
  const waferCount = ref(0);
  const exposure = ref(false);

  // Field enablement
  const isStartBtnEnabled = ref(false);
  const isClearPortEnabled = ref(false);
  const isReadCommentEnabled = ref(false);
  const isMachineDisabled = ref(false);
  const isPortDisabled = ref(false);
  const isLoading = ref(false);

  // Modals & Dialogs
  const alertDialog = ref<{
    open: boolean;
    title: string;
    message: string;
    isAlarm?: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    isAlarm: false,
  });

  const confirmDialog = ref<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const recipeDialog = ref<{
    open: boolean;
    recipeList: string;
    lotNo: string;
  }>({
    open: false,
    recipeList: '',
    lotNo: '',
  });

  // Computed
  const portStatusKind = computed<PortStatusKind>(() => {
    const raw = (portState.value || '').toUpperCase();
    if (raw === 'RUN') return 'RUN';
    if (raw === 'PENDING') return 'PENDING';
    if (raw === 'READY') return 'READY';
    if (raw === 'RESERVED') return 'RESERVED';
    if (raw === 'COMPLETE') return 'COMPLETE';
    if (raw === 'IDLE') return 'IDLE';
    return '';
  });

  // Dialog helpers
  function showAlert(title: string, message: string, isAlarm = false): void {
    alertDialog.value = {
      open: true,
      title,
      message,
      isAlarm,
    };
  }

  function closeAlert(): void {
    alertDialog.value.open = false;
  }

  function showConfirm(params: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }): void {
    confirmDialog.value = {
      open: true,
      title: params.title,
      message: params.message,
      confirmText: params.confirmText || COMMON_FIELD.BTNOKSTR,
      cancelText: params.cancelText || COMMON_FIELD.NEGATIVEBTNSTR,
      onConfirm: params.onConfirm,
      onCancel: params.onCancel,
    };
  }

  function closeConfirm(): void {
    confirmDialog.value.open = false;
  }

  function resetState(): void {
    lotId.value = '';
    lotInfo.value = null;
    superEqpId.value = '';
    procEqpId.value = '';
    eqpArea.value = '';
    eqpType.value = '';
    recipeName.value = '';
    selectedPort.value = '';
    portOptions.value = [];
    portState.value = '';
    portLotName.value = '';
    selectedFlag.value = 'T';
    prodMachine.value = '';
    selectedWaferList.value = '';
    waferCount.value = 0;
    isStartBtnEnabled.value = false;
    isClearPortEnabled.value = false;
    isReadCommentEnabled.value = false;
    isMachineDisabled.value = false;
    isPortDisabled.value = false;
    isLoading.value = false;
  }

  // Initialize Screen
  async function initScreen(initialLotId?: string): Promise<void> {
    resetState();
    if (initialLotId && initialLotId.trim().length > 0) {
      const cleanLot = initialLotId.trim();
      lotId.value = cleanLot;
      await fetchLotDetails(cleanLot);
    }
  }

  // Fetch LOT Info
  async function fetchLotDetails(targetLotId: string): Promise<boolean> {
    isLoading.value = true;
    try {
      const res = await remoteMeasService.fetchLotInfo(targetLotId, mainStore.facility || 'FAB2');

      if (!res.ok || !res.data) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'LOT 조회 실패');
        return false;
      }

      const info = res.data;
      lotInfo.value = info;

      // Legacy Validation Rules (RemoteMeasActivity.kt lines 464-512)
      if (info.status === 'RUN') {
        isMachineDisabled.value = true;
        isStartBtnEnabled.value = false;
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          '이미 MOVE IN된 LOT입니다. 자동화 진행이 불가합니다.',
        );
        return false;
      }

      if (info.state !== 'WIP') {
        isMachineDisabled.value = true;
        isStartBtnEnabled.value = false;
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          `${info.state} 상태 입니다. 자동화 진행이 불가합니다.`,
        );
        return false;
      }

      if (info.holdStatus === 'ONHOLD') {
        isMachineDisabled.value = true;
        isStartBtnEnabled.value = false;
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
        return false;
      }

      if (info.area === 'PHOTO') {
        isMachineDisabled.value = true;
        isStartBtnEnabled.value = false;
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          'PHOTO 계측진행 LOT입니다. 계측 자동화 진행이 불가합니다.',
        );
        return false;
      }

      if (info.area === 'IMP') {
        isMachineDisabled.value = true;
        isStartBtnEnabled.value = false;
        showAlert(
          COMMON_FIELD.TXTDIALOGTITLE_ERROR,
          'IMP 진행 LOT입니다. IMP 자동화기능을 이용해 주세요.',
        );
        return false;
      }

      isMachineDisabled.value = false;

      // Pre-assigned recipe
      if (info.changeRecipe && info.changeRecipe.trim() !== '') {
        recipeName.value = info.changeRecipe;
      } else if (info.recipe && info.recipe.trim() !== '') {
        recipeName.value = info.recipe;
      }

      // Ox Machine -> Product Machine (RemoteMeasActivity.kt line 529)
      prodMachine.value = info.oxMachine || '';

      // Read comment button state
      isReadCommentEnabled.value = (info.commentQty || 0) > 0;
      isStartBtnEnabled.value = true;

      // Alerts for informational messages
      if (info.etcMsg && info.etcMsg.trim() !== '') {
        showAlert('정보', info.etcMsg);
      }

      if (info.nwCommentQty > 0) {
        showAlert(
          '정보',
          `읽지 않은 작업성 COMMENT가 [${info.nwCommentQty}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      // Reserved user assignment check
      if (info.lotResUser && info.lotResUser.trim() !== '') {
        procEqpId.value = info.machineName;
        isMachineDisabled.value = true;
        isPortDisabled.value = true;
        isStartBtnEnabled.value = false;

        await fetchEqpInfo(info.machineName);

        if (info.portName && info.portName.trim() !== '') {
          selectedPort.value = info.portName;
          await fetchPortStatus();
        }
      }

      return true;
    } catch (err) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Clear Equipment & Port Information (RemoteMeasActivity.kt lines 604-612)
  function clearMachineInfo(): void {
    superEqpId.value = '';
    eqpArea.value = '';
    eqpType.value = '';
    recipeName.value = '';
    selectedPort.value = '';
    portOptions.value = [];
    portState.value = '';
    portLotName.value = '';
  }

  // Fetch Equipment Info (Legacy getMachineInfo RemoteMeasActivity.kt lines 614-715)
  async function getMachineInfo(machineInput: string): Promise<boolean> {
    if (!machineInput || machineInput.trim() === '') {
      return false;
    }

    const cleanEqp = machineInput.trim();
    clearMachineInfo();

    const area = lotInfo.value?.area || '';
    const opType = lotInfo.value?.opType || '';

    // Legacy line 617: if (searchArea == "PHOTO" && searchOpType == "P" && exposure)
    if (area === 'PHOTO' && opType === 'P' && exposure.value) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.',
      );
    }

    isClearPortEnabled.value = false;

    if (opType === 'M') {
      isLoading.value = true;
      try {
        const res = await remoteMeasService.fetchEqpInfo({
          lotId: lotId.value,
          operation: lotInfo.value?.operation || '',
          subOperation: lotInfo.value?.subOperation || '',
          product: lotInfo.value?.product || '',
          eqpId: cleanEqp,
          opType,
          facility: mainStore.facility || 'FAB2',
        });

        if (!res.ok || !res.data) {
          showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || '장비 조회 실패');
          superEqpId.value = '';
          eqpArea.value = '';
          eqpType.value = '';
          procEqpId.value = '';
          return false;
        }

        const eqp = res.data;
        procEqpId.value = eqp.procEqpId || '';
        superEqpId.value = eqp.mainEqpId || '';
        eqpArea.value = eqp.eqpArea;
        eqpType.value = eqp.eqpType;
        recipeName.value = eqp.recipeName;

        // PM Warning Check (RemoteMeasActivity.kt line 654)
        if (eqp.pmMessage && eqp.pmMessage.trim() !== '') {
          showAlert('PM주기 경고', eqp.pmMessage);
        }

        // Port options list (RemoteMeasActivity.kt line 667)
        if (eqp.portName) {
          const ports = eqp.portName
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
          portOptions.value = ports.map((p) => ({ label: p, value: p }));
          if (ports.length > 0) {
            selectedPort.value = ports[0];
          }
        } else {
          portOptions.value = [];
          selectedPort.value = '';
        }

        // Auto Flag Selection: Check last 2 chars of Recipe (RemoteMeasActivity.kt line 676)
        const rcp = eqp.recipeName || '';
        if (rcp.length >= 2 && rcp.slice(-2).toUpperCase() === 'BF') {
          selectedFlag.value = 'P';
        } else {
          selectedFlag.value = 'T';
        }

        // Fetch Port status if port is selected
        if (selectedPort.value) {
          await fetchPortStatus();
        }

        return true;
      } catch (err) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
        procEqpId.value = '';
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    return false;
  }

  // Backward compatibility alias
  const fetchEqpInfo = getMachineInfo;

  // Fetch Port Status
  async function fetchPortStatus(): Promise<void> {
    if (!selectedPort.value) return;

    isLoading.value = true;
    isClearPortEnabled.value = false;

    try {
      const targetEqp = superEqpId.value || procEqpId.value;
      const res = await remoteMeasService.fetchPortStatus(targetEqp, selectedPort.value);

      if (!res.ok || !res.data) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || '포트 상태 조회 실패');
        return;
      }

      const status = res.data;
      const rawState = (status.portStateName || '').toUpperCase() as PortStatusKind;
      portState.value = rawState;
      portLotName.value = status.portLotName || '';

      if (rawState === 'RUN' || rawState === 'PENDING' || rawState === 'RESERVED') {
        showAlert(
          '장비 MASSAGE',
          '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
        );
        isClearPortEnabled.value = true;
        isStartBtnEnabled.value = false;

        if (lotId.value === status.portLotName) {
          isClearPortEnabled.value = true;
        }

        if (status.ackMsg && status.ackMsg.trim() !== '') {
          showAlert('PORT WORNING', status.ackMsg);
        }
      } else if (!rawState) {
        showAlert('장비 MASSAGE', 'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.');
        isClearPortEnabled.value = false;
        isStartBtnEnabled.value = false;
      } else {
        isClearPortEnabled.value = false;
        isStartBtnEnabled.value = true;
      }
    } catch (err) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
    } finally {
      isLoading.value = false;
    }
  }

  // Clear Port (RemoteMeasActivity.kt lines 180-206)
  function requestClearPort(): void {
    void executeClearPort();
  }

  async function executeClearPort(): Promise<void> {
    if (!selectedPort.value) return;

    isLoading.value = true;
    try {
      const targetEqp = superEqpId.value || procEqpId.value;
      const res = await remoteMeasService.clearPort(targetEqp, selectedPort.value);

      if (res.ok) {
        showAlert('DOOR OPEN', '해당 PORT 초기화 명령을 전송하였습니다.');
        await fetchPortStatus();
      } else {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || '초기화 실패');
      }
    } catch (err) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
    } finally {
      isLoading.value = false;
    }
  }

  // Check Comment before Start (RemoteMeasActivity.kt lines 784-818)
  async function checkComment(): Promise<boolean> {
    isLoading.value = true;
    try {
      const res = await remoteMeasService.fetchLotInfo(lotId.value, mainStore.facility || 'FAB2');

      if (!res.ok) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || 'LOT 조회 실패');
        return false;
      }

      if (res.data) {
        const nwQty = res.data.nwCommentQty || 0;
        if (nwQty > 0) {
          showAlert(
            COMMON_FIELD.TXTDIALOGTITLE_ERROR,
            `읽지 않은 작업성 COMMENT가 [${nwQty}]가 있습니다.\n읽은후 진행하세요.`,
          );
          return false;
        }
      }

      return true;
    } catch (err) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Pre-start validation & start modal opening (RemoteMeasActivity.kt lines 717-782)
  async function validateAndStart(): Promise<boolean> {
    if (!procEqpId.value || procEqpId.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행장비를 입력하세요.');
      return false;
    }

    if (!selectedPort.value || selectedPort.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 Port를 선택하세요.');
      return false;
    }

    if (!selectedWaferList.value || selectedWaferList.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행 WF를 선택하세요.');
      return false;
    }

    if (!selectedFlag.value || selectedFlag.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '계측 FLAG를 선택하세요.');
      return false;
    }

    if (!prodMachine.value || prodMachine.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '생산 장비명을 입력하세요.');
      return false;
    }

    if (!recipeName.value || recipeName.value.trim() === '') {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '진행Rcp를 선택하세요.');
      return false;
    }

    // Comment recheck before launch (RemoteMeasActivity.kt lines 773-774)
    const commentOk = await checkComment();
    if (!commentOk) {
      return false;
    }

    // Open Recipe Confirmation Modal (RemoteMeasActivity.kt lines 776-780)
    recipeDialog.value = {
      open: true,
      recipeList: recipeName.value,
      lotNo: '',
    };

    return true;
  }

  // Submit Remote Start execution
  async function submitRemoteStart(onSuccess?: () => void): Promise<boolean> {
    const targetEqp = superEqpId.value || procEqpId.value;
    const op = lotInfo.value ? `${lotInfo.value.operation}-${lotInfo.value.subOperation}` : '';

    const payload: RemoteMeasStartPayload = {
      machineName: targetEqp,
      machineType: eqpType.value,
      lotName: lotId.value,
      portName: selectedPort.value,
      recipeName: recipeName.value,
      procQty: String(waferCount.value),
      measFlag: selectedFlag.value || 'T',
      prodMachine: prodMachine.value,
      reworkFlag: lotInfo.value?.reworkFlag || '',
      eventUser: mainStore.operatorName || 'OPERATOR',
      wfList: selectedWaferList.value,
      product: lotInfo.value?.product || '',
      operation: op,
    };

    isLoading.value = true;
    try {
      const res = await remoteMeasService.startRemoteMeas(payload);

      if (res.ok) {
        recipeDialog.value.open = false;
        if (onSuccess) {
          onSuccess();
        }
        return true;
      } else {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, res.message || '시작 처리 실패');
        return false;
      }
    } catch (err) {
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, String(err));
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    alertDialog,
    checkComment,
    clearMachineInfo,
    closeAlert,
    closeConfirm,
    confirmDialog,
    eqpArea,
    eqpType,
    executeClearPort,
    exposure,
    fetchEqpInfo,
    fetchLotDetails,
    fetchPortStatus,
    flagOptions,
    getMachineInfo,
    initScreen,
    isClearPortEnabled,
    isLoading,
    isMachineDisabled,
    isPortDisabled,
    isReadCommentEnabled,
    isStartBtnEnabled,
    lotId,
    lotInfo,
    portLotName,
    portOptions,
    portState,
    portStatusKind,
    procEqpId,
    prodMachine,
    recipeDialog,
    recipeName,
    requestClearPort,
    resetState,
    selectedFlag,
    selectedPort,
    selectedWaferList,
    showAlert,
    showConfirm,
    submitRemoteStart,
    superEqpId,
    validateAndStart,
    waferCount,
  };
});
