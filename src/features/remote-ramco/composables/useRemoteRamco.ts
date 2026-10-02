import { computed, ref, shallowRef } from 'vue';

import { COMMON_FIELD } from '../../../constants/common-strings';
import { getRemoteRamcoApi } from '../services/remote-ramco.service';
import type {
  LotInfoRequest,
  LotInfoResponse,
  RecipeInfoAshRequest,
  RecipeInfoRequest,
  RemoteRamcoApi,
  WetRemoteEqpInfoResponse,
} from '../types/remote-ramco.types';

export interface RemoteRamcoCommentPayload {
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  OPERSEQUENCE: string;
}

export interface RemoteRamcoOptions {
  api?: RemoteRamcoApi;
  facility: string;
  operatorId: string;
  initialLotId?: string;
  onOpenComment: (payload: RemoteRamcoCommentPayload) => void;
  onCancel: () => void;
  onCompleted: () => void;
}

export interface RemoteLotDetails {
  lotId: string;
  commentQty: string;
  product: string;
  operation: string;
  quantity: string;
  operationCode: string;
  subOperation: string;
  processStep: string;
  opType: string;
  operSequence: string;
  nwCommentQty: string;
}

const emptyLot = (): RemoteLotDetails => ({
  lotId: '',
  commentQty: '',
  product: '',
  operation: '',
  quantity: '',
  operationCode: '',
  subOperation: '',
  processStep: '',
  opType: '',
  operSequence: '',
  nwCommentQty: '',
});

