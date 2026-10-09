import { computed, reactive, ref } from 'vue';

import { COMMON_FIELD } from '../../../constants/common-strings';
import {
  BATCHLISTBYLOT,
  CHANGEEQPSTATUS,
  FURNACE_KJCHECK,
  FURNACEDUMMYRCP,
  FURNACEINTLKCHECK,
  FurnaceremoteStart_KEC,
  LOTINFO,
  MACHINEPORTCLEAR,
  MACHINEPORTSTATUS_KJ,
  RECIPEINFO,
  REMOTEEQPINFO,
} from '../services/remote-furnace-kec.api';
import type {
  RemoteFurnaceKecActionAvailability,
  RemoteFurnaceKecApi,
  RemoteFurnaceKecBatchRow,
  RemoteFurnaceKecDialog,
  RemoteFurnaceKecDummyMode,
  RemoteFurnaceKecPortCommand,
} from '../types/remote-furnace-kec.types';
import {
  buildKecLotList,
  getKecBatchItems,
  getKecPortAvailability,
  isKecEquipmentInGroup,
  mapKecBatchRows,
  parseKecEquipmentBarcode,
  readKecString,
} from '../utils/remote-furnace-kec.util';

const ERROR_TITLE = COMMON_FIELD.TXTDIALOGTITLE_ERROR;
const OK_TITLE = COMMON_FIELD.TXTDIALOGTITLE_OK;

const defaultApi: RemoteFurnaceKecApi = {
  BATCHLISTBYLOT,
  CHANGEEQPSTATUS,
  FURNACEDUMMYRCP,
  FURNACEINTLKCHECK,
  FURNACE_KJCHECK,
  LOTINFO,
  MACHINEPORTCLEAR,
  MACHINEPORTSTATUS_KJ,
  REMOTEEQPINFO,
  RECIPEINFO,
  FurnaceremoteStart_KEC,
};

export interface RemoteFurnaceKecOptions {
  lotId: string;
  facility: string;
  operatorId: string;
  operatorName: string;
  dialog: RemoteFurnaceKecDialog;
  confirmRecipe(recipeName: string, lotId: string): Promise<boolean>;
  onSuccess(): void;
  onComment(row: RemoteFurnaceKecBatchRow): void;
  api?: RemoteFurnaceKecApi;
}

