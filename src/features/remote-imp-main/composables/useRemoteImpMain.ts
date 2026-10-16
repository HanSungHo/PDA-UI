import { validateEquipment } from 'src/utils/validate-equipment';
import { reactive } from 'vue';

import {
  type ImpApi,
  impApi,
  type ImpBody,
  type ImpResult,
} from '../services/remote-imp-main.service';

const value = (body: ImpBody, key: string): string => {
  const raw = body[key];
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
};
function list(body: ImpBody, key: string, itemKey: string): string[] {
  const raw = body[key];
  const items = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  return items.map((item) => value(item as ImpBody, itemKey)).filter(Boolean);
}

export interface ImpDialog {
  title: string;
  message: string;
}

export function useRemoteImpMain(options: {
  facility: string;
  operatorId: string;
  api?: ImpApi;
  alert: (dialog: ImpDialog) => void;
  confirm: (dialog: ImpDialog) => Promise<boolean>;
  onComplete: () => void;
  onComment: (query: Record<string, string>) => void;
}) {
  const api = options.api ?? impApi;
  const state = reactive({
    lotId: '',
    machineName: '',
    machineState: '',
    standardMachine: '',
    recipe: '',
    port: '',
    recipeList: [] as string[],
    portList: [] as string[],
    bayList: [] as string[],
    stkList: [] as string[],
    bay: '',
    stk: '',
    carry: false,
    carryEnabled: false,
    machineDisabled: false,
    recipeDisabled: false,
    portDisabled: false,
    startEnabled: false,
    clearPortEnabled: false,
    commentEnabled: false,
    loading: false,
    starting: false,
    jobCode: '',
    product: '',
    currentOperation: '',
    qty: '',
    facility: options.facility,
    engineer: '',
    customer: '',
    saleType: '',
    packing: '',
    goodChips: '',
    commentCount: '',
    searchRecipe: '',
    lsChangeRecipe: false,
    lsChangeEqpGroup: false,
    searchArea: '',
    searchOpType: '',
    searchEqpType: '',
    searchOperation: '',
    searchSubOperation: '',
    searchProcessStep: '',
    searchOperSeq: '',
    isMainEqp: '',
    exposure: false,
    rfReadCount: 0,
    oriBay: '',
    oriStk: '',
  });

  const error = (message: string) => options.alert({ title: '오류', message });
  const failed = (result: ImpResult): boolean => {
    if (result.ok) return false;
    error(result.message);
    return true;
  };

  function initDisable(): void {
    state.carry = false;
    state.carryEnabled = false;
    state.startEnabled = false;
    state.clearPortEnabled = false;
    state.commentEnabled = false;
    state.rfReadCount = 0;
    clearSpinnerInfo();
  }

  function clearSpinnerInfo(): void {
    if (state.bay) state.oriBay = state.bay;
    if (state.stk) state.oriStk = state.stk;
    state.bayList = [];
    state.stkList = [];
    state.bay = '';
    state.stk = '';
  }

  async function setBaySpinner(): Promise<void> {
    const result = await api.areaBayInfo(options.facility);
    if (failed(result) || !result.ok) return;
    state.bayList = list(result.body, 'BAYS', 'BAY');
    state.bay = state.bayList.includes(state.oriBay) ? state.oriBay : '';
    if (state.bay) await setStkSpinner();
  }

  async function setStkSpinner(): Promise<void> {
    if (!state.bay) return;
    const result = await api.bayStockerInfo(state.bay, options.facility);
    if (failed(result) || !result.ok) return;
    state.stkList = list(result.body, 'STOCKERS', 'STOCKER');
    state.stk = state.stkList.includes(state.oriStk) ? state.oriStk : '';
  }

  async function setCarry(checked: boolean): Promise<void> {
    state.carry = checked;
    if (checked) await setBaySpinner();
    else clearSpinnerInfo();
  }

  function clearLotInfo(): void {
    state.searchRecipe = '';
    state.lsChangeRecipe = false;
    state.lsChangeEqpGroup = false;
    state.searchArea = '';
    state.searchOpType = '';
    state.searchOperation = '';
    state.searchSubOperation = '';
    state.searchProcessStep = '';
    state.searchOperSeq = '';
    state.standardMachine = '';
    state.jobCode = '';
    state.product = '';
    state.currentOperation = '';
    state.qty = '';
    state.facility = options.facility;
    state.engineer = '';
    state.customer = '';
    state.saleType = '';
    state.packing = '';
    state.goodChips = '';
    state.commentCount = '';
    state.recipe = '';
    state.recipeList = [];
    state.commentEnabled = false;
  }

  async function setLotInfo(lotId: string): Promise<void> {
    clearLotInfo();
    state.lotId = lotId;
    if (!lotId) return;
    const result = await api.lotInfo(lotId, options.facility);
    if (failed(result) || !result.ok) return;
    const body = result.body;
    let message = '';
    if (value(body, 'STATUS') === 'RUN')
      message = '이미 MOVE IN된 LOT입니다. 자동화 진행이 불가합니다.';
    else if (value(body, 'STATE') !== 'WIP')
      message = `${value(body, 'STATE')} 상태 입니다. 자동화 진행이 불가합니다.`;
    else if (value(body, 'HOLDSTATUS') === 'ONHOLD')
      message = 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.';
    else if (value(body, 'AREA') !== 'IMP')
      message = 'IMP공정이 아닙니다. LOT을 확인 후 진행 바랍니다.';
    if (message) {
      error(message);
      state.machineDisabled = true;
      return;
    }

    state.commentCount = value(body, 'COMMENTQTY');
    state.commentEnabled = Number(state.commentCount) > 0;
    state.searchRecipe = value(body, 'CHANGERECIPE') || value(body, 'RECIPE');
    state.lsChangeRecipe = Boolean(
      value(body, 'CHANGERECIPE') && value(body, 'CHANGERECIPE') !== value(body, 'RECIPE'),
    );
    state.standardMachine = value(body, 'CHANGEEQPGROUP') || value(body, 'EQPGROUP');
    state.lsChangeEqpGroup = Boolean(
      value(body, 'CHANGEEQPGROUP') && value(body, 'CHANGEEQPGROUP') !== value(body, 'EQPGROUP'),
    );
    state.jobCode = value(body, 'JOBCODE');
    state.product = value(body, 'PRODUCT');
    state.currentOperation = `${value(body, 'PROCESSSTEP')}(${value(body, 'OPERATION')}${value(body, 'SUBOPERATION')})`;
    state.qty = value(body, 'QUANTITY');
    state.facility = value(body, 'FACILITY');
    state.engineer = value(body, 'ENGINEER');
    state.customer = value(body, 'CUSTOMER');
    state.saleType = value(body, 'CATEGORY');
    state.packing = value(body, 'PACKING');
    state.goodChips = value(body, 'GOODCHIPS');
    state.searchArea = value(body, 'AREA');
    state.searchOpType = value(body, 'OPTYPE');
    state.searchOperation = value(body, 'OPERATION');
    state.searchSubOperation = value(body, 'SUBOPERATION');
    state.searchProcessStep = value(body, 'PROCESSSTEP');
    state.searchOperSeq = value(body, 'OPERSEQUENCE');
    state.recipeList = state.searchRecipe.split(';').filter(Boolean);

    if (value(body, 'ETCMSG')) options.alert({ title: '정보', message: value(body, 'ETCMSG') });
    if (Number(value(body, 'NWCOMMENTQTY')) > 0) {
      options.alert({
        title: '확인',
        message: `읽지 않은 작업성 COMMENT가 [${value(body, 'NWCOMMENTQTY')}]가 있습니다.\n읽은후 진행하세요.`,
      });
    }
    if (value(body, 'LOTRESUSER')) {
      error('작업 예약되었거나 진행중인 LOT입니다.\n이력 확인 후 진행바랍니다.');
      state.machineDisabled = true;
      state.recipeDisabled = true;
      state.portDisabled = true;
      state.startEnabled = false;
    }
  }

  function clearPortState(): void {
    state.machineState = '';
  }

  function clearMachineInfo(): void {
    state.isMainEqp = '';
    state.searchEqpType = '';
    state.portList = [];
    state.port = '';
    state.clearPortEnabled = false;
    state.startEnabled = false;
    state.carryEnabled = false;
    state.carry = false;
    clearSpinnerInfo();
    clearPortState();
  }

  function updateMachineName(machineName: string): void {
    if (machineName === state.machineName) return;
    clearMachineInfo();
    state.machineName = machineName.toUpperCase();
  }

  async function getMachineInfo(rawEqpId: string): Promise<void> {
    clearMachineInfo();
    state.machineName = rawEqpId.toUpperCase();
    if (!state.machineName || state.machineDisabled) return;
    if (state.searchArea === 'PHOTO' && state.searchOpType === 'P' && state.exposure) {
      error('PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.');
      return;
    }
    let machineName = state.machineName;
    state.isMainEqp = machineName;
    if (
      state.searchOpType !== 'M' &&
      !['FAB2', 'FAB5', 'FAB7'].includes(state.standardMachine) &&
      state.searchArea !== 'PQC'
    ) {
      const result = await api.remoteEqpInfo(machineName);
      if (failed(result) || !result.ok) {
        state.machineName = '';
        return;
      }
      const body = result.body;
      if (value(body, 'PMMESSAGE'))
        options.alert({ title: 'PM주기 경고', message: value(body, 'PMMESSAGE') });
      state.portList = value(body, 'PORTNAME').split(',').filter(Boolean);
      machineName = value(body, 'PROCEQPID');
      state.isMainEqp = machineName;
      state.searchEqpType = value(body, 'EQPTYPE');
      if (!validateEquipment(state.standardMachine, machineName)) {
        state.machineName = '';
        return;
      }
    }
    state.machineName = machineName;
    await getRecipeInfo();
  }

  async function getRecipeInfo(): Promise<void> {
    const result = await api.recipeInfo(
      state.lotId,
      state.searchOperation,
      state.searchSubOperation,
      state.product,
      state.isMainEqp,
      state.searchOpType,
      options.facility,
    );
    if (failed(result) || !result.ok) {
      state.clearPortEnabled = false;
      return;
    }
    const recipe = value(result.body, 'RECIPE');
    const colon = recipe.lastIndexOf(':');
    state.recipeList = (
      colon > 0
        ? recipe
            .slice(colon + 1)
            .split(',')
            .map((part) => recipe.slice(0, colon + 1) + part)
        : [recipe]
    )
      .filter(Boolean)
      .sort();
    state.recipe = state.recipeList[0] ?? '';
    state.carryEnabled = true;
    if (state.recipe) await memorizationRecipe();
  }

  async function memorizationRecipe(): Promise<void> {
    if (!state.recipe) return;
    const result = await api.memorization(state.machineName, state.recipe, state.lotId);
    if (result.ok) {
      if (value(result.body, 'POPUP'))
        options.alert({ title: '정보', message: value(result.body, 'POPUP') });
    } else if (result.message !== 'BODY가 존재하지 않습니다') {
      error(result.message);
      state.startEnabled = false;
    }
  }

  async function selectPort(port: string): Promise<void> {
    state.port = port;
    await setPortState();
  }

  async function setPortState(): Promise<void> {
    clearPortState();
    state.startEnabled = false;
    state.clearPortEnabled = false;
    if (!state.port) return;
    const result = await api.machinePortStatus(state.isMainEqp, state.port);
    if (failed(result) || !result.ok) return;
    const body = result.body;
    const portState = value(body, 'PORTSTATENAME');
    state.machineState = portState;
    if (['RUN', 'PENDING', 'RESERVED', 'COMPLETE'].includes(portState)) {
      error('해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.');
      state.clearPortEnabled = true;
      state.startEnabled = false;
      if (value(body, 'ACKMSG'))
        options.alert({ title: 'PORT WORNING', message: value(body, 'ACKMSG') });
    } else if (portState === 'IDLE') {
      options.alert({ title: '장비 MASSAGE', message: 'CST가 LOAD되어 있지 않습니다.' });
      state.startEnabled = false;
    } else if (!portState) {
      options.alert({
        title: '장비 MASSAGE',
        message: 'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
      });
      state.startEnabled = false;
    } else if (state.searchEqpType === 'VARIAN_MC' && portState === 'READY') {
      state.startEnabled = true;
    } else {
      state.startEnabled = true;
      state.clearPortEnabled = true;
    }
  }

  async function executeClearPort(): Promise<void> {
    if (!state.port) {
      error('진행 Port를 먼저 선택하세요.');
      return;
    }
    const accepted = await options.confirm({
      title: '오류',
      message: `PORT [${state.port}]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?`,
    });
    if (!accepted) return;
    const result = await api.machinePortClean(state.isMainEqp, state.port);
    if (failed(result)) return;
    options.alert({ title: 'DOOR OPEN', message: '해당 PORT 초기화 명령을 전송하였습니다.' });
    await setPortState();
  }

  function executeComment(): void {
    options.onComment({
      lotId: state.lotId,
      operation: state.searchOperation,
      subOperation: state.searchSubOperation,
      processStep: state.searchProcessStep,
      operSequence: state.searchOperSeq,
      facility: options.facility,
    });
  }

  async function executeStart(): Promise<void> {
    if (state.starting) return;
    state.starting = true;
    try {
      await startOnce();
    } finally {
      state.starting = false;
    }
  }

  async function startOnce(): Promise<void> {
    if (!state.machineName) {
      error('진행장비를 입력하세요.');
      return;
    }
    if (!state.port) {
      error('진행 Port를 선택하세요.');
      return;
    }
    if (!state.recipe) {
      error('진행Rcp를 선택하세요.');
      return;
    }
    if (state.carry && !state.bay) {
      error('BAY를 선택하세요.');
      return;
    }
    if (state.carry && !state.stk) {
      error('STOCKER를 선택하세요.');
      return;
    }
    const checked = await api.lotInfo(state.lotId, options.facility);
    if (checked.ok && Number(value(checked.body, 'NWCOMMENTQTY')) > 0) {
      error(
        `읽지 않은 작업성 COMMENT가 [${value(checked.body, 'NWCOMMENTQTY')}]가 있습니다.\n읽은후 진행하세요.`,
      );
      return;
    }
    if (!checked.ok) {
      error(checked.message);
      return;
    }
    const accepted = await options.confirm({ title: 'RECIPE 확인', message: state.recipe });
    if (accepted) await execute();
  }

  async function execute(): Promise<void> {
    const result = await api.impRemoteStart({
      machineName: state.machineName,
      machineType: state.searchEqpType,
      lotName: state.lotId,
      portName: state.port,
      recipeName: state.recipe,
      jobCode: state.jobCode,
      productName: state.product,
      operation: state.searchOperation,
      isCarry: state.carry ? 'Y' : 'N',
      bay: state.carry ? state.bay : '',
      stocker: state.carry ? state.stk : '',
      eventUser: options.operatorId,
    });
    if (failed(result)) return;
    options.onComplete();
  }

  return {
    state,
    initDisable,
    clearSpinnerInfo,
    setBaySpinner,
    setStkSpinner,
    setCarry,
    clearLotInfo,
    setLotInfo,
    clearMachineInfo,
    updateMachineName,
    getMachineInfo,
    getRecipeInfo,
    memorizationRecipe,
    clearPortState,
    selectPort,
    setPortState,
    executeClearPort,
    executeComment,
    executeStart,
    execute,
  };
}