export function useRemoteRamco(options: RemoteRamcoOptions) {
  const api = shallowRef(options.api ?? getRemoteRamcoApi());
  const equipmentInput = ref('');
  const rearLotInput = ref('');
  const equipment = ref<WetRemoteEqpInfoResponse>();
  const frontLot = ref<RemoteLotDetails>(emptyLot());
  const rearLot = ref<RemoteLotDetails>(emptyLot());
  const recipes = ref<string[]>([]);
  const selectedRecipe = ref('');
  const ports = ref<string[]>([]);
  const selectedPort = ref('');
  const portState = ref('');
  const portAck = ref('');
  const loading = ref(false);
  const processing = ref(false);
  const rearLotEnabled = ref(false);
  const clearPortEnabled = ref(false);
  const startEnabled = ref(false);
  const dialog = ref<{
    title: string;
    message: string;
    kind: 'info' | 'confirm';
    intent?: 'recipe' | 'action';
  }>();
  const pendingConfirmation = ref<((confirmed: boolean) => void) | undefined>();

  const equipmentType = computed(() => equipment.value?.EQPTYPE ?? '');
  const isUltima3 = computed(() => equipmentType.value === 'ULTIMA3');
  const isRam8500 = computed(() => equipmentType.value === 'RAM8500z');
  const isPortVisible = computed(
    () => isUltima3.value || (isRam8500.value && ports.value.length > 0),
  );
  const isRunningRecipeVisible = computed(() => !isUltima3.value && !!equipment.value?.INGRCP);
  const isDualRecipeVisible = computed(() => isUltima3.value);
  const canReadFrontComment = computed(() => !!frontLot.value.operation);
  const canReadRearComment = computed(() => !!rearLot.value.operation);
  const isStartEnabled = computed(() => startEnabled.value && !processing.value);

  async function lookupEquipment(): Promise<void> {
    const eqpId = equipmentInput.value.trim().toUpperCase();
    if (!eqpId) {
      showInfo('장비명을 입력하여 주세요.');
      return;
    }

    clearEquipmentDetails();
    equipmentInput.value = eqpId;
    loading.value = true;
    try {
      const result = await api.value.fetchEquipmentInfo({ EQPID: normalizeEquipmentId(eqpId) });
      if (!result.ok) {
        rearLotEnabled.value = false;
        showInfo(result.message);
        return;
      }

      equipment.value = result.data;
      if (result.data.PMMESSAGE)
        showInfo(result.data.PMMESSAGE, COMMON_FIELD.TXTDIALOGTITLE_WARNING);
      const portNames = splitList(result.data.PORTNAME);
      ports.value = portNames;
      if (isUltima3.value || (isRam8500.value && portNames.length > 0)) {
        selectedPort.value = portNames[0] ?? '';
      }
      await loadRecipe(frontLot.value);

      if (isUltima3.value) {
        selectedPort.value =
          portNames.find((port) => port === normalizeScrubber(eqpId)) ?? portNames[0] ?? '';
        if (result.data.RECOMM3) showInfo(result.data.RECOMM3, '추천');
      } else if (isRam8500.value && portNames.length > 0) {
        selectedPort.value = portNames[0] ?? '';
      }

      if (result.data.PCOUNT === 'N') {
        startEnabled.value = false;
        showInfo('진행중인 LOT이 있어 진행이 불가합니다.');
        return;
      }

      if ((isUltima3.value || (isRam8500.value && portNames.length > 0)) && selectedPort.value) {
        await refreshPortState();
      }
    } catch (error) {
      showInfo(errorMessage(error));
      rearLotEnabled.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function searchFrontLot(lotId: string): Promise<void> {
    const normalized = lotId.trim().toUpperCase();
    if (!normalized) {
      showInfo('LOT ID를 입력하세요');
      return;
    }
    if (normalized === rearLotInput.value.trim().toUpperCase()) {
      clearLot(frontLot);
      showInfo('동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.');
      return;
    }
    await lookupLot('front', normalized);
  }

  async function searchRearLot(): Promise<void> {
    clearLot(rearLot);
    const lotId = rearLotInput.value.trim().toUpperCase();
    if (!frontLot.value.lotId) {
      showInfo('FRONT 진행 LOT 부터 순서대로 조회하시기 바랍니다.');
      return;
    }
    if (!lotId) {
      showInfo('LOT ID를 입력하세요');
      return;
    }
    if (lotId === frontLot.value.lotId.toUpperCase()) {
      showInfo('동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.');
      return;
    }
    await lookupLot('rear', lotId);
  }

  async function lookupLot(side: 'front' | 'rear', lotId: string): Promise<void> {
    const target = side === 'front' ? frontLot : rearLot;
    target.value = emptyLot();
    target.value.lotId = lotId;
    loading.value = true;
    try {
      const request: LotInfoRequest = { TYPE: 'MVIN', LOTID: lotId, FACILITY: options.facility };
      const result = await api.value.fetchLotInfo(request);
      if (!result.ok) {
        showInfo(result.message);
        return;
      }

      const validation = validateLot(result.data);
      if (validation) {
        showInfo(validation);
        return;
      }

      target.value = mapLot(lotId, result.data);
      rearLotEnabled.value = true;
      if (!isRam8500.value) startEnabled.value = true;

      const unreadCount = parseCount(result.data.NWCOMMENTQTY);
      if (unreadCount > 0) {
        showInfo(
          `읽지 않은 작업성 COMMENT가 [${result.data.NWCOMMENTQTY}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      if (side === 'rear' && !(await checkRearRecipe(target.value))) {
        target.value = emptyLot();
        startEnabled.value = false;
        return;
      }
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function loadRecipe(lot: RemoteLotDetails): Promise<void> {
    const request: RecipeInfoRequest | RecipeInfoAshRequest = {
      ISPHOTO: 'N',
      LOTID: lot.lotId,
      OPERATION: lot.operationCode,
      SUBOPERATION: lot.subOperation,
      PRODUCT: lot.product.split('(')[0]?.trim() ?? '',
      EQPID: equipment.value?.MAINEQPID ?? '',
      OPTYPE: lot.opType,
      FACILITY: options.facility,
      CHMEQPID: equipmentInput.value,
    };
    const result = await api.value.fetchRecipeInfo(request);
    if (!result.ok) {
      showInfo(result.message);
      return;
    }
    if (result.data.POP_MSG) showInfo(result.data.POP_MSG, COMMON_FIELD.TXTDIALOGTITLE_WARNING);
    recipes.value = parseRecipes(result.data.RECIPE ?? '', equipmentType.value);
    selectedRecipe.value = recipes.value[0] ?? '';
    rearLotEnabled.value = true;
    if (!isRam8500.value) startEnabled.value = true;
    if (result.data.QTIME_FLAG) showInfo('Q-Time 초과 대상 Lot 입니다', 'Q-Time Over');
    else if (result.data.QTIME_FLAG_W)
      showInfo('Q-Time 2hr 이내 근접 Lot 입니다', COMMON_FIELD.TXTDIALOGTITLE_WARNING);
  }

  async function checkRearRecipe(lot: RemoteLotDetails): Promise<boolean> {
    const request: RecipeInfoRequest = {
      ISPHOTO: 'N',
      LOTID: lot.lotId,
      OPERATION: lot.operationCode,
      SUBOPERATION: lot.subOperation,
      PRODUCT: lot.product.split('(')[0]?.trim() ?? '',
      EQPID: equipment.value?.MAINEQPID ?? '',
      OPTYPE: lot.opType,
      FACILITY: options.facility,
    };
    const result = await api.value.fetchRecipeInfo(request);
    if (!result.ok) {
      showInfo(result.message);
      return false;
    }
    const expectedRecipe = parseRecipes(result.data.RECIPE ?? '', equipmentType.value)[0] ?? '';
    if (!selectedRecipe.value.includes(':') && selectedRecipe.value !== expectedRecipe) {
      showInfo('RECIPE가 다른 LOT입니다.');
      return false;
    }
    if (result.data.QTIME_FLAG) showInfo('Q-Time 초과 대상 Lot 입니다', 'Q-Time Over');
    else if (result.data.QTIME_FLAG_W)
      showInfo('Q-Time 2hr 이내 근접 Lot 입니다', COMMON_FIELD.TXTDIALOGTITLE_WARNING);
    return true;
  }

  async function refreshPortState(): Promise<void> {
    if (!selectedPort.value || !equipment.value) return;
    portState.value = '';
    clearPortEnabled.value = false;
    const eqpId = isUltima3.value ? (equipment.value.MAINEQPID ?? '') : equipmentInput.value;
    const result = await api.value.fetchPortStatus({
      EQPID: eqpId,
      PORTNAME: selectedPort.value,
      LOTID: frontLot.value.lotId,
      RECIPE: '',
    });
    if (!result.ok) {
      startEnabled.value = false;
      showInfo(result.message);
      return;
    }
    portState.value = result.data.PORTSTATENAME ?? '';
    portAck.value = result.data.ACKMSG ?? '';
    if (isUltima3.value) {
      if (portState.value === 'RUN' || portState.value === 'RESERVED') {
        clearPortEnabled.value = true;
        startEnabled.value = false;
        showInfo(
          '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
          '장비 MESSAGE',
        );
        if (portAck.value) showInfo(portAck.value, COMMON_FIELD.TXTDIALOGTITLE_WARNING);
      } else if (!portState.value) {
        clearPortEnabled.value = true;
        startEnabled.value = false;
        showInfo('PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.', '장비 MESSAGE');
      } else {
        startEnabled.value = true;
      }
    } else if (isRam8500.value) {
      if (portState.value === 'READY') {
        startEnabled.value = true;
      } else {
        startEnabled.value = false;
        showInfo(
          portState.value
            ? '해당 PORT가 작업 예약 불가.\nPORT상태를 확인하세요.'
            : 'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
          '장비 MESSAGE',
        );
        if (portAck.value) showInfo(portAck.value, COMMON_FIELD.TXTDIALOGTITLE_WARNING);
      }
    }
  }

  async function clearPort(): Promise<void> {
    if (!selectedPort.value) {
      showInfo('진행 Port를 먼저 선택하세요.');
      return;
    }
    const confirmed = await confirm(
      `PORT [${selectedPort.value}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
    );
    if (!confirmed) return;
    loading.value = true;
    try {
      const result = await api.value.clearPort({
        MACHINENAME: equipment.value?.MAINEQPID ?? '',
        PORTNAME: selectedPort.value,
      });
      if (!result.ok) {
        showInfo(result.message);
        return;
      }
      showInfo('해당 PORT 초기화 명령을 전송하였습니다.', 'PORT 초기화');
      await refreshPortState();
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function deleteJobs(): Promise<void> {
    if (!equipmentInput.value.trim()) {
      showInfo('장비명를 선택하여 주세요.');
      return;
    }
    if (isUltima3.value) return;
    const confirmed = await confirm('장치의 Job을 삭제하시겠습니까?');
    if (!confirmed) return;
    loading.value = true;
    try {
      const result = await api.value.cancelJobs({
        MACHINETYPE: equipmentType.value,
        MACHINENAME: equipment.value?.MAINEQPID ?? '',
        MACHINENAME2: equipmentInput.value,
        EVENTUSER: options.operatorId,
        JOBNAME1: '',
        JOBNAME2: '',
      });
      if (!result.ok) {
        showInfo(result.message);
      } else {
        showInfo(
          result.data.RET === '0' ? 'Job 삭제 요청하였습니다.' : 'Job 삭제 요청에 실패하였습니다.',
        );
      }
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function start(): Promise<void> {
    if (!equipmentInput.value.trim()) {
      showInfo('진행장비를 입력하세요.');
      return;
    }
    if (!selectedRecipe.value) {
      showInfo('진행Rcp가 조회되지 않았습니다.');
      return;
    }
    if (
      (frontLot.value.lotId && !frontLot.value.operation) ||
      (rearLotInput.value && !rearLot.value.operation) ||
      (!rearLotInput.value && rearLot.value.operation)
    ) {
      showInfo('LOT 조회가 정상적으로 이루어 지지 않았습니다.');
      return;
    }
    for (const lot of [frontLot.value, rearLot.value]) {
      if (lot.lotId && !(await checkComment(lot.lotId))) return;
    }
    const confirmed = await confirmRecipe();
    if (!confirmed) return;

    const numCass = getCassetteCount();
    loading.value = true;
    try {
      const result = await api.value.startRemote({
        MACHINENAME: equipment.value?.MAINEQPID ?? '',
        MACHINENAME2: equipmentInput.value,
        MACHINETYPE: equipmentType.value,
        AREANAME: equipment.value?.EQPAREA ?? '',
        NUMCASS: numCass,
        LOTNAME: frontLot.value.lotId,
        LOTNAME2: rearLotInput.value,
        RECIPENAME: selectedRecipe.value,
        JOBNAME: equipment.value?.JOBID ?? '',
        PRODUCTQTY: frontLot.value.quantity,
        PRODUCTQTY2: rearLot.value.quantity,
        OPERATION: `${frontLot.value.operationCode}-${frontLot.value.subOperation}`,
        OPERATION2: `${rearLot.value.operationCode}-${rearLot.value.subOperation}`,
        EVENTUSER: options.operatorId,
        ISCARRAY: '',
        BAY: '',
        STOCKER: '',
      });
      if (!result.ok) {
        showRemoteStartError(result.message);
        return;
      }
      options.onCompleted();
    } catch (error) {
      showRemoteStartError(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function checkComment(lotId: string): Promise<boolean> {
    const result = await api.value.fetchLotInfo({
      TYPE: 'MVIN',
      LOTID: lotId,
      FACILITY: options.facility,
    });
    if (!result.ok) {
      showInfo(result.message);
      return false;
    }
    if (parseCount(result.data.NWCOMMENTQTY) > 0) {
      showInfo(
        `LOT[ ${lotId}]에 읽지 않은 작업성 COMMENT가 [${result.data.NWCOMMENTQTY}]가 있습니다.`,
        '읽은후 진행하세요.',
      );
      return false;
    }
    return true;
  }

  function openComment(lot: RemoteLotDetails): void {
    if (!lot.operation) return;
    options.onOpenComment({
      LOTID: lot.lotId,
      OPERATION: lot.operationCode,
      SUBOPERATION: lot.subOperation,
      PROCESSSTEP: lot.processStep,
      OPERSEQUENCE: lot.operSequence,
    });
  }

  function cancel(): void {
    options.onCancel();
  }

  function resolveDialog(confirmed: boolean): void {
    pendingConfirmation.value?.(confirmed);
    pendingConfirmation.value = undefined;
    dialog.value = undefined;
  }

  function showInfo(message: string, title: string = COMMON_FIELD.TXTDIALOGTITLE_ERROR): void {
    dialog.value = { title, message, kind: 'info' };
  }

  function confirm(message: string): Promise<boolean> {
    dialog.value = {
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message,
      kind: 'confirm',
      intent: 'action',
    };
    return new Promise((resolve) => {
      pendingConfirmation.value = resolve;
    });
  }

  function confirmRecipe(): Promise<boolean> {
    dialog.value = {
      title: COMMON_FIELD.TXTDIALOGTITLE_OK,
      message: '계속 진행하시겠습니까?',
      kind: 'confirm',
      intent: 'recipe',
    };
    return new Promise((resolve) => {
      pendingConfirmation.value = resolve;
    });
  }

  function showRemoteStartError(message: string): void {
    try {
      if (typeof navigator !== 'undefined') navigator.vibrate?.(1000);
    } catch {
      // The alert must remain visible if vibration is unavailable or denied.
    }
    showInfo(message, COMMON_FIELD.TXTDIALOGTITLE_ERROR);
  }

  function closeInfo(): void {
    if (dialog.value?.kind === 'info') dialog.value = undefined;
  }

  function changePort(port: string): void {
    selectedPort.value = port;
    void refreshPortState();
  }

  function closeRecipeDialogAsLegacyBack(): void {
    resolveDialog(true);
  }

  function setRearInput(value: string): void {
    rearLotInput.value = value.toUpperCase();
  }

  function setEquipmentInput(value: string): void {
    equipmentInput.value = value.toUpperCase();
  }

  function setInitialFrontLot(lotId: string): void {
    if (lotId.trim()) void searchFrontLot(lotId);
  }

  function setApi(nextApi?: RemoteRamcoApi): void {
    pendingConfirmation.value?.(false);
    pendingConfirmation.value = undefined;
    api.value = nextApi ?? getRemoteRamcoApi();
    equipmentInput.value = '';
    rearLotInput.value = '';
    equipment.value = undefined;
    frontLot.value = emptyLot();
    rearLot.value = emptyLot();
    recipes.value = [];
    selectedRecipe.value = '';
    ports.value = [];
    selectedPort.value = '';
    portState.value = '';
    portAck.value = '';
    loading.value = false;
    rearLotEnabled.value = false;
    clearPortEnabled.value = false;
    startEnabled.value = false;
    dialog.value = undefined;
  }

  function clearEquipmentDetails(): void {
    equipment.value = undefined;
    recipes.value = [];
    selectedRecipe.value = '';
    ports.value = [];
    selectedPort.value = '';
    portState.value = '';
    clearPortEnabled.value = false;
    rearLotEnabled.value = false;
    startEnabled.value = false;
  }

  function clearLot(target: typeof frontLot): void {
    target.value = emptyLot();
    startEnabled.value = false;
  }

  function getCassetteCount(): string {
    if (isRam8500.value) {
      if (isPortVisible.value) {
        return ['1', '2'].includes(selectedPort.value) ? 'PORT12' : 'PORT34';
      }
      const count = equipment.value?.NUMCST ?? '';
      if (!rearLotInput.value) return count;
      return (
        ({ '1': '12', '3': '34', '5': '56', '7': '78' } as Record<string, string>)[count] ?? count
      );
    }
    if (isUltima3.value) return selectedPort.value;
    if (equipmentType.value === 'DES220') return equipment.value?.NUMCST ?? '';
    return rearLotInput.value ? '3' : '1';
  }

  function getLotRequest(lotId: string): LotInfoRequest {
    return { TYPE: 'MVIN', LOTID: lotId, FACILITY: options.facility };
  }

  function primeFrontLot(lotId: string, data: LotInfoResponse): void {
    frontLot.value = mapLot(lotId, data);
  }

  async function syncLotComment(side: 'front' | 'rear'): Promise<void> {
    const target = side === 'front' ? frontLot : rearLot;
    if (!target.value.lotId) return;
    try {
      const request: LotInfoRequest = {
        TYPE: 'MVIN',
        LOTID: target.value.lotId,
        FACILITY: options.facility,
      };
      const result = await api.value.fetchLotInfo(request);
      if (result.ok) {
        target.value.commentQty = result.data.COMMENTQTY ?? '';
        target.value.nwCommentQty = result.data.NWCOMMENTQTY ?? '';
      }
    } catch {
      // Ignore background comment-sync errors on screen return
    }
  }

  function dumpSessionState(commentSide?: 'front' | 'rear') {
    return {
      equipmentInput: equipmentInput.value,
      selectedRecipe: selectedRecipe.value,
      recipes: [...recipes.value],
      selectedPort: selectedPort.value,
      ports: [...ports.value],
      portState: portState.value,
      portAck: portAck.value,
      frontLot: { ...frontLot.value },
      rearLot: { ...rearLot.value },
      rearLotInput: rearLotInput.value,
      rearLotEnabled: rearLotEnabled.value,
      clearPortEnabled: clearPortEnabled.value,
      startEnabled: startEnabled.value,
      equipment: equipment.value,
      commentSide,
    };
  }

  function restoreSessionState(state: {
    equipmentInput?: string;
    selectedRecipe?: string;
    recipes?: string[];
    selectedPort?: string;
    ports?: string[];
    portState?: string;
    portAck?: string;
    frontLot?: RemoteLotDetails;
    rearLot?: RemoteLotDetails;
    rearLotInput?: string;
    rearLotEnabled?: boolean;
    clearPortEnabled?: boolean;
    startEnabled?: boolean;
    equipment?: WetRemoteEqpInfoResponse;
  }): void {
    if (!state) return;
    equipmentInput.value = state.equipmentInput ?? '';
    selectedRecipe.value = state.selectedRecipe ?? '';
    if (state.recipes) recipes.value = [...state.recipes];
    selectedPort.value = state.selectedPort ?? '';
    if (state.ports) ports.value = [...state.ports];
    portState.value = state.portState ?? '';
    portAck.value = state.portAck ?? '';
    if (state.frontLot) frontLot.value = { ...state.frontLot };
    if (state.rearLot) rearLot.value = { ...state.rearLot };
    rearLotInput.value = state.rearLotInput ?? '';
    rearLotEnabled.value = Boolean(state.rearLotEnabled);
    clearPortEnabled.value = Boolean(state.clearPortEnabled);
    startEnabled.value = Boolean(state.startEnabled);
    if (state.equipment) equipment.value = state.equipment;
  }

  if (options.initialLotId) frontLot.value.lotId = options.initialLotId;

  return {
    equipmentInput,
    rearLotInput,
    equipment,
    frontLot,
    rearLot,
    recipes,
    selectedRecipe,
    ports,
    selectedPort,
    portState,
    portAck,
    loading,
    processing,
    rearLotEnabled,
    clearPortEnabled,
    startEnabled,
    dialog,
    equipmentType,
    isUltima3,
    isRam8500,
    isPortVisible,
    isRunningRecipeVisible,
    isDualRecipeVisible,
    canReadFrontComment,
    canReadRearComment,
    isStartEnabled,
    lookupEquipment,
    searchFrontLot,
    searchRearLot,
    refreshPortState,
    clearPort,
    deleteJobs,
    start,
    openComment,
    cancel,
    resolveDialog,
    closeInfo,
    showInfo,
    changePort,
    closeRecipeDialogAsLegacyBack,
    setRearInput,
    setEquipmentInput,
    setInitialFrontLot,
    setApi,
    getLotRequest,
    primeFrontLot,
    syncLotComment,
    dumpSessionState,
    restoreSessionState,
  };
}

function validateLot(data: LotInfoResponse): string {
  if (data.STATUS === 'RUN') return '이미 MOVE IN된 LOT입니다.';
  if (data.STATE !== 'WIP') return `${data.STATE ?? ''} 상태 입니다. 자동화 진행이 불가합니다.`;
  if (data.HOLDSTATUS === 'ONHOLD') return 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.';
  if (data.BATCHID) return 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.';
  if (data.AREA === 'PHOTO') return 'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.';
  if (data.LOTRESUSER) return '이미 작업 예약되었거나 진행중인 LOT입니다.';
  return '';
}

function mapLot(lotId: string, data: LotInfoResponse): RemoteLotDetails {
  return {
    lotId,
    commentQty: data.COMMENTQTY ?? '',
    product: `${data.PRODUCT ?? ''} (${data.JOBCODE ?? ''})`,
    operation: `${data.OPERATION ?? ''}-${data.SUBOPERATION ?? ''}(${data.PROCESSSTEP ?? ''})`,
    quantity: data.QUANTITY ?? '',
    operationCode: data.OPERATION ?? '',
    subOperation: data.SUBOPERATION ?? '',
    processStep: data.PROCESSSTEP ?? '',
    opType: data.OPTYPE ?? '',
    operSequence: data.OPERSEQUENCE ?? '',
    nwCommentQty: data.NWCOMMENTQTY ?? '',
  };
}

function parseRecipes(rawRecipe: string, eqpType: string): string[] {
  let recipe = rawRecipe;
  if (eqpType !== 'KAIJO' && eqpType !== 'UW8000') {
    const parenthesis = recipe.lastIndexOf('(');
    if (parenthesis > -1) recipe = recipe.substring(0, parenthesis);
    const normalizedRecipe = recipe.replace(/#/g, '');
    if (eqpType === 'DES220' && normalizedRecipe.length === 1) {
      recipe = `#0${normalizedRecipe}`;
    }
  }
  if (recipe.includes(':')) {
    const colon = recipe.lastIndexOf(':');
    const prefix = recipe.substring(0, colon + 1);
    recipe = recipe
      .substring(colon + 1)
      .split(',')
      .map((item) => `${prefix}${item}`)
      .join(';');
  }
  return recipe.split(';').filter(Boolean);
}

function splitList(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function parseCount(value?: string): number {
  const parsed = Number(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEquipmentId(value: string): string {
  const dashCount = [...value].filter((character) => character === '-').length;
  if (dashCount !== 2 || ['RD-51-05', 'R-6-1', 'R-67-1'].includes(value)) return value;
  return value.slice(0, -2);
}

function normalizeScrubber(value: string): string {
  const dashCount = [...value].filter((character) => character === '-').length;
  if (dashCount !== 2 || ['RD-51-05', 'R-6-1', 'R-67-1'].includes(value)) return '';
  return value.slice(-1);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청에 실패하였습니다.';
}
