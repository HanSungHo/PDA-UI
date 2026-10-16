import { COMMON_FIELD } from 'src/constants/common-strings';
import { reactive } from 'vue';

import { remoteCvdApi } from '../services/remote-cvd.service';
import type {
  RemoteCvdApi,
  RemoteCvdMessageBody,
  RemoteCvdOptions,
  RemoteCvdResponse,
  RemoteCvdRestartRequest,
  RemoteCvdStartRequest,
  RemoteCvdState,
} from '../types/remote-cvd.types';
import {
  mapChamberValues,
  mapRecipeOptions,
  validateEquipmentGroup,
} from '../utils/remote-cvd.util';

const ERROR_TITLE = COMMON_FIELD.TXTDIALOGTITLE_ERROR;
const OK_TITLE = COMMON_FIELD.TXTDIALOGTITLE_OK;
const INFORM_TITLE = COMMON_FIELD.TXTDIALOGTITLE_INFORM;
const BODY_MISSING_ERROR = 'BODY가 존재하지 않습니다';

const initialPrecedeChoices = [
  { value: 'PT', label: 'P + T' },
  { value: 'P', label: 'PARTICLE' },
  { value: 'T', label: 'THICK' },
];

function createInitialState(lotId: string, facility: string): RemoteCvdState {
  return {
    lotId,
    portState: '',
    standardEquipment: '',
    isEquipmentGroupChanged: false,
    isRecipeChanged: false,
    equipmentId: '',
    recipeOptions: [],
    selectedRecipe: '',
    portOptions: [],
    selectedPort: '',
    jobCode: '',
    product: '',
    currentOperation: '',
    quantity: '',
    facility,
    customer: '',
    saleType: '',
    engineer: '',
    packing: '',
    goodChips: '',
    commentCount: '',
    qTime: '',
    chamberValues: { A: '', B: '', C: '', D: '' },
    chamberLimits: { A: '', B: '', C: '', D: '' },
    precedeOptionsVisible: false,
    precedeChoices: initialPrecedeChoices.map((choice) => ({ ...choice })),
    selectedPrecede: '',
    precedeTypeOptions: ['선행', '주기', '추검'],
    selectedPrecedeType: '주기',
    rcpConditionsVisible: false,
    readCommentDisabled: true,
    equipmentCancelDisabled: true,
    doorOpenDisabled: true,
    clearPortDisabled: true,
    startDisabled: true,
    restartDisabled: true,
    equipmentDisabled: false,
    recipeDisabled: false,
    portDisabled: false,
    loading: false,
    dialogTitle: '',
    dialogMessage: '',
    dialogKind: 'alert',
  };
}

