import { computed, ref } from 'vue';

import { barcodeStyleEqpId } from '../../../utils/barcode-style';
import { useMainStore } from '../../main/stores/main.store';
import { getRemoteFurnaceKjApi } from '../services/remote-furnace-kj.service';
import type {
  FurnaceKjBatchLot,
  FurnaceKjEquipmentInfo,
  FurnaceKjLotInfo,
  RemoteFurnaceKjApi,
  RemoteFurnaceKjDraft,
} from '../types/remote-furnace-kj.types';

export type RemoteFurnaceKjDummyMode = 'F' | 'T' | 'NONLOT';
export type RemoteFurnaceKjDialogKind = 'alert' | 'confirm' | 'success';
type RemoteFurnaceKjDialogAction =
  | 'change-equipment-status'
  | 'clear-port'
  | 'recipe-warning'
  | 'recipe-multimove-warning'
  | 'retry-recipe';

export interface RemoteFurnaceKjCommentContext {
  lotId: string;
  operation: string;
  subOperation: string;
  processStep: string;
  operSequence: string;
}

export interface UseRemoteFurnaceKjOptions {
  api?: RemoteFurnaceKjApi;
  initialDraft?: RemoteFurnaceKjDraft;
  initialLotId?: string;
  onOpenComments?: (context: RemoteFurnaceKjCommentContext) => void;
  onCancel?: () => void;
  onSuccess?: (lotId: string) => void;
}

export interface RemoteFurnaceKjDialog {
  open: boolean;
  title: string;
  message: string;
  kind: RemoteFurnaceKjDialogKind;
  action?: RemoteFurnaceKjDialogAction;
}

function equipmentMatchesStandardGroup(standardGroup: string, equipmentId: string): boolean {
  if (!equipmentId) return false;
  if (standardGroup && !standardGroup.includes('-')) return true;

  const equipmentSeparator = equipmentId.lastIndexOf('-');
  if (equipmentSeparator < 1) return false;
  const prefix = equipmentId.slice(0, equipmentSeparator);
  const equipmentNumber = equipmentId.slice(equipmentSeparator + 1);
  const standardNumbers: string[] = [];

  for (const group of standardGroup.split('|')) {
    let groupIndex = group.indexOf(prefix);
    while (groupIndex >= 0) {
      const start = groupIndex + prefix.length + 1;
      const nextGroupIndex = group.indexOf(prefix, start);
      const end = nextGroupIndex < 0 ? group.length : group.lastIndexOf(',', nextGroupIndex);
      standardNumbers.push(...group.slice(start, end < start ? nextGroupIndex : end).split(','));
      groupIndex = nextGroupIndex;
    }
  }

  const numberValue = (value: string): number | undefined => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits) return Number(digits);
    return value.length === 1 ? value.charCodeAt(0) : undefined;
  };
  const requestedNumber = numberValue(equipmentNumber);
  if (requestedNumber === undefined) return false;

  return standardNumbers.some((allowed) => {
    const [first, last] = allowed.trim().split('~');
    const minimum = numberValue(first ?? '');
    const maximum = numberValue(last ?? first ?? '');
    return (
      minimum !== undefined &&
      maximum !== undefined &&
      requestedNumber >= minimum &&
      requestedNumber <= maximum
    );
  });
}

