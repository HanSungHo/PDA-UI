import { computed, reactive } from 'vue';

import * as remoteMachineSelectService from '../services/remote-machine-select.service';
import type {
  RemoteMachineChildFlow,
  RemoteMachineLotInfo,
  RemoteMachineSelectState,
} from '../types/remote-machine-select.types';

interface RemoteMachineSelectContext {
  facility: string;
  lotId: string;
  operatorId: string;
  operatorName: string;
  onComplete: () => void;
  onOpenChildScreen: (flow: RemoteMachineChildFlow, lotId: string) => void;
  onRequestMachineFocus: () => void;
  confirm: (title: string, content: string) => Promise<boolean>;
}

const EMPTY_LOT_INFO: RemoteMachineLotInfo = {
  PRODUCT: '',
  RECIPE: '',
  EQPGROUP: '',
  JOBCODE: '',
  PROCESSSTEP: '',
  OPERATION: '',
  SUBOPERATION: '',
  STATUS: '',
  STATE: '',
  HOLDSTATUS: '',
  QUANTITY: '',
  NEXTOPERATION: '',
  NEXTSUBOPERATION: '',
  NEXTPROCESSSTEP: '',
  OPTYPE: '',
  AREA: '',
  TREEFLAG: '',
  C1STEPPERNAME: '',
  PHOTOTYPE: '',
  INLINESAMPLEMESSGE: '',
  EQPTYPE: '',
  EQP_MODEL: '',
};