const EMPTY_AVAILABILITY: RemoteFurnaceKecActionAvailability = {
  clearPort: false,
  start: false,
  restart: false,
  enter: false,
  enterStart: false,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function equipmentGroupMatches(equipmentGroup: string, equipmentId: string): boolean {
  if (equipmentGroup !== '' && !equipmentGroup.includes('-')) return true;
  return isKecEquipmentInGroup(equipmentGroup, equipmentId);
}

export function useRemoteFurnaceKec(options: RemoteFurnaceKecOptions) {
  const api = options.api ?? defaultApi;
  const lotId = ref(options.lotId);
  const lotLocked = computed(() => Boolean(options.lotId));
  const dummyMode = ref<RemoteFurnaceKecDummyMode>(options.lotId ? 'F' : 'NONLOT');
  const restartMode = ref(false);
  const loading = ref(false);
  const equipmentId = ref('');
  const standardEquipment = ref('');
  const isStandardEquipmentChanged = ref(false);
  const recipe = ref('');
  const isRecipeChanged = ref(false);
  const batchId = ref('');
  const externalMachine = ref('');
  const selectedRecipe = ref<string | null>(null);
  const recipeOptions = ref<string[]>([]);
  const portOptions = ref<string[]>([]);
  const selectedPort = ref<string | null>(null);
  const portState = ref('');
  const mwfOptions = ['1', '2', '3', '4', '5', '6'];
  const mwfPosition = ref(2);
  const rows = ref<RemoteFurnaceKecBatchRow[]>([]);
  const selectedRowId = ref<string>();
  const availability = reactive({ ...EMPTY_AVAILABILITY });
  const operation = ref('');
  const subOperation = ref('');
  const product = ref('');
  const processStep = ref('');
  const operationType = ref('');
  const operSequence = ref('');
  const nwCommentQuantity = ref(0);
  const mainEquipmentId = ref('');
  const equipmentArea = ref('');
  const equipmentType = ref('');
  const searchArea: string = '';
  const searchOperationType: string = '';
  const selectedMwf = computed(() =>
    mwfPosition.value === 0 ? null : (mwfOptions[mwfPosition.value - 1] ?? null),
  );
  const isNonLot = computed(() => dummyMode.value === 'NONLOT');
  let activeLoadingCount = 0;

  async function withLoading<T>(action: () => Promise<T>): Promise<T> {
    activeLoadingCount += 1;
    loading.value = true;
    try {
      return await action();
    } finally {
      activeLoadingCount -= 1;
      loading.value = activeLoadingCount > 0;
    }
  }

  function setAvailability(next: RemoteFurnaceKecActionAvailability): void {
    Object.assign(availability, next);
  }

  async function getFurnaceLotTarget(): Promise<string> {
    const result = await api.FURNACE_KJCHECK(lotId.value);
    return readKecString(result.CNT);
  }

  async function checkComment(targetLotId: string): Promise<boolean> {
    try {
      const response = await api.LOTINFO({ lotId: targetLotId, facility: options.facility }, false);
      const countValue = readKecString(response.NWCOMMENTQTY);
      if (countValue !== '' && Number(countValue) > 0) {
        await options.dialog.alert(
          ERROR_TITLE,
          `[${targetLotId}] 읽지 않은 작업성 COMMENT가 [${countValue}]가 있습니다.\n읽은후 진행하세요.`,
        );
        return false;
      }
      return true;
    } catch (error) {
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
      return false;
    }
  }

  async function getBatchListByLot(): Promise<void> {
    const result = await api.BATCHLISTBYLOT(lotId.value, options.facility, recipe.value);
    const batchItems = getKecBatchItems(result.BATCHITEMS);
    const nextRows = mapKecBatchRows(batchItems, dummyMode.value, result);
    const mwfCount = readKecString(result.MWCOUNT);
    if (mwfCount !== '') {
      const position = Number(mwfCount);
      if (Number.isInteger(position)) mwfPosition.value = Math.max(0, Math.min(position, 5));
    }
    nwCommentQuantity.value = Number(readKecString(result.NWCOMMENTQTY)) || 0;
    rows.value = nextRows;
    selectedRowId.value = undefined;

    if (nextRows.length === 0) {
      await options.dialog.alert(ERROR_TITLE, 'MOVE IN할 LOT이 없습니다.');
      return;
    }

    if (nwCommentQuantity.value > 0) {
      await options.dialog.alert('정보', '작업성 COMMENT가 있습니다.\n읽은후 진행하세요');
    }
  }

  async function getDummyRecipeInfo(): Promise<void> {
    const result = await api.FURNACEDUMMYRCP(mainEquipmentId.value);
    const recipeList = readKecString(result.RECIPE);
    recipeOptions.value = recipeList.split(',');
    selectedRecipe.value = recipeOptions.value[0] || null;
    if (selectedRecipe.value) await getINLKChk();
  }

  async function getRecipeInfo(): Promise<void> {
    try {
      const result = await api.RECIPEINFO({
        lotId: lotId.value,
        operation: operation.value,
        subOperation: subOperation.value,
        product: product.value,
        equipmentId: mainEquipmentId.value,
        operationType: operationType.value,
        facility: options.facility,
        isDummy: dummyMode.value,
      });

      const etchMessage = readKecString(result.ETCHMESSAGE);
      if (etchMessage && !(await options.dialog.confirm(OK_TITLE, etchMessage))) {
        equipmentId.value = '';
        return;
      }

      const multiMoveMessage = readKecString(result.MULTIMOVEINACTION);
      if (multiMoveMessage) await options.dialog.alert('WARNING', multiMoveMessage);

      recipe.value = readKecString(result.RECIPE);
      recipeOptions.value = recipe.value ? [recipe.value] : [];
      selectedRecipe.value = recipeOptions.value[0] ?? null;
      if (selectedRecipe.value) await getINLKChk();
    } catch (error) {
      const message = errorMessage(error);
      if (message === '현재 장비 상태가 비부하DOWN 입니다.') {
        const change = await options.dialog.confirm(
          OK_TITLE,
          '현재 장비 상태가 가동중(RUN)이 아닙니다.\n장비 상태를 가동중(RUN)으로 변경 하시겠습니까?',
        );
        if (change) await changeEQPStatus();
      } else {
        await options.dialog.alert(ERROR_TITLE, message);
      }
    }
  }

  async function getMachineInfo(inputEquipmentId: string): Promise<void> {
    let processEquipmentId = inputEquipmentId;
    mainEquipmentId.value = inputEquipmentId;
    const shouldRequestEquipment =
      searchOperationType !== 'M' &&
      !['FAB2', 'FAB5', 'FAB7'].includes(standardEquipment.value) &&
      searchArea !== 'PQC';

    if (shouldRequestEquipment) {
      try {
        const result = await api.REMOTEEQPINFO(inputEquipmentId);
        const receivedMainEquipment = readKecString(result.MAINEQPID);
        processEquipmentId = readKecString(result.PROCEQPID);
        equipmentArea.value = readKecString(result.EQPAREA);
        equipmentType.value = readKecString(result.EQPTYPE);
        const pmMessage = readKecString(result.PMMESSAGE);
        const cycleMessage = readKecString(result.CYCLE_MESSAGE);
        if (pmMessage) await options.dialog.alert('PM주기 경고', pmMessage);

        portOptions.value = readKecString(result.PORTNAME).split(',');
        selectedPort.value = portOptions.value[0] ?? null;
        mainEquipmentId.value = receivedMainEquipment;

        if (cycleMessage) {
          for (const cycle of cycleMessage.split('/')) {
            await options.dialog.alert('계측 주기 알림', cycle);
          }
        }

        if (
          dummyMode.value === 'F' &&
          !equipmentGroupMatches(standardEquipment.value, processEquipmentId)
        ) {
          await options.dialog.alert(
            ERROR_TITLE,
            `[${processEquipmentId}]장비가 기준장비에 존재하지 않습니다.`,
          );
          equipmentId.value = '';
          return;
        }
      } catch (error) {
        equipmentArea.value = '';
        equipmentType.value = '';
        mainEquipmentId.value = '';
        await options.dialog.alert(ERROR_TITLE, errorMessage(error));
        equipmentId.value = '';
        return;
      }
    }

    equipmentId.value = processEquipmentId;
    if (selectedPort.value) await setPortState();
    if (dummyMode.value === 'F') await getRecipeInfo();
    else await getDummyRecipeInfo();
  }

  async function getLotInfoInternal(): Promise<void> {
    if (!lotId.value) return;
    setAvailability(EMPTY_AVAILABILITY);

    try {
      const result = await api.LOTINFO(
        { lotId: lotId.value, facility: options.facility, operatorId: options.operatorId },
        true,
      );
      product.value = readKecString(result.PRODUCT);
      operation.value = readKecString(result.OPERATION);
      subOperation.value = readKecString(result.SUBOPERATION);
      processStep.value = readKecString(result.PROCESSSTEP);
      operationType.value = readKecString(result.OPTYPE);
      operSequence.value = readKecString(result.OPERSEQUENCE);
      batchId.value = readKecString(result.BATCHID);
      recipe.value = readKecString(result.RECIPE);
      externalMachine.value = readKecString(result.OXMACHINE);
      nwCommentQuantity.value = Number(readKecString(result.NWCOMMENTQTY)) || 0;

      const changedRecipe = readKecString(result.CHANGERECIPE);
      isRecipeChanged.value = Boolean(changedRecipe && changedRecipe !== recipe.value);
      const equipmentGroup = readKecString(result.EQPGROUP);
      const changedEquipmentGroup = readKecString(result.CHANGEEQPGROUP);
      isStandardEquipmentChanged.value = Boolean(
        changedEquipmentGroup && changedEquipmentGroup !== standardEquipment.value,
      );
      standardEquipment.value = isStandardEquipmentChanged.value
        ? changedEquipmentGroup
        : equipmentGroup;

      for (const [key, title, message] of [
        [
          readKecString(result.MEASTYPE),
          '검사대상',
          readKecString(result.SAMPLINGMSG)
            ? `동일한 Batch에 검사대상 Lot이 있습니다.\n${readKecString(result.SAMPLINGMSG)}`
            : readKecString(result.SAMPLINGREASON) === 'Y'
              ? 'UV검사 대상 Lot 입니다.'
              : `${readKecString(result.MEASTYPE)} 검사 대상 Lot 입니다.`,
        ],
        [
          readKecString(result.MEASOPERATIONNAME) && readKecString(result.FQCLOTNAME),
          '검사대상',
          `${readKecString(result.FQCLOTNAME)} 은 공정이물 검사 대상 Lot 입니다.`,
        ],
        [
          readKecString(result.MEASOPERATIONNAME) && readKecString(result.FICDLOT),
          '검사대상',
          `${readKecString(result.FICDLOT)} 은 FICD검사 대상 Lot 입니다.`,
        ],
        [readKecString(result.ETCMSG), '정보', readKecString(result.ETCMSG)],
      ] as const) {
        if (key) await options.dialog.alert(title, message);
      }

      const status = readKecString(result.STATUS);
      const state = readKecString(result.STATE);
      const holdStatus = readKecString(result.HOLDSTATUS);
      if (status === 'RUN') {
        await options.dialog.alert(ERROR_TITLE, '이미 MOVE IN된 LOT입니다.');
        availability.start = false;
        availability.enter = false;
        availability.enterStart = false;
        return;
      }
      if (state !== 'WIP') {
        await options.dialog.alert(ERROR_TITLE, `${state} 상태 입니다. 작업예약을 할 수 없습니다.`);
        availability.start = false;
        availability.enter = false;
        availability.enterStart = false;
        return;
      }
      if (holdStatus === 'ONHOLD') {
        await options.dialog.alert(ERROR_TITLE, 'HOLD된 LOT입니다. 작업예약을 할 수 없습니다.');
        availability.start = false;
        availability.enter = false;
        availability.enterStart = false;
        return;
      }

      const inlineSampleMessage = readKecString(result.INLINESAMPLEMESSGE);
      if (inlineSampleMessage) await options.dialog.alert(OK_TITLE, inlineSampleMessage);
      if (readKecString(result.PROCESSNAME) === 'MW_TEST' && batchId.value !== '') {
        dummyMode.value = 'T';
      }

      if (!batchId.value) {
        await options.dialog.alert(OK_TITLE, 'Batch 생성 후 LOT을 다시 조회하여 주세요');
        return;
      }

      await getBatchListByLot();
      const reservedBy = readKecString(result.LOTRESUSER);
      if (reservedBy) {
        restartMode.value = true;
        await getMachineInfo(readKecString(result.MACHINENAME));
        const reservedPort = readKecString(result.PORTNAME);
        if (portOptions.value.includes(reservedPort)) selectedPort.value = reservedPort;
        const reservedRecipe = readKecString(result.MACHINERECIPENAME);
        recipeOptions.value = [reservedRecipe];
        selectedRecipe.value = reservedRecipe || null;
        await setPortState();
      }
    } catch (error) {
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
      availability.start = false;
      availability.enter = false;
      availability.enterStart = false;
    }
  }

  async function getLotInfo(): Promise<void> {
    await withLoading(getLotInfoInternal);
  }

  async function getINLKChk(): Promise<void> {
    if (dummyMode.value === 'T' || dummyMode.value === 'NONLOT' || restartMode.value) return;
    try {
      const result = await api.FURNACEINTLKCHECK(
        equipmentId.value,
        batchId.value,
        selectedRecipe.value ?? '',
        rows.value.map((row) => row.LOTID).join(','),
      );
      const ret = readKecString(result.RET);
      if (ret) await options.dialog.alert(ERROR_TITLE, ret);
      if (readKecString(result.INTLK) === 'Y') {
        availability.start = false;
        availability.restart = false;
        availability.enter = false;
        availability.enterStart = false;
      }
    } catch {
      return;
    }
  }

  async function setPortState(): Promise<void> {
    if (!selectedPort.value) return;
    portState.value = '';
    availability.clearPort = false;

    try {
      const result = await api.MACHINEPORTSTATUS_KJ(
        mainEquipmentId.value,
        selectedPort.value,
        lotId.value,
        selectedRecipe.value ?? '',
      );
      portState.value = readKecString(result.PORTSTATENAME1);
      if (!portState.value) {
        await options.dialog.alert(
          '장비 MASSAGE',
          'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
        );
      }

      setAvailability(
        getKecPortAvailability(
          portState.value,
          readKecString(result.BATCH_CNT),
          readKecString(result.EXIST_BATCH),
        ),
      );
      const batchCount = readKecString(result.BATCH_CNT);
      if (
        ((portState.value === 'IDLE' || portState.value === 'READY') &&
          batchCount !== '0' &&
          !(batchCount === '1' && readKecString(result.EXIST_BATCH) === '1')) ||
        (portState.value === 'RUN' && batchCount === '2')
      ) {
        await options.dialog.alert(
          'MASSAGE',
          '이전 Batch 자동화 이력이 남아 있습니다.\nBatch 정보를 삭제하여주세요',
        );
      } else if (
        portState.value &&
        !['IDLE', 'READY', 'PENDING', 'RUN'].includes(portState.value)
      ) {
        await options.dialog.alert(
          '장비 MASSAGE',
          '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
        );
      }
    } catch (error) {
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
    }
  }

  async function changeEQPStatus(): Promise<void> {
    try {
      await api.CHANGEEQPSTATUS({
        equipmentId: mainEquipmentId.value,
        facility: options.facility,
        operatorId: options.operatorId,
        operatorName: options.operatorName,
      });
      const shouldReloadRecipe = await options.dialog.confirm(
        COMMON_FIELD.TXTDIALOGTITLE_OK,
        '장비상태가 변경되었습니다.\n진행장비의 RECIPE를 다시 요청 하시겠습니까?',
      );
      if (shouldReloadRecipe) await getRecipeInfo();
    } catch (error) {
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
    }
  }

  async function executeClearPortInternal(): Promise<void> {
    if (!selectedPort.value) {
      await options.dialog.alert(ERROR_TITLE, '진행 Port를 먼저 선택하세요.');
      return;
    }
    const confirmed = await options.dialog.confirm(
      OK_TITLE,
      `PORT [${selectedPort.value}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
      COMMON_FIELD.POSITIVEBTNSTR,
      COMMON_FIELD.NEGATIVEBTNSTR,
    );
    if (!confirmed) return;

    try {
      await api.MACHINEPORTCLEAR(mainEquipmentId.value, selectedPort.value);
      await options.dialog.alert('PORT 초기화', '해당 PORT 초기화 명령을 전송하였습니다.');
      await setPortState();
    } catch (error) {
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
    }
  }

  async function executeClearPort(): Promise<void> {
    await withLoading(executeClearPortInternal);
  }

  async function executeCommandInternal(command: RemoteFurnaceKecPortCommand): Promise<void> {
    if (!equipmentId.value) {
      await options.dialog.alert(ERROR_TITLE, '진행장비를 입력하세요.');
      return;
    }
    if (!selectedRecipe.value) {
      await options.dialog.alert(ERROR_TITLE, '진행 Rcp를 선택하세요.');
      return;
    }

    if (command !== 'restart' && dummyMode.value === 'F') {
      let eligibleLotCount = 0;
      availability.start = false;
      availability.enter = false;
      availability.enterStart = false;

      for (const row of rows.value) {
        if (!(await checkComment(row.LOTID))) return;
        if (row.LOTID === 'D/W' || row.LOTID === '') continue;
        if (row.LOTSTATE !== 'WIP') {
          await options.dialog.alert(
            ERROR_TITLE,
            `[${row.LOTID}]는 [${row.LOTSTATE}]상태로\nMOVE IN할수 없습니다.`,
          );
          availability.start = true;
          return;
        }
        if (row.STATUS !== 'WAIT') {
          await options.dialog.alert(
            ERROR_TITLE,
            `[${row.LOTID}]는 WAIT상태가 아닙니다.\nMOVE IN할수 없습니다.`,
          );
          availability.start = true;
          return;
        }
        eligibleLotCount += 1;
      }

      if (eligibleLotCount <= 0) {
        await options.dialog.alert(ERROR_TITLE, 'MOVE IN할 LOT이 없습니다.');
        availability.start = true;
        return;
      }
    }

    if (!(await options.confirmRecipe(selectedRecipe.value, lotId.value))) return;

    const commandTypes: Record<RemoteFurnaceKecPortCommand, 'S' | 'ENTER' | 'ENTER_START' | 'R'> = {
      start: 'S',
      restart: 'R',
      enter: 'ENTER',
      enterStart: 'ENTER_START',
    };
    const mwfCount = selectedMwf.value ?? '';
    try {
      await api.FurnaceremoteStart_KEC({
        machineName: equipmentId.value,
        batchId: batchId.value,
        recipeName: selectedRecipe.value,
        eventUser: options.operatorId,
        portName: selectedPort.value ?? 'null',
        commandType: commandTypes[command],
        lotList: buildKecLotList(rows.value, dummyMode.value),
        isDummy: dummyMode.value,
        lotName: lotId.value,
        checkNoBatch: 'F',
        stepRemove: 'F',
        mwfCount,
      });
      options.onSuccess();
    } catch (error) {
      if (typeof navigator !== 'undefined') navigator.vibrate?.(500);
      await options.dialog.alert(ERROR_TITLE, errorMessage(error));
    }
  }

  async function executeCommand(command: RemoteFurnaceKecPortCommand): Promise<void> {
    await withLoading(() => executeCommandInternal(command));
  }

  async function handleEquipmentEnter(rawValue: string): Promise<void> {
    const barcode = rawValue.toUpperCase();
    const parsedEquipmentId = parseKecEquipmentBarcode(barcode);
    if (!parsedEquipmentId) {
      equipmentId.value = '';
      await options.dialog.alert('READING ERROR', '진행할 장비를 읽어주세요.');
      return;
    }
    await withLoading(() => getMachineInfo(parsedEquipmentId));
  }

  function selectRow(row: RemoteFurnaceKecBatchRow): void {
    selectedRowId.value = row.LOTID;
    const parsedCommentCount = /^-?\d+$/.test(row.COMMENTQTY) ? Number(row.COMMENTQTY) : 0;
    if (parsedCommentCount === 0 || dummyMode.value === 'T' || isNonLot.value) return;
    options.onComment(row);
  }

  async function initialize(): Promise<void> {
    if (lotId.value) await getLotInfo();
  }

  async function refreshPortState(): Promise<void> {
    await withLoading(setPortState);
  }

  async function checkRecipeInterlock(): Promise<void> {
    await withLoading(getINLKChk);
  }

  return {
    availability,
    batchId,
    dummyMode,
    equipmentId,
    externalMachine,
    getFurnaceLotTarget,
    checkRecipeInterlock,
    getLotInfo,
    handleEquipmentEnter,
    initialize,
    isNonLot,
    isRecipeChanged,
    isStandardEquipmentChanged,
    loading,
    lotId,
    lotLocked,
    mwfOptions,
    mwfPosition,
    operSequence,
    operation,
    operationType,
    portOptions,
    portState,
    processStep,
    product,
    recipe,
    recipeOptions,
    restartMode,
    rows,
    selectRow,
    selectedMwf,
    selectedPort,
    selectedRecipe,
    selectedRowId,
    setPortState,
    standardEquipment,
    subOperation,
    executeClearPort,
    executeCommand,
    refreshPortState,
  };
}