export function useRemoteFurnaceKj(options: UseRemoteFurnaceKjOptions = {}) {
  const api = options.api ?? getRemoteFurnaceKjApi();
  const mainStore = useMainStore();
  const lotInput = ref(options.initialLotId ?? '');
  const lotInfo = ref<FurnaceKjLotInfo>();
  const batchId = ref('');
  const batchRows = ref<FurnaceKjBatchLot[]>([]);
  const equipmentInput = ref('');
  const equipment = ref<FurnaceKjEquipmentInfo>();
  const standardMachine = ref('');
  const standardMachineError = ref(false);
  const externalMachine = ref('');
  const recipeOptions = ref<string[]>([]);
  const selectedRecipe = ref('');
  const portOptions = ref<string[]>([]);
  const selectedPort = ref('');
  const portStatus = ref('');
  const dummyMode = ref<RemoteFurnaceKjDummyMode>('NONLOT');
  const isReserved = ref(false);
  const isLotEligible = ref(false);
  const isInterlocked = ref(false);
  const isLoading = ref(false);
  const isProcessing = ref(false);
  const recipeConfirmationOpen = ref(false);
  const pendingCommand = ref<'START' | 'RESTART'>('START');
  const dialog = ref<RemoteFurnaceKjDialog>({ open: false, title: '', message: '', kind: 'alert' });
  const dialogQueue = ref<RemoteFurnaceKjDialog[]>([]);
  const isDialogClosing = ref(false);
  const pendingMultiMoveWarning = ref('');
  const startEnabled = ref(false);
  const restartEnabled = ref(false);
  const clearPortEnabled = ref(false);

  const startButtonLabel = computed(() => (dummyMode.value === 'NONLOT' ? 'NO BATCH' : 'START'));
  const restartButtonLabel = computed(() =>
    dummyMode.value === 'NONLOT' ? '온도설정' : 'RESTART',
  );
  const isEquipmentLocked = computed(() => isReserved.value);
  const isRecipeLocked = computed(() => isReserved.value);
  const isPortLocked = computed(() => isReserved.value);

  function showDialog(
    kind: RemoteFurnaceKjDialogKind,
    title: string,
    message: string,
    action?: RemoteFurnaceKjDialogAction,
  ): void {
    const nextDialog = { open: true, kind, title, message, action };
    if (dialog.value.open || isDialogClosing.value) dialogQueue.value.push(nextDialog);
    else dialog.value = nextDialog;
  }

  function closeDialog(): void {
    if (!dialog.value.open || isDialogClosing.value) return;

    isDialogClosing.value = true;
    dialog.value = { ...dialog.value, open: false };
  }

  function onDialogAfterClose(): void {
    if (!isDialogClosing.value) return;

    isDialogClosing.value = false;
    dialog.value = dialogQueue.value.shift() ?? {
      open: false,
      title: '',
      message: '',
      kind: 'alert',
    };
  }

  async function initialize(): Promise<void> {
    lotInput.value = options.initialLotId?.trim() ?? '';
    dummyMode.value = lotInput.value ? 'F' : 'NONLOT';
    if (options.initialDraft?.lotId === lotInput.value) {
      restoreDraft(options.initialDraft);
      return;
    }
    if (!lotInput.value) {
      isLoading.value = false;
      return;
    }
    await getLotInfo();
  }

  function restoreDraft(draft: RemoteFurnaceKjDraft): void {
    lotInput.value = draft.lotId;
    lotInfo.value = draft.lotInfo;
    batchId.value = draft.batchId;
    batchRows.value = draft.batchRows;
    equipmentInput.value = draft.equipmentInput;
    equipment.value = draft.equipment;
    standardMachine.value = draft.standardMachine;
    standardMachineError.value = draft.standardMachineError ?? false;
    externalMachine.value = draft.externalMachine;
    recipeOptions.value = draft.recipeOptions;
    selectedRecipe.value = draft.selectedRecipe;
    portOptions.value = draft.portOptions;
    selectedPort.value = draft.selectedPort;
    portStatus.value = draft.portStatus;
    dummyMode.value = draft.dummyMode;
    isReserved.value = draft.isReserved;
    isLotEligible.value = draft.isLotEligible;
    isInterlocked.value = draft.isInterlocked;
    startEnabled.value = draft.startEnabled;
    restartEnabled.value = draft.restartEnabled;
    clearPortEnabled.value = draft.clearPortEnabled;
  }

  function createDraft(): RemoteFurnaceKjDraft {
    return {
      lotId: lotInput.value,
      lotInfo: lotInfo.value,
      batchId: batchId.value,
      batchRows: batchRows.value,
      equipmentInput: equipmentInput.value,
      equipment: equipment.value,
      standardMachine: standardMachine.value,
      standardMachineError: standardMachineError.value,
      externalMachine: externalMachine.value,
      recipeOptions: recipeOptions.value,
      selectedRecipe: selectedRecipe.value,
      portOptions: portOptions.value,
      selectedPort: selectedPort.value,
      portStatus: portStatus.value,
      dummyMode: dummyMode.value,
      isReserved: isReserved.value,
      isLotEligible: isLotEligible.value,
      isInterlocked: isInterlocked.value,
      startEnabled: startEnabled.value,
      restartEnabled: restartEnabled.value,
      clearPortEnabled: clearPortEnabled.value,
    };
  }

  async function getLotInfo(): Promise<void> {
    if (!lotInput.value) return;
    isLoading.value = true;
    isLotEligible.value = false;
    try {
      const response = await api.fetchLotInfo({
        LOTID: lotInput.value,
        FACILITY: mainStore.facility,
        USERID: mainStore.operatorId,
      });
      if (!response.ok) {
        showDialog('alert', '에  러', response.message);
        return;
      }

      lotInfo.value = response.data;
      batchId.value = response.data.BATCHID.replace(/\s/g, '');
      if (response.data.CHANGEEQPGROUP && response.data.CHANGEEQPGROUP !== standardMachine.value) {
        standardMachine.value = response.data.CHANGEEQPGROUP;
        standardMachineError.value = true;
      } else {
        standardMachine.value = response.data.EQPGROUP;
      }
      externalMachine.value = response.data.OXMACHINE;
      queueLotNotices(response.data);
      isLotEligible.value =
        response.data.STATUS !== 'RUN' &&
        response.data.STATE === 'WIP' &&
        response.data.HOLDSTATUS !== 'ONHOLD';

      if (response.data.STATUS === 'RUN') {
        showDialog('alert', '에  러', '이미 MOVE IN된 LOT입니다.');
        return;
      }
      if (response.data.STATE !== 'WIP') {
        showDialog(
          'alert',
          '에  러',
          `${response.data.STATE} 상태 입니다. 작업예약을 할 수 없습니다.`,
        );
        return;
      }
      if (response.data.HOLDSTATUS === 'ONHOLD') {
        showDialog('alert', '에  러', 'HOLD된 LOT입니다. 작업예약을 할 수 없습니다.');
        return;
      }
      if (response.data.INLINESAMPLEMESSGE) {
        showDialog('alert', '확  인', response.data.INLINESAMPLEMESSGE);
      }
      if (!response.data.BATCHID) {
        showDialog('alert', '확  인', 'Batch 생성 후 LOT을 다시 조회하여 주세요');
        return;
      }

      if (response.data.PROCESSNAME === 'MW_TEST' && response.data.BATCHID) {
        dummyMode.value = 'T';
      }
      await getBatchListByLot(lotInput.value);

      if (response.data.LOTRESUSER) {
        isReserved.value = true;
        equipmentInput.value = response.data.MACHINENAME;
        await getMachineInfo(response.data.MACHINENAME);
        if (portOptions.value.includes(response.data.PORTNAME)) {
          selectedPort.value = response.data.PORTNAME;
        }
        recipeOptions.value = response.data.MACHINERECIPENAME
          ? [response.data.MACHINERECIPENAME]
          : [];
        selectedRecipe.value = recipeOptions.value[0] ?? '';
        await setPortState();
        startEnabled.value = false;
      }
    } catch (error) {
      showDialog(
        'alert',
        '에  러',
        error instanceof Error ? error.message : 'LOT 조회에 실패하였습니다.',
      );
    } finally {
      isLoading.value = false;
    }
  }

  function queueLotNotices(info: FurnaceKjLotInfo): void {
    if (info.MEASTYPE) {
      const message = info.SAMPLINGMSG
        ? `동일한 Batch에 검사대상 Lot이 있습니다.\n${info.SAMPLINGMSG}`
        : info.SAMPLINGREASON === 'Y'
          ? 'UV검사 대상 Lot 입니다.'
          : `${info.MEASTYPE} 검사 대상 Lot 입니다.`;
      showDialog('alert', '검사대상', message);
    }
    if (info.MEASOPERATIONNAME && info.FQCLOTNAME) {
      showDialog('alert', '검사대상', `${info.FQCLOTNAME} 은 공정이물 검사 대상 Lot 입니다.`);
    }
    if (info.MEASOPERATIONNAME && info.FICDLOT) {
      showDialog('alert', '검사대상', `${info.FICDLOT} 은 FICD검사 대상 Lot 입니다.`);
    }
    if (info.ETCMSG) showDialog('alert', '정보', info.ETCMSG);
  }

  async function getBatchListByLot(lotId: string): Promise<void> {
    try {
      const response = await api.fetchBatchListByLot({
        LOTID: lotId,
        FACILITY: mainStore.facility,
      });
      if (!response.ok) {
        showDialog('alert', '에  러', response.message);
        return;
      }
      batchId.value = response.data.BATCHID || batchId.value;
      batchRows.value =
        dummyMode.value === 'T'
          ? response.data.rows.flatMap((row, index) => {
              const LOTID = response.data.dummyLotIds[index] ?? '';
              return LOTID ? [{ ...row, LOTID, PRODUCT: '', STATUS: '' }] : [];
            })
          : response.data.rows.filter((row) =>
              dummyMode.value === 'F'
                ? row.PROCESSNAME !== 'MW_TEST' && Boolean(row.LOTID)
                : Boolean(row.LOTID),
            );
      if (!batchRows.value.length) {
        showDialog('alert', '에  러', 'MOVE IN할 LOT이 없습니다.');
      } else if (Number(response.data.NWCOMMENTQTY || 0) > 0) {
        showDialog('alert', '정보', '작업성 COMMENT가 있습니다.\n읽은후 진행하세요');
      }
    } catch (error) {
      showDialog(
        'alert',
        '에  러',
        error instanceof Error ? error.message : 'Batch LOT 조회에 실패하였습니다.',
      );
    }
  }

  function setEquipmentInput(value: string): void {
    equipmentInput.value = value.toLocaleUpperCase();
  }

  async function onEquipmentEnter(): Promise<void> {
    const parsedEquipment = barcodeStyleEqpId(equipmentInput.value);
    if (!parsedEquipment.isValid) {
      equipmentInput.value = '';
      return;
    }
    equipmentInput.value = parsedEquipment.parsedId;
    await getMachineInfo(parsedEquipment.parsedId);
  }

  async function getMachineInfo(eqpId: string): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.fetchEquipmentInfo({ EQPID: eqpId });
      if (!response.ok) {
        equipment.value = undefined;
        equipmentInput.value = '';
        recipeOptions.value = [];
        selectedRecipe.value = '';
        portOptions.value = [];
        selectedPort.value = '';
        portStatus.value = '';
        startEnabled.value = false;
        restartEnabled.value = false;
        clearPortEnabled.value = false;
        showDialog('alert', '에  러', response.message);
        return;
      }
      const shouldValidateEquipment =
        dummyMode.value === 'F' &&
        lotInfo.value?.OPTYPE !== 'M' &&
        !['FAB2', 'FAB5', 'FAB7'].includes(standardMachine.value) &&
        lotInfo.value?.AREA !== 'PQC';
      if (
        shouldValidateEquipment &&
        !equipmentMatchesStandardGroup(standardMachine.value, response.data.PROCEQPID)
      ) {
        equipment.value = undefined;
        equipmentInput.value = '';
        recipeOptions.value = [];
        selectedRecipe.value = '';
        portOptions.value = [];
        selectedPort.value = '';
        portStatus.value = '';
        startEnabled.value = false;
        restartEnabled.value = false;
        clearPortEnabled.value = false;
        return;
      }
      equipment.value = response.data;
      equipmentInput.value = response.data.PROCEQPID;
      portOptions.value = response.data.PORTNAME.split(',')
        .map((port) => port.trim())
        .filter(Boolean);
      selectedPort.value = portOptions.value[0] ?? '';
      if (response.data.PMMESSAGE) showDialog('alert', 'PM주기 경고', response.data.PMMESSAGE);
      if (response.data.CYCLE_MESSAGE) {
        for (const cycleMessage of response.data.CYCLE_MESSAGE.split('/').filter(Boolean)) {
          showDialog('alert', '계측 주기 알림', cycleMessage);
        }
      }
      await getRecipeInfo();
      if (selectedPort.value) await setPortState();
    } catch (error) {
      equipment.value = undefined;
      equipmentInput.value = '';
      recipeOptions.value = [];
      selectedRecipe.value = '';
      portOptions.value = [];
      selectedPort.value = '';
      portStatus.value = '';
      startEnabled.value = false;
      restartEnabled.value = false;
      clearPortEnabled.value = false;
      showDialog(
        'alert',
        '에  러',
        error instanceof Error ? error.message : '장비 조회에 실패하였습니다.',
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function getRecipeInfo(): Promise<void> {
    if (!equipment.value) return;
    try {
      const response = await api.fetchRecipeInfo({
        LOTID: lotInput.value,
        OPERATION: lotInfo.value?.OPERATION ?? '',
        SUBOPERATION: lotInfo.value?.SUBOPERATION ?? '',
        PRODUCT: lotInfo.value?.PRODUCT ?? '',
        EQPID: equipment.value.MAINEQPID,
        OPTYPE: lotInfo.value?.OPTYPE ?? '',
        FACILITY: mainStore.facility,
        ISDUMMY: dummyMode.value,
      });
      if (!response.ok) {
        recipeOptions.value = [];
        selectedRecipe.value = '';
        if (response.message === '현재 장비 상태가 비부하DOWN 입니다.') {
          showDialog(
            'confirm',
            '확  인',
            '현재 장비 상태가 가동중(RUN)이 아닙니다.\n장비 상태를 가동중(RUN)으로 변경 하시겠습니까?',
            'change-equipment-status',
          );
          return;
        }
        showDialog('alert', '에  러', response.message);
        return;
      }
      recipeOptions.value = response.data.RECIPE ? [response.data.RECIPE] : [];
      selectedRecipe.value = recipeOptions.value[0] ?? '';
      if (response.data.ETCHMESSAGE) {
        pendingMultiMoveWarning.value = response.data.MULTIMOVEINACTION;
        showDialog('confirm', '확  인', response.data.ETCHMESSAGE, 'recipe-warning');
        return;
      }
      await continueRecipeInfo(response.data.MULTIMOVEINACTION);
    } catch (error) {
      showDialog(
        'alert',
        '에  러',
        error instanceof Error ? error.message : 'Recipe 조회에 실패하였습니다.',
      );
    }
  }

  async function continueRecipeInfo(multiMoveWarning: string): Promise<void> {
    if (multiMoveWarning) {
      showDialog('alert', 'WARNING', multiMoveWarning, 'recipe-multimove-warning');
      return;
    }
    await getINLKChk();
  }

  async function getINLKChk(): Promise<void> {
    if (dummyMode.value === 'T' || dummyMode.value === 'NONLOT' || isReserved.value) return;
    const response = await api.checkInterlock({
      MACHINENAME: equipmentInput.value,
      BATCHID: batchId.value,
      RECIPENAME: selectedRecipe.value,
      LOTLIST: batchRows.value.map((row) => row.LOTID).join(','),
    });
    if (!response.ok) {
      showDialog('alert', '에  러', response.message);
      return;
    }
    if (response.data.RET) showDialog('alert', '에  러', response.data.RET);
    isInterlocked.value = response.data.INTLK === 'Y';
    if (isInterlocked.value) {
      startEnabled.value = false;
      restartEnabled.value = false;
    }
  }

  async function selectRecipe(recipe: string): Promise<void> {
    selectedRecipe.value = recipe;
    await getINLKChk();
    await setPortState();
  }

  async function selectPort(port: string): Promise<void> {
    selectedPort.value = port;
    await setPortState();
  }

  async function setPortState(): Promise<void> {
    if (!selectedPort.value || !equipment.value) return;
    const response = await api.fetchKjPortStatus({
      MACHINENAME: equipment.value.MAINEQPID,
      PORTNAME: selectedPort.value,
      LOTID: lotInput.value,
      RECIPE: selectedRecipe.value,
    });
    if (!response.ok) {
      portStatus.value = '';
      startEnabled.value = false;
      restartEnabled.value = false;
      clearPortEnabled.value = false;
      showDialog('alert', '에  러', response.message);
      return;
    }
    if (equipment.value.FURNACE === 'KJ') {
      const isPrimaryPort = selectedPort.value === '1';
      portStatus.value = isPrimaryPort
        ? response.data.PORTSTATENAME1
        : response.data.PORTSTATENAME2;
      if (!isPrimaryPort) {
        startEnabled.value = false;
        restartEnabled.value = false;
        clearPortEnabled.value = false;
        return;
      }
      const canStart = portStatus.value === 'COMPLETE' || portStatus.value === 'IDLE';
      startEnabled.value =
        canStart &&
        !isReserved.value &&
        !isInterlocked.value &&
        (dummyMode.value !== 'F' || isLotEligible.value);
      restartEnabled.value =
        canStart && !isInterlocked.value && (dummyMode.value !== 'F' || isLotEligible.value);
      clearPortEnabled.value = !canStart;
      return;
    }

    portStatus.value = response.data.PORTSTATENAME;
    if (portStatus.value === 'RUN' || portStatus.value === 'RESERVED') {
      showDialog(
        'alert',
        '장비 MASSAGE',
        '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
      );
      if (response.data.ACKMSG) showDialog('alert', 'PORT WORNING', response.data.ACKMSG);
      startEnabled.value = false;
      restartEnabled.value = false;
      clearPortEnabled.value = true;
      return;
    }
    if (!portStatus.value) {
      showDialog(
        'alert',
        '장비 MASSAGE',
        'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
      );
      startEnabled.value = false;
      restartEnabled.value = false;
      clearPortEnabled.value = false;
      return;
    }
    if (portStatus.value === 'PENDING') {
      clearPortEnabled.value = true;
      if (dummyMode.value === 'NONLOT') {
        startEnabled.value = true;
        restartEnabled.value = true;
      } else {
        startEnabled.value = false;
        restartEnabled.value = response.data.PORTLOTNAME === batchId.value;
      }
      if (isReserved.value) startEnabled.value = false;
      return;
    }
    if (portStatus.value === 'INIT') {
      startEnabled.value = false;
      restartEnabled.value = dummyMode.value === 'NONLOT';
      clearPortEnabled.value = true;
      return;
    }
    startEnabled.value = !isReserved.value;
    restartEnabled.value = dummyMode.value === 'NONLOT';
    clearPortEnabled.value = true;
  }

  function selectMoveIn(row: FurnaceKjBatchLot): void {
    if (dummyMode.value === 'T' || dummyMode.value === 'NONLOT' || Number(row.COMMENTQTY || 0) <= 0)
      return;
    options.onOpenComments?.({
      lotId: row.LOTID,
      operation: row.OPERATION,
      subOperation: row.SUBOPERATION,
      processStep: row.PROCESSSTEP,
      operSequence: row.OPERSEQUENCE,
    });
  }

  async function executeStart(): Promise<void> {
    await executeCommand('START');
  }

  async function executeReStart(): Promise<void> {
    await executeCommand('RESTART');
  }

  async function executeCommand(command: 'START' | 'RESTART'): Promise<void> {
    if (!equipmentInput.value) {
      showDialog('alert', '에  러', '진행장비를 입력하세요.');
      return;
    }
    if (!selectedRecipe.value) {
      showDialog('alert', '에  러', '진행 Rcp를 선택하세요.');
      return;
    }
    if (command === 'START' && dummyMode.value === 'F') {
      let eligibleLotCount = 0;
      for (const row of batchRows.value) {
        const commentCheck = await api.fetchLotInfo({
          LOTID: row.LOTID,
          FACILITY: mainStore.facility,
          USERID: mainStore.operatorId,
        });
        if (!commentCheck.ok) {
          showDialog('alert', '에  러', commentCheck.message);
          return;
        }
        const unreadCount = Number(commentCheck.data.NWCOMMENTQTY || 0);
        if (unreadCount > 0) {
          showDialog(
            'alert',
            '에  러',
            `[${row.LOTID}] 읽지 않은 작업성 COMMENT가 있습니다.\n읽은후 진행하세요.`,
          );
          return;
        }
        if (row.LOTID === 'D/W' || !row.LOTID) continue;
        if (row.LOTSTATE !== 'WIP') {
          showDialog(
            'alert',
            '에  러',
            `[${row.LOTID}]는 [${row.LOTSTATE}]상태로\nMOVE IN할수 없습니다.`,
          );
          startEnabled.value = true;
          return;
        }
        if (row.STATUS !== 'WAIT') {
          showDialog(
            'alert',
            '에  러',
            `[${row.LOTID}]는 WAIT상태가 아닙니다.\nMOVE IN할수 없습니다.`,
          );
          startEnabled.value = true;
          return;
        }
        eligibleLotCount += 1;
      }
      if (eligibleLotCount <= 0) {
        showDialog('alert', '에  러', 'MOVE IN할 LOT이 없습니다.');
        startEnabled.value = true;
        return;
      }
    }
    pendingCommand.value = command;
    recipeConfirmationOpen.value = true;
  }

  async function confirmRecipeAction(): Promise<void> {
    recipeConfirmationOpen.value = false;
    isProcessing.value = true;
    const lotList =
      dummyMode.value === 'NONLOT' ? '' : batchRows.value.map((row) => `'${row.LOTID}'`).join(',');
    try {
      const response = await api.startKjRemote({
        MACHINENAME: equipmentInput.value,
        BATCHID: batchId.value,
        RECIPENAME: selectedRecipe.value,
        EVENTUSER: mainStore.operatorId,
        PORTNAME: selectedPort.value,
        CMDTYPE: pendingCommand.value === 'START' ? 'S' : 'R',
        LOTLIST: lotList,
        ISDUMMY: dummyMode.value,
        LOTNAME: lotInput.value,
        CHKNOBATCH: 'F',
      });
      if (!response.ok) {
        showDialog('alert', '에  러', response.message);
        return;
      }
      options.onSuccess?.(lotInput.value);
    } catch (error) {
      showDialog(
        'alert',
        '에  러',
        error instanceof Error ? error.message : 'Furnace KJ 요청에 실패하였습니다.',
      );
    } finally {
      isProcessing.value = false;
    }
  }

  function cancelRecipeAction(): void {
    recipeConfirmationOpen.value = false;
  }

  function executeClearPort(): void {
    if (!selectedPort.value) {
      showDialog('alert', '에  러', '진행 Port를 먼저 선택하세요.');
      return;
    }
    showDialog(
      'confirm',
      '확  인',
      `PORT [${selectedPort.value}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
      'clear-port',
    );
  }

  async function confirmDialogAction(): Promise<void> {
    if (!dialog.value.open || isDialogClosing.value) return;

    const action = dialog.value.action;
    closeDialog();
    if (action === 'recipe-warning') {
      const multiMoveWarning = pendingMultiMoveWarning.value;
      pendingMultiMoveWarning.value = '';
      await continueRecipeInfo(multiMoveWarning);
    }
    if (action === 'recipe-multimove-warning') await getINLKChk();
    if (action === 'clear-port') await confirmClearPort();
    if (action === 'change-equipment-status') {
      const didChange = await changeEQPStatus();
      if (didChange) {
        showDialog(
          'confirm',
          '확  인',
          '장비상태가 변경되었습니다.\n진행장비의 RECIPE를 다시 요청 하시겠습니까?',
          'retry-recipe',
        );
      }
    }
    if (action === 'retry-recipe') await getRecipeInfo();
  }

  function cancelDialogAction(): void {
    if (!dialog.value.open || isDialogClosing.value) return;

    if (dialog.value.action === 'recipe-warning') {
      pendingMultiMoveWarning.value = '';
      equipmentInput.value = '';
      equipment.value = undefined;
      recipeOptions.value = [];
      selectedRecipe.value = '';
    }
    closeDialog();
  }

  async function confirmClearPort(): Promise<void> {
    closeDialog();
    const response = await api.clearPort({
      MACHINENAME: equipment.value?.MAINEQPID ?? equipmentInput.value,
      PORTNAME: selectedPort.value,
    });
    if (!response.ok) {
      showDialog('alert', '에  러', response.message);
      return;
    }
    showDialog('success', 'PORT 초기화', '해당 PORT 초기화 명령을 전송하였습니다.');
    await setPortState();
  }

  async function changeEQPStatus(): Promise<boolean> {
    const response = await api.changeEquipmentStatus({
      MAINEQPID: equipment.value?.MAINEQPID ?? '',
      FACILITY: mainStore.facility,
      STATUS: 'R  가동중',
      REASONCODE: 'RR001',
      EVENTNAME: 'PDA_MVIN_UP',
      USERID: mainStore.operatorId,
      USERNAME: mainStore.operatorName,
      REMARK: '',
    });
    if (!response.ok) {
      showDialog('alert', '에  러', response.message);
      return false;
    }
    return true;
  }

  function cancelPage(): void {
    options.onCancel?.();
  }

  return {
    batchId,
    cancelPage,
    cancelRecipeAction,
    batchRows,
    cancelDialogAction,
    changeEQPStatus,
    clearPortEnabled,
    createDraft,
    closeDialog,
    confirmDialogAction,
    confirmClearPort,
    confirmRecipeAction,
    dialog,
    dummyMode,
    equipment,
    equipmentInput,
    executeClearPort,
    executeReStart,
    executeStart,
    externalMachine,
    getBatchListByLot,
    getINLKChk,
    getLotInfo,
    getMachineInfo,
    getRecipeInfo,
    initialize,
    onDialogAfterClose,
    isEquipmentLocked,
    isLoading,
    isPortLocked,
    isProcessing,
    isRecipeLocked,
    isReserved,
    lotInfo,
    lotInput,
    onEquipmentEnter,
    pendingCommand,
    portOptions,
    portStatus,
    recipeConfirmationOpen,
    recipeOptions,
    restartButtonLabel,
    restartEnabled,
    selectMoveIn,
    selectPort,
    selectRecipe,
    selectedPort,
    selectedRecipe,
    setEquipmentInput,
    setPortState,
    standardMachine,
    standardMachineError,
    startButtonLabel,
    startEnabled,
  };
}