function bodyOf(response: RemoteCvdResponse): RemoteCvdMessageBody {
  return response.messageBody;
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSuccess(response: RemoteCvdResponse): boolean {
  return response.isSuccess;
}

function errorOf(response: RemoteCvdResponse): string {
  return response.errorMessage || 'Message failed.';
}

export function useRemoteCvd(options: RemoteCvdOptions) {
  const api: RemoteCvdApi = options.api ?? remoteCvdApi;
  const state = reactive(createInitialState(options.lotId, options.facility));
  const loadingCount = { value: 0 };

  // The legacy Activity never assigns these values; retain their default state for parity.
  const searchArea: string = '';
  const searchOpType: string = '';
  let searchOperation = '';
  let searchSubOperation = '';
  let searchProcessStep = '';
  let searchOperSeq = '';
  let searchSuperEqpId = '';
  let searchEqpArea = '';
  let searchEqpType = '';
  let isMainEqp = '';
  let isPrecede = '';
  let isQTimeHold = '';
  let scrubber = '';
  const operationType = '';
  let reservedMode = false;

  function beginLoading(): void {
    loadingCount.value += 1;
    state.loading = true;
  }

  function endLoading(): void {
    loadingCount.value = Math.max(0, loadingCount.value - 1);
    state.loading = loadingCount.value > 0;
  }

  function clearPortState(): void {
    state.portState = '';
  }

  function clearPortInfo(): void {
    state.portOptions = [];
    state.selectedPort = '';
    state.clearPortDisabled = true;
    state.restartDisabled = true;
    clearPortState();
  }

  function clearMachineInfo(): void {
    isMainEqp = '';
    searchSuperEqpId = '';
    searchEqpArea = '';
    searchEqpType = '';
    state.doorOpenDisabled = true;
    state.chamberValues = { A: '', B: '', C: '', D: '' };
    state.chamberLimits = { A: '', B: '', C: '', D: '' };
    clearPortInfo();
  }

  function clearData(): void {
    state.commentCount = '';
    state.standardEquipment = '';
    state.isEquipmentGroupChanged = false;
    state.isRecipeChanged = false;
    state.jobCode = '';
    state.product = '';
    state.currentOperation = '';
    state.quantity = '';
    state.facility = options.facility;
    state.customer = '';
    state.saleType = '';
    state.engineer = '';
    state.packing = '';
    state.goodChips = '';
    state.recipeOptions = [];
    state.selectedRecipe = '';
    state.readCommentDisabled = true;
    state.equipmentCancelDisabled = !state.equipmentId;
    state.startDisabled = true;
    state.equipmentDisabled = false;
    state.recipeDisabled = false;
    state.portDisabled = false;
    state.qTime = '';
    state.rcpConditionsVisible = false;
    searchOperation = '';
    searchSubOperation = '';
    searchProcessStep = '';
    searchOperSeq = '';
    isQTimeHold = '';
    reservedMode = false;
    clearMachineInfo();
  }

  async function showError(message: string): Promise<void> {
    await options.dialog.alert(ERROR_TITLE, message);
  }

  async function showInfo(title: string, message: string): Promise<void> {
    await options.dialog.alert(title, message);
  }

  function setPortColorClass(portState: string): void {
    state.portState = portState;
  }

  async function searchData(lotId: string): Promise<void> {
    state.lotId = lotId;
    clearData();
    if (!lotId) return;

    beginLoading();
    try {
      const response = await api.lotInfo('MVIN', lotId, options.facility);
      if (!isSuccess(response)) {
        await showError(errorOf(response));
        return;
      }

      const messageBody = bodyOf(response);
      const product = messageBody.PRODUCT ?? '';
      const facility = messageBody.FACILITY ?? '';
      let operation = messageBody.OPERATION ?? '';
      let processStep = messageBody.PROCESSSTEP ?? '';
      const customer = messageBody.CUSTOMER ?? '';
      const category = messageBody.CATEGORY ?? '';
      const engineer = messageBody.ENGINEER ?? '';
      const packing = messageBody.PACKING ?? '';
      const quantity = messageBody.QUANTITY ?? '';
      const goodChips = messageBody.GOODCHIPS ?? '';
      const recipe = messageBody.RECIPE ?? '';
      const changeRecipe = messageBody.CHANGERECIPE ?? '';
      const equipmentGroup = messageBody.EQPGROUP ?? '';
      const changeEquipmentGroup = messageBody.CHANGEEQPGROUP ?? '';
      const commentCount = messageBody.COMMENTQTY ?? '';
      const newCommentCount = messageBody.NWCOMMENTQTY ?? '';
      const area = messageBody.AREA ?? '';
      const jobCode = messageBody.JOBCODE ?? '';
      const subOperation = messageBody.SUBOPERATION ?? '';
      const lotState = messageBody.STATE ?? '';
      const holdStatus = messageBody.HOLDSTATUS ?? '';
      const operSequence = messageBody.OPERSEQUENCE ?? '';
      const reservedUser = messageBody.LOTRESUSER ?? '';
      const reservedMachine = messageBody.MACHINENAME ?? '';
      const reservedPort = messageBody.PORTNAME ?? '';
      const reservedRecipe = messageBody.MACHINERECIPENAME ?? '';

      if (operation === '10000') {
        operation = '10005';
        processStep = 'LASER MARKING';
      }

      if (lotState === 'RUN') {
        await showError('이미 MOVE IN된 LOT입니다. 자동화 진행이 불가합니다.');
        state.equipmentDisabled = true;
        return;
      }
      if (lotState !== 'WIP' && operation !== '10005') {
        await showError(`${lotState} 상태 입니다. 자동화 진행이 불가합니다.`);
        state.equipmentDisabled = true;
        return;
      }
      if (holdStatus === 'ONHOLD') {
        await showError('HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
        state.equipmentDisabled = true;
        return;
      }
      if (area === 'PHOTO') {
        await showError('PHOTO 진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.');
        state.equipmentDisabled = true;
        return;
      }
      if (area === 'IMP') {
        await showError('IMP 진행 LOT입니다. IMP 자동화기능을 이용해 주세요.');
        state.equipmentDisabled = true;
        return;
      }

      state.commentCount = commentCount;
      state.standardEquipment =
        changeEquipmentGroup && changeEquipmentGroup !== equipmentGroup
          ? changeEquipmentGroup
          : equipmentGroup;
      state.isEquipmentGroupChanged = Boolean(
        changeEquipmentGroup && changeEquipmentGroup !== equipmentGroup,
      );
      state.isRecipeChanged = Boolean(changeRecipe && recipe !== changeRecipe);
      state.product = product;
      state.jobCode = jobCode;
      state.currentOperation = `${processStep}(${operation}${subOperation})`;
      state.quantity = quantity;
      state.facility = facility;
      state.customer = customer;
      state.saleType = category;
      state.engineer = engineer;
      state.packing = packing;
      state.goodChips = goodChips;
      state.readCommentDisabled = !(Number(commentCount) > 0);
      state.equipmentCancelDisabled = !state.equipmentId;
      state.startDisabled = false;

      searchOperation = operation;
      searchSubOperation = subOperation;
      searchProcessStep = processStep;
      searchOperSeq = operSequence;

      if (messageBody.ETCMSG) await showInfo('정보', messageBody.ETCMSG);
      if (Number(newCommentCount) > 0) {
        await showInfo(
          OK_TITLE,
          `읽지 않은 작업성 COMMENT가 [${newCommentCount}]가 있습니다.\n읽은후 진행하세요.`,
        );
      }

      if (reservedUser) {
        reservedMode = true;
        state.equipmentDisabled = true;
        state.recipeDisabled = true;
        state.portDisabled = true;
        state.startDisabled = true;
        state.equipmentId = reservedMachine;
        await getMachineInfo(reservedMachine);
        if (state.portOptions.includes(reservedPort)) {
          state.selectedPort = reservedPort;
          await setPortState();
        }
        state.recipeOptions = reservedRecipe ? [reservedRecipe] : [];
        state.selectedRecipe = reservedRecipe;
        if (reservedRecipe) await memorizationRecipe();
        state.startDisabled = true;
      }
    } catch (error) {
      await showError(error instanceof Error ? error.message : String(error));
    } finally {
      endLoading();
    }
  }

  function secondCheck(equipmentId: string): string {
    scrubber = '';
    const hyphenCount = [...equipmentId].filter((character) => character === '-').length;
    if (hyphenCount === 2 && !['RD-51-05', 'R-6-1', 'R-67-1'].includes(equipmentId)) {
      scrubber = equipmentId.slice(-1);
      return equipmentId.slice(0, -2);
    }
    return equipmentId;
  }

  async function onEquipmentEnter(rawValue: string): Promise<void> {
    const normalized = rawValue.trim().toUpperCase();
    if (!normalized.startsWith('EQP-')) {
      await showError('진행할 장비를 읽어주세요.');
      state.equipmentId = '';
      return;
    }

    const parsed = normalized.slice('EQP-'.length);
    const equipmentId = parsed ? parsed.slice(0, -1) : '';
    if (!equipmentId) {
      await showError('진행할 장비를 읽어주세요.');
      state.equipmentId = '';
      return;
    }

    state.equipmentId = secondCheck(equipmentId);
    beginLoading();
    try {
      await getMachineInfo(state.equipmentId);
    } finally {
      endLoading();
    }
  }

  async function getMachineInfo(equipmentId: string): Promise<void> {
    clearMachineInfo();
    isMainEqp = equipmentId;
    let processEquipmentId = equipmentId;

    const bypassRemoteEquipmentLookup =
      searchOpType === 'M' ||
      ['FAB2', 'FAB5', 'FAB7'].includes(state.standardEquipment) ||
      searchArea === 'PQC';

    if (!bypassRemoteEquipmentLookup) {
      const response = await api.remoteEqpInfo(equipmentId);
      if (!isSuccess(response)) {
        await showError(errorOf(response));
        state.equipmentId = '';
        return;
      }

      const messageBody = bodyOf(response);
      const mainEquipmentId = messageBody.MAINEQPID ?? '';
      processEquipmentId = messageBody.PROCEQPID ?? '';
      const equipmentArea = messageBody.EQPAREA ?? '';
      const equipmentType = messageBody.EQPTYPE ?? '';
      state.doorOpenDisabled = messageBody.ISDOOROPEN !== 'Y';

      if (messageBody.PMMESSAGE) await showInfo('PM주기 경고', messageBody.PMMESSAGE);

      let portOptions = splitList(messageBody.PORTNAME ?? '');
      if (
        ['SEQUEL', 'CONCEPT2-SEQUEL'].includes(equipmentType) ||
        equipmentId.startsWith('EC04-1') ||
        equipmentId.startsWith('EC04-2')
      ) {
        if (equipmentId.endsWith('A')) portOptions = ['1', '2'];
        else if (equipmentId.endsWith('B')) portOptions = ['3', '4'];
      }
      state.portOptions = portOptions;

      if (scrubber && portOptions.includes(scrubber)) state.selectedPort = scrubber;

      const cycleMessages = messageBody.CYCLE_MESSAGE ?? '';
      if (cycleMessages) {
        for (const cycleMessage of cycleMessages.split('/')) {
          await showInfo('계측 주기 알림', cycleMessage);
        }
      }

      isMainEqp = processEquipmentId;
      searchSuperEqpId = mainEquipmentId;
      searchEqpArea = equipmentArea;
      searchEqpType = equipmentType;

      const chambers = mapChamberValues(messageBody);
      state.chamberValues = { A: '', B: '', C: '', D: '' };
      state.chamberLimits = { A: '', B: '', C: '', D: '' };
      for (const chamber of chambers) {
        state.chamberValues[chamber.name] = chamber.value;
        state.chamberLimits[chamber.name] = chamber.limit;
      }

      if (!validateEquipmentGroup(state.standardEquipment, processEquipmentId)) {
        await showError(`[${processEquipmentId}]장비가 기준장비에 존재하지 않습니다.`);
        state.equipmentId = '';
        return;
      }
    } else {
      searchSuperEqpId = equipmentId;
      searchEqpArea = '';
      searchEqpType = '';
      state.portOptions = [];
    }

    state.equipmentId = processEquipmentId;
    await getRecipeInfo();
  }

  async function getRecipeInfo(): Promise<void> {
    const response = await api.recipeInfo({
      isPhoto: 'N',
      lotId: state.lotId,
      operation: searchOperation,
      subOperation: searchSubOperation,
      product: state.product,
      equipmentId: isMainEqp,
      operationType,
      facility: options.facility,
    });

    if (!isSuccess(response)) {
      await showError(errorOf(response));
      state.recipeOptions = [];
      state.selectedRecipe = '';
      clearPortInfo();
      return;
    }

    const messageBody = bodyOf(response);
    if (messageBody.ETCHMESSAGE) {
      const accepted = await options.dialog.confirm(OK_TITLE, messageBody.ETCHMESSAGE);
      if (!accepted) {
        state.equipmentId = '';
        return;
      }
    }

    let recipeOptions = mapRecipeOptions(
      messageBody,
      searchEqpType,
      state.equipmentId,
      scrubber,
      state.customer,
    );

    if (searchEqpType === 'TE8500') {
      const teResponse = await api.teRcpSelection(isMainEqp, state.lotId);
      if (!isSuccess(teResponse)) {
        await showError(errorOf(teResponse));
        return;
      }
      const teBody = bodyOf(teResponse);
      const teFlag = teBody.TE_FLAG ?? '';
      const teRecipe = teBody.TE_RCP ?? '';
      const teOrders = teBody.TE_ORDERS ?? '';
      if (teFlag === 'Y') {
        if (teOrders === '0') {
          await showInfo(INFORM_TITLE, `Eng'r Inform\n${teRecipe} Recipe가 선택되었습니다.`);
          recipeOptions = [teRecipe, ...recipeOptions];
        } else if (teRecipe && recipeOptions.join(';') === teRecipe) {
          await showInfo(INFORM_TITLE, '동일 Recipe 입니다.');
        } else if (teRecipe) {
          await showInfo(INFORM_TITLE, 'Recipe가 선택되었습니다.');
          recipeOptions = [teRecipe, ...recipeOptions];
        }
      }
      state.recipeOptions = recipeOptions;
      state.selectedRecipe =
        teRecipe && recipeOptions.includes(teRecipe) ? teRecipe : (recipeOptions[0] ?? '');
    } else {
      state.recipeOptions = recipeOptions;
      state.selectedRecipe = recipeOptions[0] ?? '';
    }

    if (state.selectedRecipe) await memorizationRecipe();
    state.equipmentCancelDisabled = false;
    state.startDisabled = reservedMode;
  }

  async function memorizationRecipe(): Promise<void> {
    if (!state.selectedRecipe || !searchSuperEqpId) return;

    const response = await api.memorization(
      searchSuperEqpId,
      state.selectedRecipe,
      state.lotId,
      state.selectedPort,
      state.equipmentId,
      options.operatorId,
      searchEqpType,
    );

    if (!isSuccess(response)) {
      if (errorOf(response) === BODY_MISSING_ERROR) {
        state.rcpConditionsVisible = false;
        state.qTime = '';
      } else {
        await showError(errorOf(response));
        state.portDisabled = true;
        state.startDisabled = true;
      }
      return;
    }

    const messageBody = bodyOf(response);
    state.portDisabled = false;
    const popup = messageBody.POPUP ?? '';
    const commRcp = messageBody.ETCH_COMMRCP ?? '';
    state.rcpConditionsVisible = commRcp === 'Y';
    const qTime = messageBody['Q-TIME'] ?? '';
    state.qTime = qTime;

    const precedeFlag = messageBody.PRECEDE_FLAG ?? '';
    const precedeFlagEtch = messageBody.PRECEDE_FLAG_ETCH ?? '';
    if (precedeFlag) {
      state.precedeChoices = initialPrecedeChoices.map((choice) => ({ ...choice }));
      state.precedeOptionsVisible = true;
      state.selectedPrecede = precedeFlag.startsWith('PT')
        ? 'PT'
        : precedeFlag.startsWith('P')
          ? 'P'
          : precedeFlag.startsWith('T')
            ? 'T'
            : '';
      if (precedeFlag === '선행') state.selectedPrecedeType = '추검';
      isPrecede = precedeFlag;
    } else if (precedeFlagEtch) {
      state.precedeChoices = [
        { value: 'PT', label: 'C+P' },
        { value: 'P', label: 'CD' },
        { value: 'T', label: 'PQC' },
      ];
      state.precedeTypeOptions = ['SAMPLE', '1st MAIN', '추검'];
      state.selectedPrecedeType = '1st MAIN';
      state.selectedPrecede = '';
      state.precedeOptionsVisible = true;
      isPrecede = precedeFlagEtch;
    } else {
      state.precedeOptionsVisible = false;
      state.selectedPrecede = '';
      isPrecede = '';
    }

    if (popup) await showInfo(INFORM_TITLE, popup);

    const qTimeFlag = messageBody.QTIME_FLAG ?? '';
    const qTimeFlagWarning = messageBody.QTIME_FLAG_W ?? '';
    if (qTimeFlag || qTimeFlagWarning) {
      const accepted = await options.dialog.confirm(
        qTimeFlag ? 'Q-Time Over' : 'Q-Time 근접',
        qTimeFlag
          ? 'Q-Time 대상 Lot 입니다, 진행 하시겠습니까?'
          : 'Q-Time 2hr 이내 근접 Lot 입니다, 진행 하시겠습니까?',
      );
      if (!accepted) {
        state.portDisabled = true;
        state.startDisabled = true;
        isQTimeHold = '';
      } else {
        isQTimeHold = 'Y';
      }
    } else {
      isQTimeHold = '';
    }
  }

  async function setPortState(): Promise<void> {
    clearPortState();
    if (!state.selectedPort) return;
    state.clearPortDisabled = true;

    const response = await api.machinePortStatus(
      searchSuperEqpId,
      state.selectedPort,
      state.lotId,
      state.selectedRecipe,
    );
    if (!isSuccess(response)) {
      await showError(errorOf(response));
      return;
    }

    const messageBody = bodyOf(response);
    const portState = messageBody.PORTSTATENAME ?? '';
    const portLotName = messageBody.PORTLOTNAME ?? '';
    const ackMessage = messageBody.ACKMSG ?? '';
    setPortColorClass(portState);

    const previousRun = [messageBody.CHMA_RET, messageBody.CHMB_RET].filter(Boolean).join('\n');
    if (previousRun) await showInfo(OK_TITLE, `이전 진행 이력\n\n ${previousRun}`);

    if (searchEqpType === 'SCRUBBER' && ['5C09-06', '5C09-03'].includes(searchSuperEqpId)) {
      state.clearPortDisabled = false;
      state.startDisabled = false;
      return;
    }

    if (['RUN', 'PENDING', 'RESERVED'].includes(portState)) {
      await showInfo(
        '장비 MESSAGE',
        '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
      );
      state.clearPortDisabled = false;
      state.startDisabled = true;
      if (state.lotId !== portLotName) state.clearPortDisabled = false;
      else if (portState === 'RESERVED') state.restartDisabled = false;
      if (ackMessage) await showInfo('PORT WORNING', ackMessage);
      return;
    }
    if (!portState) {
      await showInfo('장비 MESSAGE', 'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.');
      state.startDisabled = true;
      state.restartDisabled = true;
      state.clearPortDisabled = true;
      return;
    }
    if (['P5000-T', 'P5000-N', 'P5000-W'].includes(searchEqpType)) {
      if (portState === 'COMPLETE') {
        await showInfo(
          '장비 MESSAGE',
          '이전 완료 LOT이 Unload 되지 않았습니다.\nLOT을 Unload 후 진행할 LOT을 LOADING 바랍니다.',
        );
        state.clearPortDisabled = false;
        state.startDisabled = true;
      } else {
        state.startDisabled = false;
        state.clearPortDisabled = true;
        state.restartDisabled = true;
      }
      return;
    }

    state.clearPortDisabled = searchEqpType !== 'AG_RTP';
    state.startDisabled = false;
    state.restartDisabled = true;
  }

  async function handlePortChange(value: string): Promise<void> {
    state.selectedPort = value;
    await setPortState();
  }

  async function handleRecipeChange(value: string): Promise<void> {
    state.selectedRecipe = value;
    await memorizationRecipe();
    if (state.selectedPort) await setPortState();
  }

  function executeEqpCancel(): void {
    state.equipmentId = '';
    state.equipmentCancelDisabled = true;
    state.clearPortDisabled = true;
    state.restartDisabled = true;
    state.startDisabled = true;
  }

  async function executeClearPort(): Promise<void> {
    if (!state.selectedPort) {
      await showError('진행 Port를 먼저 선택하세요.');
      return;
    }
    const accepted = await options.dialog.confirm(
      OK_TITLE,
      `PORT [${state.selectedPort}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
    );
    if (!accepted) return;

    beginLoading();
    try {
      const response = await api.machinePortClear(searchSuperEqpId, state.selectedPort);
      if (!isSuccess(response)) {
        await showError(errorOf(response));
        return;
      }
      await showInfo('PORT 초기화', '해당 PORT 초기화 명령을 전송하였습니다.');
      await setPortState();
    } finally {
      endLoading();
    }
  }

  async function executeOpen(): Promise<void> {
    if (!state.selectedPort) {
      await showError('진행 Port를 먼저 선택하세요.');
      return;
    }
    const accepted = await options.dialog.confirm(
      OK_TITLE,
      `PORT [${state.selectedPort}]의 DOOR를 OPEN 하시겠습니까?`,
    );
    if (!accepted) return;

    beginLoading();
    try {
      const response = await api.doorOpen(
        searchSuperEqpId,
        state.selectedPort,
        searchEqpArea,
        searchEqpType,
      );
      if (isSuccess(response)) await showInfo('DOOR OPEN', 'DOOR OPEN 명령을 전송하였습니다.');
      else await showError(errorOf(response));
    } finally {
      endLoading();
    }
  }

  function executeCommentList(): void {
    options.onOpenCommentList({
      lotId: state.lotId,
      operation: searchOperation,
      subOperation: searchSubOperation,
      processStep: searchProcessStep,
      operSequence: searchOperSeq,
      facility: state.facility,
    });
  }

  function executeCommRcp(): void {
    const equipmentId = searchSuperEqpId || state.equipmentId;
    options.onOpenRcpConditions({
      lotId: state.lotId,
      equipmentId,
      recipe: state.selectedRecipe,
      operation: searchOperation,
      processStep: searchProcessStep,
    });
  }

  function buildPrecedeFlag(): string {
    if (!state.precedeOptionsVisible || !state.selectedPrecede) return '';
    let precedeFlag = `${state.selectedPrecede}${state.selectedPrecedeType}`;
    if (isPrecede !== precedeFlag) precedeFlag += 'USER';
    return precedeFlag;
  }

  async function checkComment(): Promise<boolean> {
    const response = await api.lotInfo('MVIN', state.lotId, options.facility);
    if (!isSuccess(response)) {
      await showError(errorOf(response));
      return false;
    }
    const unreadCount = bodyOf(response).NWCOMMENTQTY ?? '';
    if (unreadCount && Number(unreadCount) > 0) {
      await showError(
        `읽지 않은 작업성 COMMENT가 [${unreadCount}]가 있습니다.\n읽은후 진행하세요.`,
      );
      return false;
    }
    return true;
  }

  async function validateStartInputs(): Promise<boolean> {
    if (!state.equipmentId) {
      await showError('진행장비를 입력하세요.');
      return false;
    }
    if (!state.selectedPort) {
      await showError('진행 Port를 선택하세요.');
      return false;
    }
    if (!state.selectedRecipe) {
      await showError('진행 Rcp를 선택하세요.');
      return false;
    }

    if (searchEqpType === 'UNITY-II' && state.selectedRecipe.lastIndexOf('+') > -1) {
      const chamberRecipe = state.selectedRecipe.substring(
        state.selectedRecipe.lastIndexOf('+') + 1,
      );
      if (
        (state.selectedPort === '1' && !chamberRecipe.includes('A')) ||
        (state.selectedPort === '2' && !chamberRecipe.includes('B'))
      ) {
        await showError('Port정보와 Chamber Recipe가 불일치합니다.');
        return false;
      }
    }
    return true;
  }

  function createStartRequest(): RemoteCvdStartRequest {
    return {
      machineName: searchSuperEqpId,
      machineName2: state.equipmentId,
      machineType: searchEqpType,
      areaName: searchEqpArea,
      lotName: state.lotId,
      portName: state.selectedPort,
      recipeName: state.selectedRecipe,
      productQty: state.quantity,
      operation: `${searchOperation}-${searchSubOperation}`,
      jobCode: state.jobCode,
      productName: state.product,
      eventUser: options.operatorId,
      precedeFlag: buildPrecedeFlag(),
      qTimeHold: isQTimeHold,
    };
  }

  async function checkInterLock(): Promise<boolean> {
    const response = await api.remoteInterlockCheck(
      state.lotId,
      searchOperation,
      searchSubOperation,
      isMainEqp,
      state.selectedRecipe,
    );
    if (isSuccess(response)) {
      const popup = bodyOf(response).POPUP ?? '';
      if (popup) await showInfo(INFORM_TITLE, popup);
      return true;
    }
    if (errorOf(response) !== BODY_MISSING_ERROR) {
      await showError(errorOf(response));
      return false;
    }
    return true;
  }

  async function remoteStart(): Promise<void> {
    if (!(await checkInterLock())) return;
    const response = await api.remoteStart(createStartRequest());
    if (isSuccess(response)) options.onComplete();
    else await showError(errorOf(response));
  }

  async function remoteReStart(): Promise<void> {
    const startRequest = createStartRequest();
    const request: RemoteCvdRestartRequest = {
      machineName: startRequest.machineName,
      machineName2: startRequest.machineName2,
      machineType: startRequest.machineType,
      areaName: startRequest.areaName,
      lotName: startRequest.lotName,
      portName: startRequest.portName,
      recipeName: startRequest.recipeName,
      productQty: startRequest.productQty,
      operation: startRequest.operation,
      jobCode: startRequest.jobCode,
      productName: startRequest.productName,
      eventUser: startRequest.eventUser,
      precedeFlag: startRequest.precedeFlag,
    };
    const response = await api.remoteRestart(request);
    if (isSuccess(response)) options.onComplete();
    else await showError(errorOf(response));
  }

  async function executeStart(): Promise<void> {
    if (!(await validateStartInputs())) return;
    beginLoading();
    try {
      if (!(await checkComment())) return;
      const confirmed = await options.confirmRecipe(state.selectedRecipe, state.lotId);
      if (confirmed) await remoteStart();
    } finally {
      endLoading();
    }
  }

  async function executeReStart(): Promise<void> {
    if (!(await validateStartInputs())) return;
    beginLoading();
    try {
      if (!(await checkComment())) return;
      const confirmed = await options.confirmRecipe(state.selectedRecipe, '');
      if (confirmed) await remoteReStart();
    } finally {
      endLoading();
    }
  }

  function executeCancel(): void {
    options.onCancel();
  }

  return {
    state,
    searchData,
    onEquipmentEnter,
    handlePortChange,
    handleRecipeChange,
    executeEqpCancel,
    executeClearPort,
    executeOpen,
    executeCommentList,
    executeCommRcp,
    executeStart,
    executeReStart,
    executeCancel,
    setPortState,
    getMachineInfo,
    getRecipeInfo,
    memorizationRecipe,
    checkComment,
    checkInterLock,
    remoteStart,
    remoteReStart,
  };
}
