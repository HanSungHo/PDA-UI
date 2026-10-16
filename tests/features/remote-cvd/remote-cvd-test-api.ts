import type {
  RemoteCvdApi,
  RemoteCvdResponse,
} from '../../../src/features/remote-cvd/types/remote-cvd.types';

function success(messageBody: Record<string, string> = {}): RemoteCvdResponse {
  return { isSuccess: true, messageBody, errorMessage: '' };
}

export const remoteCvdTestApi: RemoteCvdApi = {
  async lotInfo(_type, lotId, facility) {
    return success({
      LOTID: lotId,
      PRODUCT: 'CVD-MOCK-PRODUCT',
      FACILITY: facility,
      OPERATION: '10020',
      SUBOPERATION: '00',
      PROCESSSTEP: 'CVD PROCESS',
      OPERSEQUENCE: '10',
      OPTYPE: 'C',
      STATUS: 'WAIT',
      STATE: 'WIP',
      CUSTOMER: 'HIFI-UI-DEMO',
      CATEGORY: 'DEMO',
      ENGINEER: 'CVD Engineer',
      PACKING: 'STANDARD',
      QUANTITY: '25',
      GOODCHIPS: '25',
      RECIPE: 'CVD:BASE-RECIPE',
      EQPGROUP: 'CVD01,CVD02',
      COMMENTQTY: '2',
      AREA: 'CVD',
      JOBCODE: 'JOB-CVD-001',
    });
  },
  async remoteEqpInfo(equipmentId) {
    return success({
      MAINEQPID: 'CVD-MAIN-01',
      PROCEQPID: equipmentId,
      EQPAREA: 'CVD',
      EQPTYPE: 'CVD',
      ISDOOROPEN: 'Y',
      PORTNAME: '1,2',
      PARA1: '92%',
      PARA1_LIMIT: 'N80',
      PARA2: '18%',
      PARA2_LIMIT: 'N90',
      PARA3: '11%',
      PARA3_LIMIT: 'N90',
      PARA4: '6%',
      PARA4_LIMIT: 'OVER',
    });
  },
  async recipeInfo() {
    return success({ RECIPE: 'CVD:RECIPE-A,RECIPE-B', DOWN_CH: '' });
  },
  async teRcpSelection() {
    return success({ TE_FLAG: 'N', TE_RCP: '', TE_ORDERS: '0' });
  },
  async machinePortStatus(_equipmentId, portName) {
    return success({ PORTSTATENAME: 'READY', PORTLOTNAME: '', SELECTED_PORT: portName });
  },
  async memorization() {
    return success({ ETCH_COMMRCP: 'Y', POPUP: '' });
  },
  async machinePortClear() {
    return success();
  },
  async doorOpen() {
    return success();
  },
  async remoteInterlockCheck() {
    return success({ POPUP: '' });
  },
  async remoteStart() {
    return success();
  },
  async remoteRestart() {
    return success();
  },
};
