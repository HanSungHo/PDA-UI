import { computed, ref, shallowRef } from 'vue';

import { COMMON_FIELD } from '../../../constants/common-strings';
import { getWetAutoApi } from '../services/wet-auto.service';
import type {
  WetAutoApi,
  WetAutoEquipmentResponse,
  WetAutoLotDetails,
  WetAutoLotResponse,
  WetAutoSessionState,
  WetAutoStartRequest,
} from '../types/wet-auto.types';

export interface WetAutoOptions {
  api?: WetAutoApi;
  facility: string;
  operatorId: string;
  onOpenComment: (payload: WetAutoCommentPayload) => void;
  onCancel: () => void;
  onCompleted: () => void;
}

export interface WetAutoCommentPayload {
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  OPERSEQUENCE: string;
}

const emptyLot = (): WetAutoLotDetails => ({
  product: '',
  operation: '',
  quantity: '',
  operationCode: '',
  subOperation: '',
  processStep: '',
  opType: '',
  operSequence: '',
});

export function useWetAuto(options: WetAutoOptions) {
  const api = shallowRef(options.api ?? getWetAutoApi());
  const machineInput = ref('');
  const frontInput = ref('');
  const rearInput = ref('');
  const equipment = ref<WetAutoEquipmentResponse>();
  const reservationTime = ref('');
  const recipe = ref('');
  const frontLot = ref<WetAutoLotDetails>(emptyLot());
  const rearLot = ref<WetAutoLotDetails>(emptyLot());
  const loading = ref(false);
  const frontLotEnabled = ref(false);
  const rearLotEnabled = ref(false);
  const carryEnabled = ref(false);
  const frontCommentEnabled = ref(false);
  const rearCommentEnabled = ref(false);
  const startEnabled = ref(true);
  const carryChecked = ref(false);
  const bayOptions = ref<string[]>([]);
  const stockerOptions = ref<string[]>([]);
  const selectedBay = ref('');
  const selectedStocker = ref('');
  const bayEnabled = ref(true);
  const stockerEnabled = ref(true);
  const dialogs = ref<Array<{ title: string; message: string }>>([]);
  const dialog = computed(() => dialogs.value[0]);
  const recipeConfirmationOpen = ref(false);
  const focusTarget = ref<'machine' | 'front' | 'rear'>('machine');

  let cachedBay = '';
  let cachedStocker = '';

  function showInfo(message: string, title: string = COMMON_FIELD.TXTDIALOGTITLE_ERROR): void {
    dialogs.value.push({ title, message });
  }

  function closeInfo(): void {
    dialogs.value.shift();
  }

  function clearLot(target: typeof frontLot): void {
    target.value = emptyLot();
  }

  function clearLotInfoFront(): void {
    clearLot(frontLot);
    recipe.value = '';
  }

  function clearLotInfoRear(): void {
    clearLot(rearLot);
  }

  function clearAll(): void {
    equipment.value = undefined;
    reservationTime.value = '';
    clearLotInfoFront();
    clearLotInfoRear();
    frontInput.value = '';
    rearInput.value = '';
  }

  async function lookupEquipment(): Promise<void> {
    clearAll();
    if (!machineInput.value) {
      showInfo('장비명을 입력하여 주세요.');
      return;
    }

    loading.value = true;
    try {
      const result = await api.value.fetchEquipment({ EQPID: machineInput.value });
      if (!result.ok) {
        rearLotEnabled.value = false;
        showInfo(result.message);
        return;
      }

      equipment.value = result.data;
      reservationTime.value = result.data.JOBID ?? '';
      if (result.data.PMMESSAGE) showInfo(result.data.PMMESSAGE, 'PM주기 경고');
      if (result.data.PCOUNT === 'N') {
        showInfo('진행가능한 JOB 수량을 초과하여 진행이 불가합니다.');
      }

      frontLotEnabled.value = true;
      carryEnabled.value = true;
      focusTarget.value = 'front';
    } catch (error) {
      rearLotEnabled.value = false;
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function lookupFrontLot(): Promise<void> {
    clearLotInfoFront();
    if (frontInput.value === rearInput.value) {
      showInfo('동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.');
      return;
    }
    await lookupLot('front', frontInput.value);
  }

  async function lookupRearLot(): Promise<void> {
    clearLotInfoRear();
    if (!frontInput.value) {
      showInfo('FRONT 진행 LOT 부터 순서대로 조회하시기 바랍니다.');
      return;
    }
    if (!rearInput.value) {
      showInfo('LOT ID를 입력하세요');
      return;
    }
    if (frontInput.value === rearInput.value) {
      showInfo('동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.');
      return;
    }
    await lookupLot('rear', rearInput.value);
  }

  async function lookupLot(side: 'front' | 'rear', lotId: string): Promise<void> {
    const target = side === 'front' ? frontLot : rearLot;
    target.value = emptyLot();
    loading.value = true;
    try {
      const result = await api.value.fetchLot({
        TYPE: 'MVIN',
        LOTID: lotId,
        FACILITY: options.facility,
      });
      if (!result.ok) {
        showInfo(result.message);
        return;
      }

      const validation = validateLot(result.data);
      if (validation) {
        showInfo(validation);
        return;
      }

      target.value = mapLot(result.data);
      if (side === 'front') frontCommentEnabled.value = true;
      else rearCommentEnabled.value = true;
      startEnabled.value = true;

      if (isPositiveCount(result.data.NWCOMMENTQTY)) {
        showInfo(
          `읽지 않은 작업성 COMMENT가 [${result.data.NWCOMMENTQTY}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      if (side === 'front') await loadFrontRecipe();
      else if (!(await checkRearRecipe())) startEnabled.value = false;
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function loadFrontRecipe(): Promise<void> {
    recipe.value = '';
    const result = await api.value.fetchRecipe({
      ISPHOTO: 'N',
      LOTID: frontInput.value,
      OPERATION: frontLot.value.operationCode,
      SUBOPERATION: frontLot.value.subOperation,
      PRODUCT: frontLot.value.product,
      EQPID: equipment.value?.MAINEQPID ?? '',
      OPTYPE: frontLot.value.opType,
      FACILITY: options.facility,
    });
    if (!result.ok) {
      showInfo(result.message);
      frontLot.value.product = '';
      frontLot.value.operation = '';
      frontLot.value.quantity = '';
      startEnabled.value = false;
      focusTarget.value = 'front';
      return;
    }

    recipe.value = trimRecipe(result.data.RECIPE ?? '');
    rearLotEnabled.value = true;
    startEnabled.value = true;
    focusTarget.value = 'rear';
  }

  async function checkRearRecipe(): Promise<boolean> {
    const result = await api.value.fetchRecipe({
      ISPHOTO: 'N',
      LOTID: rearInput.value,
      OPERATION: rearLot.value.operationCode,
      SUBOPERATION: rearLot.value.subOperation,
      PRODUCT: rearLot.value.product,
      EQPID: machineInput.value,
      OPTYPE: rearLot.value.opType,
      FACILITY: options.facility,
    });
    if (!result.ok) {
      showInfo(result.message);
      clearRearDisplay();
      focusTarget.value = 'rear';
      return false;
    }

    if (recipe.value !== trimRecipe(result.data.RECIPE ?? '')) {
      showInfo('RECIPE가 다른 LOT입니다.');
      clearRearDisplay();
      focusTarget.value = 'rear';
      return false;
    }
    return true;
  }

  function clearRearDisplay(): void {
    rearLot.value.product = '';
    rearLot.value.operation = '';
    rearLot.value.quantity = '';
    startEnabled.value = false;
  }

  async function setCarry(checked: boolean): Promise<void> {
    carryChecked.value = checked;
    if (checked) {
      bayEnabled.value = true;
      stockerEnabled.value = true;
      bayOptions.value = [];
      stockerOptions.value = [];
      selectedBay.value = '';
      selectedStocker.value = '';
      loading.value = true;
      try {
        const result = await api.value.fetchBays({ FACILITY: options.facility });
        if (!result.ok) {
          showInfo(result.message);
          return;
        }
        bayOptions.value = (result.data.BAYS?.ITEM ?? [])
          .map(({ BAY }) => BAY ?? '')
          .filter(Boolean);
        if (cachedBay && bayOptions.value.includes(cachedBay)) {
          selectedBay.value = cachedBay;
          await setBay(selectedBay.value);
        }
      } catch (error) {
        showInfo(errorMessage(error));
      } finally {
        loading.value = false;
      }
      return;
    }

    if (selectedBay.value) cachedBay = selectedBay.value;
    if (selectedStocker.value) cachedStocker = selectedStocker.value;
    bayOptions.value = [];
    stockerOptions.value = [];
    selectedBay.value = '';
    selectedStocker.value = '';
    bayEnabled.value = false;
    stockerEnabled.value = false;
  }

  async function setBay(bay: string): Promise<void> {
    selectedBay.value = bay;
    stockerOptions.value = [];
    selectedStocker.value = '';
    if (!bay) return;
    loading.value = true;
    try {
      const result = await api.value.fetchStockers({ BAY: bay, FACILITY: options.facility });
      if (!result.ok) {
        showInfo(result.message);
        return;
      }
      stockerOptions.value = (result.data.STOCKERS?.ITEM ?? [])
        .map(({ STOCKER }) => STOCKER ?? '')
        .filter(Boolean);
      if (cachedStocker && stockerOptions.value.includes(cachedStocker)) {
        selectedStocker.value = cachedStocker;
      }
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function start(): Promise<void> {
    if (!machineInput.value) {
      showInfo('진행장비를 입력하세요.');
      return;
    }
    if (!recipe.value) {
      showInfo('진행Rcp가 조회되지 않았습니다.');
      return;
    }
    if (
      (frontInput.value && !frontLot.value.operation) ||
      (rearInput.value && !rearLot.value.operation)
    ) {
      showInfo('LOT 조회가 정상적으로 이루어 지지 않았습니다.');
      return;
    }
    if (carryChecked.value && !selectedBay.value) {
      showInfo('BAY를 선택하세요.');
      return;
    }
    if (carryChecked.value && !selectedStocker.value) {
      showInfo('STOCKER를 선택하세요.');
      return;
    }
    if (frontInput.value && !(await checkComment(frontInput.value))) return;
    if (rearInput.value && !(await checkComment(rearInput.value))) return;
    recipeConfirmationOpen.value = true;
  }

  async function checkComment(lotId: string): Promise<boolean> {
    try {
      const result = await api.value.fetchLot({
        TYPE: 'MVIN',
        LOTID: lotId,
        FACILITY: options.facility,
      });
      if (!result.ok) {
        showInfo(result.message);
        return false;
      }
      if (isPositiveCount(result.data.NWCOMMENTQTY)) {
        showInfo(
          `LOT[ ${lotId}]에 읽지 않은 작업성 COMMENT가 [${result.data.NWCOMMENTQTY}]가 있습니다.`,
          '읽은후 진행하세요.',
        );
        return false;
      }
      return true;
    } catch (error) {
      showInfo(errorMessage(error));
      return false;
    }
  }

  async function confirmRecipe(confirmed: boolean): Promise<void> {
    recipeConfirmationOpen.value = false;
    if (!confirmed) return;

    loading.value = true;
    try {
      const result = await api.value.start(buildStartRequest());
      if (!result.ok) {
        showInfo(result.message);
        return;
      }
      options.onCompleted();
    } catch (error) {
      showInfo(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  function buildStartRequest(): WetAutoStartRequest {
    return {
      MACHINENAME: equipment.value?.MAINEQPID ?? '',
      MACHINENAME2: machineInput.value,
      MACHINETYPE: equipment.value?.EQPTYPE ?? '',
      AREANAME: equipment.value?.EQPAREA ?? '',
      NUMCASS: rearInput.value ? '2' : '1',
      LOTNAME: frontInput.value,
      LOTNAME2: rearInput.value,
      RECIPENAME: recipe.value,
      JOBNAME: equipment.value?.JOBID ?? '',
      PRODUCTQTY: frontLot.value.quantity,
      PRODUCTQTY2: rearLot.value.quantity,
      OPERATION: frontLot.value.operation,
      OPERATION2: rearLot.value.operation,
      EVENTUSER: options.operatorId,
      ISCARRAY: carryChecked.value ? 'Y' : 'N',
      BAY: carryChecked.value ? selectedBay.value : '',
      STOCKER: carryChecked.value ? selectedStocker.value : '',
    };
  }

  function openComment(side: 'front' | 'rear'): void {
    const target = side === 'front' ? frontLot.value : rearLot.value;
    options.onOpenComment({
      LOTID: side === 'front' ? frontInput.value : rearInput.value,
      OPERATION: target.operationCode,
      SUBOPERATION: target.subOperation,
      PROCESSSTEP: target.processStep,
      OPERSEQUENCE: target.operSequence,
    });
  }

  function setMachineInput(value: string): void {
    machineInput.value = value.toUpperCase();
  }

  function setFrontInput(value: string): void {
    frontInput.value = value.toUpperCase();
  }

  function setRearInput(value: string): void {
    rearInput.value = value.toUpperCase();
  }

  function cancel(): void {
    options.onCancel();
  }

  function dumpSessionState(): WetAutoSessionState {
    return {
      machineInput: machineInput.value,
      frontInput: frontInput.value,
      rearInput: rearInput.value,
      equipment: equipment.value ? { ...equipment.value } : undefined,
      reservationTime: reservationTime.value,
      recipe: recipe.value,
      frontLot: { ...frontLot.value },
      rearLot: { ...rearLot.value },
      frontLotEnabled: frontLotEnabled.value,
      rearLotEnabled: rearLotEnabled.value,
      carryEnabled: carryEnabled.value,
      frontCommentEnabled: frontCommentEnabled.value,
      rearCommentEnabled: rearCommentEnabled.value,
      startEnabled: startEnabled.value,
      carryChecked: carryChecked.value,
      bayOptions: [...bayOptions.value],
      stockerOptions: [...stockerOptions.value],
      selectedBay: selectedBay.value,
      selectedStocker: selectedStocker.value,
      bayEnabled: bayEnabled.value,
      stockerEnabled: stockerEnabled.value,
      cachedBay,
      cachedStocker,
      focusTarget: focusTarget.value,
    };
  }

  function restoreSessionState(state: WetAutoSessionState): void {
    machineInput.value = state.machineInput;
    frontInput.value = state.frontInput;
    rearInput.value = state.rearInput;
    equipment.value = state.equipment ? { ...state.equipment } : undefined;
    reservationTime.value = state.reservationTime;
    recipe.value = state.recipe;
    frontLot.value = { ...state.frontLot };
    rearLot.value = { ...state.rearLot };
    frontLotEnabled.value = state.frontLotEnabled;
    rearLotEnabled.value = state.rearLotEnabled;
    carryEnabled.value = state.carryEnabled;
    frontCommentEnabled.value = state.frontCommentEnabled;
    rearCommentEnabled.value = state.rearCommentEnabled;
    startEnabled.value = state.startEnabled;
    carryChecked.value = state.carryChecked;
    bayOptions.value = [...state.bayOptions];
    stockerOptions.value = [...state.stockerOptions];
    selectedBay.value = state.selectedBay;
    selectedStocker.value = state.selectedStocker;
    bayEnabled.value = state.bayEnabled;
    stockerEnabled.value = state.stockerEnabled;
    cachedBay = state.cachedBay;
    cachedStocker = state.cachedStocker;
    focusTarget.value = state.focusTarget;
    loading.value = false;
    recipeConfirmationOpen.value = false;
    dialogs.value = [];
  }

  return {
    machineInput,
    frontInput,
    rearInput,
    equipment,
    reservationTime,
    recipe,
    frontLot,
    rearLot,
    loading,
    frontLotEnabled,
    rearLotEnabled,
    carryEnabled,
    frontCommentEnabled,
    rearCommentEnabled,
    startEnabled,
    carryChecked,
    bayOptions,
    stockerOptions,
    selectedBay,
    selectedStocker,
    bayEnabled,
    stockerEnabled,
    dialog,
    recipeConfirmationOpen,
    focusTarget,
    lookupEquipment,
    lookupFrontLot,
    lookupRearLot,
    setCarry,
    setBay,
    start,
    checkComment,
    confirmRecipe,
    openComment,
    setMachineInput,
    setFrontInput,
    setRearInput,
    showInfo,
    closeInfo,
    cancel,
    dumpSessionState,
    restoreSessionState,
  };
}

function validateLot(data: WetAutoLotResponse): string {
  if (data.STATUS === 'RUN') return '이미 MOVE IN된 LOT입니다.';
  if (data.STATE !== 'WIP') return `${data.STATE ?? ''} 상태 입니다. 자동화 진행이 불가합니다.`;
  if (data.HOLDSTATUS === 'ONHOLD') return 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.';
  if (data.BATCHID) return 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.';
  if (data.AREA === 'PHOTO') return 'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.';
  if (data.LOTRESUSER) return '이미 작업 예약되었거나 진행중인 LOT입니다.';
  return '';
}

function mapLot(data: WetAutoLotResponse): WetAutoLotDetails {
  return {
    product: `${data.PRODUCT ?? ''} (${data.JOBCODE ?? ''})`,
    operation: `${data.OPERATION ?? ''}-${data.SUBOPERATION ?? ''}`,
    quantity: data.QUANTITY ?? '',
    operationCode: data.OPERATION ?? '',
    subOperation: data.SUBOPERATION ?? '',
    processStep: data.PROCESSSTEP ?? '',
    opType: data.OPTYPE ?? '',
    operSequence: data.OPERSEQUENCE ?? '',
  };
}

function trimRecipe(value: string): string {
  const index = value.lastIndexOf('(');
  return index < 0 ? value : value.slice(0, index);
}

function isPositiveCount(value?: string): boolean {
  if (!value) return false;
  if (!/^[+-]?\d+$/.test(value)) throw new Error(`Invalid integer: ${value}`);

  const count = Number(value);
  if (count < -2147483648 || count > 2147483647) {
    throw new Error(`Invalid integer: ${value}`);
  }
  return count > 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed.';
}