export function useRemoteMachineSelect(context: RemoteMachineSelectContext) {
  const state = reactive<RemoteMachineSelectState>({
    lotId: context.lotId.trim().toUpperCase(),
    status: '',
    product: '',
    jobCode: '',
    currentOper: '',
    nextOper: '',
    recipe: '',
    pr: '',
    rework: '',
    hold: '',
    qty: '',
    eqpGroup: '',
    machineSelect: '',
    portList: [],
    selectedPort: '',
    portStatus: '',
    portStatusKind: '',
    machineDisabled: false,
    okDisabled: false,
    refreshDisabled: true,
    loading: false,
    dialogTitle: '',
    dialogMessage: '',
    dialogKind: 'info',
  });

  let treeFlag = '';
  let searchC1Stepper = '';
  let searchArea = '';
  let searchOperation = '';
  let searchSubOperation = '';
  let searchOperDesc = '';
  let searchLocal = '';
  let mainEqpId = '';
  let searchRemoteCode = '';
  let searchOperMode = '';
  let searchLayerId = '';
  let searchRandomFlag = '';
  let searchEqpType = '';
  let searchBarcCount = '';
  let localEenPassed = false;
  const dialogQueue: Array<{
    title: string;
    message: string;
    kind: RemoteMachineSelectState['dialogKind'];
  }> = [];

  const statusKind = computed(() => {
    if (state.status === 'RUN') return 'run';
    if (state.status === 'HOLD') return 'hold';
    return state.status === 'WAIT' || !state.status ? 'wait' : 'other';
  });

  function showDialog(
    message: string,
    title = '오류',
    kind: RemoteMachineSelectState['dialogKind'] = 'error',
  ) {
    if (state.dialogMessage) {
      dialogQueue.push({ title, message, kind });
      return;
    }
    state.dialogTitle = title;
    state.dialogMessage = message;
    state.dialogKind = kind;
  }

  function dismissDialog() {
    const next = dialogQueue.shift();
    state.dialogTitle = next?.title ?? '';
    state.dialogMessage = next?.message ?? '';
    state.dialogKind = next?.kind ?? 'info';
  }

  function clearPortStatus() {
    state.portStatus = '';
    state.portStatusKind = '';
  }

  function clearEQPInfo() {
    mainEqpId = '';
    searchLocal = '';
    searchRemoteCode = '';
    searchOperMode = '';
    searchLayerId = '';
    searchRandomFlag = '';
    searchEqpType = '';
    searchBarcCount = '';
    localEenPassed = false;
    state.recipe = '';
    state.pr = '';
    state.rework = '';
    state.portList = [];
    state.selectedPort = '';
    state.refreshDisabled = true;
    clearPortStatus();
  }

  function clearLotInfo() {
    treeFlag = '';
    searchC1Stepper = '';
    searchArea = '';
    searchOperation = '';
    searchSubOperation = '';
    searchOperDesc = '';
    state.status = '';
    state.product = '';
    state.jobCode = '';
    state.currentOper = '';
    state.nextOper = '';
    state.hold = '';
    state.qty = '';
    state.eqpGroup = '';
    state.machineDisabled = false;
    state.machineSelect = '';
    clearEQPInfo();
  }

  async function searchData(lotId: string) {
    state.loading = true;
    clearLotInfo();
    if (!lotId.trim()) {
      showDialog('LOT NO를 입력하세요.');
      state.loading = false;
      return;
    }

    try {
      const response = await remoteMachineSelectService.lotInfo('MVIN', lotId, context.facility);
      if (!response.isSuccess) throw new Error(response.errorMessage);
      const messageBody: RemoteMachineLotInfo = { ...EMPTY_LOT_INFO, ...response.messageBody };
      let operation = messageBody.OPERATION;
      searchOperation = operation;
      searchSubOperation = messageBody.SUBOPERATION;
      searchOperDesc = messageBody.PROCESSSTEP;
      treeFlag = messageBody.TREEFLAG;
      searchC1Stepper = messageBody.C1STEPPERNAME;
      searchArea = messageBody.AREA;
      state.status = messageBody.STATE === 'WIP' ? messageBody.STATUS : messageBody.STATE;
      state.product = messageBody.PRODUCT;
      state.jobCode = messageBody.JOBCODE;
      state.currentOper = `${messageBody.PROCESSSTEP}(${operation}${messageBody.SUBOPERATION})`;
      state.nextOper = `${messageBody.NEXTPROCESSSTEP}(${messageBody.NEXTOPERATION}${messageBody.NEXTSUBOPERATION})`;
      state.hold = messageBody.HOLDSTATUS === 'ONHOLD' ? 'Y' : 'N';
      state.qty = messageBody.QUANTITY;
      state.eqpGroup = messageBody.EQPGROUP;
      if (operation === '10000') operation = '10005';

      if (messageBody.STATUS === 'RUN') {
        state.machineDisabled = true;
        state.okDisabled = true;
        showDialog('이미 MOVE IN된 LOT입니다.');
        return;
      }
      if (messageBody.STATE !== 'WIP' && operation !== '10005') {
        state.machineDisabled = true;
        state.okDisabled = true;
        showDialog(`${messageBody.STATE} 상태입니다. 자동화 진행이 불가합니다.`);
        return;
      }
      if (messageBody.HOLDSTATUS === 'ONHOLD') {
        state.machineDisabled = true;
        state.okDisabled = true;
        showDialog('HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
        return;
      }
      if (messageBody.INLINESAMPLEMESSGE)
        showDialog(messageBody.INLINESAMPLEMESSGE, '확인', 'info');

      const isMeasure =
        messageBody.OPTYPE === 'M' &&
        messageBody.PHOTOTYPE !== 'DI' &&
        !messageBody.PROCESSSTEP.includes('CD');
      const isPhotoTrack =
        messageBody.PHOTOTYPE === 'PH' ||
        messageBody.EQPTYPE === 'TRACK' ||
        messageBody.EQPTYPE === 'STEPPER' ||
        (messageBody.OPTYPE === 'M' &&
          !messageBody.EQP_MODEL &&
          (messageBody.PHOTOTYPE === 'DI' || messageBody.PROCESSSTEP.includes('CD')));
      const isSpecialOperation =
        operation === '70000' && ['02', '10', '11'].includes(messageBody.SUBOPERATION);

      if (isMeasure) {
        context.onOpenChildScreen('meas', lotId);
        return;
      }
      if (isPhotoTrack) {
        if (treeFlag === 'Y') {
          state.okDisabled = true;
          if (!searchC1Stepper) state.machineDisabled = true;
          showDialog(
            searchC1Stepper
              ? `Tree 진행 설정된 LOT입니다. ${searchC1Stepper}에서 자동화 진행 가능합니다.`
              : 'Tree 진행 설정되었으나 이전 진행 장비를 찾을 수 없습니다. 장비 ASSIGN 후 진행 바랍니다.',
          );
        }
        return;
      }
      if (messageBody.AREA === 'IMP') {
        context.onOpenChildScreen('imp', lotId);
      } else if (messageBody.AREA !== 'PHOTO' && !isSpecialOperation) {
        context.onOpenChildScreen('cvd', lotId);
      }
    } catch (error) {
      showDialog(error instanceof Error ? error.message : 'LOT 정보 조회에 실패했습니다.');
    } finally {
      state.loading = false;
    }
  }

  async function remoteEQPEENInfo(isMainMachine: string) {
    state.loading = true;
    try {
      const response = await remoteMachineSelectService.remoteEQPEENInfo(
        isMainMachine,
        'MVIN',
        state.lotId,
        context.facility,
        searchOperation,
        searchSubOperation,
      );
      if (!response.isSuccess) throw new Error(response.errorMessage);
      localEenPassed = true;
      await setPortStatus();
    } catch (error) {
      state.okDisabled = true;
      showDialog(error instanceof Error ? error.message : 'EEN 정보를 조회할 수 없습니다.');
    } finally {
      state.loading = false;
    }
  }

  async function photoChangeEQPStatus(isMainMachine: string, portId: string) {
    state.loading = true;
    try {
      const response = await remoteMachineSelectService.photoChangeEQPStatus(
        isMainMachine,
        context.operatorId,
      );
      if (!response.isSuccess) throw new Error(response.errorMessage);
      state.machineSelect = `${state.machineSelect}-${portId}`;
      showDialog('장비 상태 변경했습니다.', '변경 완료', 'info');
      state.loading = false;
      await setEQPInfo();
    } catch (error) {
      showDialog(error instanceof Error ? error.message : '장비 상태를 변경하지 못했습니다.');
    } finally {
      state.loading = false;
    }
  }

  async function setEQPInfo() {
    if (state.machineDisabled || state.loading) return;
    const scannedValue = state.machineSelect.trim().toUpperCase();
    clearEQPInfo();
    const splitAt = scannedValue.lastIndexOf('-');
    if (splitAt === -1) {
      state.machineSelect = '';
      showDialog('유효하지 않은 장비입니다.');
      return;
    }
    const onlyEqpId = scannedValue.slice(0, splitAt);
    const onlyPortId = scannedValue.slice(splitAt + 1);
    state.machineSelect = onlyEqpId;
    mainEqpId = onlyEqpId;
    const eqpLastIdx = onlyEqpId.lastIndexOf('-');
    const firstIdx = eqpLastIdx - 2 > 0 ? eqpLastIdx - 2 : 0;
    const lastIdx = eqpLastIdx > 0 ? eqpLastIdx : 0;
    const stepperEQPName = `${onlyEqpId.slice(0, firstIdx)}01${onlyEqpId.slice(lastIdx)}`;
    if (treeFlag === 'Y' && (!searchC1Stepper || searchC1Stepper !== stepperEQPName)) {
      state.machineDisabled = true;
      state.okDisabled = true;
      showDialog(
        searchC1Stepper
          ? `Tree 진행 설정된 LOT입니다. ${searchC1Stepper}에서 자동화 진행 가능합니다.`
          : 'Tree 진행 설정되었으나 이전 진행 장비를 찾을 수 없습니다. 장비 ASSIGN 후 진행 바랍니다.',
      );
      return;
    }
    if (['FAB2', 'FAB5', 'FAB7'].includes(state.eqpGroup) || searchArea === 'PQC') {
      return;
    }

    state.loading = true;
    try {
      const response = await remoteMachineSelectService.remoteEQPInfo2(
        onlyEqpId,
        'MVIN',
        state.lotId,
        context.facility,
        searchOperation,
        searchSubOperation,
      );
      if (!response.isSuccess) {
        if (response.errorMessage.includes('현재 장비 상태가')) {
          const shouldChangeStatus = await context.confirm('확인', response.errorMessage);
          if (shouldChangeStatus) await photoChangeEQPStatus(onlyEqpId, onlyPortId);
          return;
        }
        throw new Error(response.errorMessage);
      }
      const body = response.messageBody;
      state.recipe = body.RECIPE ?? '';
      state.pr = body.PRNAME ?? '';
      searchLocal = body.ISLOCALTRACK ?? '';
      searchRemoteCode = body.REWORK_CODE ?? '';
      searchOperMode = body.INLINEMODE ?? '';
      searchLayerId = body.LAYERID ?? '';
      searchRandomFlag = body.RANDOMFLAG ?? '';
      searchEqpType = body.EQPTYPE ?? '';
      searchBarcCount = body.BARCCOUNT ?? '';
      state.rework = body.SAMPLEFLAG === 'InRework' ? 'Y' : 'N';
      const count = body.BARCCOUNT ? Number(body.BARCCOUNT) : NaN;
      if (count === 1) {
        showDialog(
          `첫 BARC 공정 또는 추가 BAKE 진행 LOT입니다.\nBARC Count : [${body.BARCCOUNT}]\n계측 진행 바랍니다.`,
          'BARC COUNT',
          'warning',
        );
      } else if (count === 30) {
        showDialog(
          `30번째 BARC 공정 또는 추가 BAKE 진행 LOT입니다.\nBARC Count : [${body.BARCCOUNT}]\n계측 진행 바랍니다.`,
          'BARC COUNT',
          'warning',
        );
      } else if (count > 30) {
        showDialog(
          `BARC 공정 또는 추가 BAKE 진행을 30 LOT 이상 진행하였습니다.\nBARC Count : [${body.BARCCOUNT}]\n공정 PM 바랍니다.`,
          'BARC COUNT',
          'warning',
        );
      }
      if (body.PMMESSAGE) showDialog(body.PMMESSAGE, 'PM주기 경고', 'warning');
      state.portList = (body.PORTNAME ?? '')
        .split(',')
        .map((port) => port.trim())
        .filter(Boolean);
      state.selectedPort = state.portList.includes(onlyPortId) ? onlyPortId : '';
      mainEqpId = body.MAINEQPID || onlyEqpId;
      const isMainMachine = body.MAINEQPID === body.PROCEQPID ? body.MAINEQPID : body.PROCEQPID;
      if (searchLocal === 'Y') await remoteEQPEENInfo(isMainMachine);
      else if (state.selectedPort) await setPortStatus();
    } catch (error) {
      showDialog(error instanceof Error ? error.message : '장비 정보를 조회하지 못했습니다.');
    } finally {
      state.loading = false;
    }
  }

  async function setPortStatus() {
    if (!state.selectedPort || !state.machineSelect) return;
    if (searchLocal === 'Y' && !localEenPassed) return;
    state.loading = true;
    state.okDisabled = true;
    clearPortStatus();
    try {
      const response = await remoteMachineSelectService.machinePortStatus(
        state.machineSelect,
        state.selectedPort,
      );
      if (!response.isSuccess) throw new Error(response.errorMessage);
      const portStatus = (response.messageBody.PORTSTATENAME ?? '').trim();
      const ackMessage = response.messageBody.ACKMSG ?? '';
      state.portStatus = portStatus;
      state.refreshDisabled = false;
      if (!portStatus) {
        showDialog(
          'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
          '장비 MASSAGE',
          'warning',
        );
        context.onRequestMachineFocus();
        return;
      }
      state.portStatusKind =
        portStatus === 'READY'
          ? 'ready'
          : ['RUN', 'PENDING', 'RESERVED', 'COMPLETE'].includes(portStatus)
            ? 'busy'
            : portStatus === 'IDLE'
              ? 'idle'
              : 'other';
      if (portStatus === 'READY') {
        state.okDisabled = false;
      } else if (['RUN', 'PENDING', 'RESERVED', 'COMPLETE'].includes(portStatus)) {
        showDialog(
          '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
          '장비 MASSAGE',
          'warning',
        );
        if (ackMessage) showDialog(ackMessage, 'PORT WORNING', 'warning');
        context.onRequestMachineFocus();
      } else {
        showDialog('CST가 LOAD되어 있지 않습니다.', '장비 MASSAGE', 'warning');
        context.onRequestMachineFocus();
      }
    } catch (error) {
      showDialog(error instanceof Error ? error.message : 'PORT 상태 조회에 실패했습니다.');
      context.onRequestMachineFocus();
    } finally {
      state.loading = false;
    }
  }

  async function execute() {
    if (state.loading) return;
    if (!state.selectedPort) {
      showDialog('진행 Port를 먼저 선택하세요.');
      return;
    }
    if (state.portStatus !== 'READY' || (searchLocal === 'Y' && !localEenPassed)) {
      showDialog('PORT 상태를 먼저 확인하세요.');
      return;
    }
    const portName = state.selectedPort;
    const lotName = state.lotId;
    const isLocalTrack = searchLocal === 'Y';
    const confirmMessage = isLocalTrack
      ? `해당 장비는 Local Track 장비입니다.\n[${portName}]번 PORT에 LOT [${lotName}]을(를) 작업 예약 하시겠습니까?`
      : `[${portName}]번 PORT에 LOT [${lotName}]을(를) 예약 하시겠습니까?`;
    if (!(await context.confirm('확인', confirmMessage))) return;

    state.loading = true;
    try {
      const response = isLocalTrack
        ? await remoteMachineSelectService.photoLotStart([
            ['MACHINENAME', state.machineSelect],
            ['PORTNAME', portName],
            ['LOTNAME', lotName],
            ['PRODUCUT', state.product],
            ['RECIPE', state.recipe],
            ['PRNAME', state.pr.trim()],
            ['LOTQTY', state.qty],
            ['REWORKCODE', searchRemoteCode],
            ['BARC_COUNT', searchBarcCount],
            ['EQP_TYPE', searchEqpType],
            ['OPERATIONNAME', searchOperation],
            ['OPERDESC', searchOperDesc],
            ['OPER_MODE', searchOperMode],
            ['LAYERID', searchLayerId],
            ['RANDOM', searchRandomFlag],
            ['SAMPLEFLAG', state.rework === 'Y' ? 'R' : 'M'],
            ['USERID', context.operatorId],
            ['USERNAME', context.operatorName],
          ])
        : await remoteMachineSelectService.photoLotReserve(mainEqpId, portName, lotName);
      if (!response.isSuccess) throw new Error(response.errorMessage);
      context.onComplete();
    } catch (error) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(500);
      showDialog(
        error instanceof Error ? error.message : '예약/시작 처리에 실패했습니다.',
        '오류',
        'error',
      );
    } finally {
      state.loading = false;
    }
  }

  return {
    state,
    statusKind,
    clearEQPInfo,
    clearLotInfo,
    clearPortStatus,
    dismissDialog,
    execute,
    searchData,
    setEQPInfo,
    setPortStatus,
    showDialog,
  };
}
