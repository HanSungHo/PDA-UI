import type {
  RemoteMeasEqpInfo,
  RemoteMeasLotInfo,
  RemoteMeasPortStatus,
} from '../types/remote-meas.types';

let mockModeEnabled = false;

export function setRemoteMeasMockMode(enabled: boolean): void {
  mockModeEnabled = enabled;
}

export function isRemoteMeasMockMode(): boolean {
  return mockModeEnabled;
}

export const mockRemoteMeasLotInfo: RemoteMeasLotInfo = {
  product: 'PRD-MEAS-100',
  facility: 'FAB1',
  operation: '3100',
  subOperation: '00',
  customer: 'CUST-KEY',
  category: 'MASS',
  engineer: 'KIM_ENG',
  packing: 'TRAY',
  quantity: '25',
  goodChips: '25',
  recipe: 'RCP-MEAS-01',
  changeRecipe: '',
  measEqpId: 'MEQP-01',
  changeEqpGroup: '',
  commentQty: 2,
  nwCommentQty: 0,
  batchId: '',
  area: 'DIFF',
  workedEqpId: 'DIFF-01',
  workedRecipe: 'DIFF-RCP-01',
  workedReticle: '',
  jobCode: 'JOB-M01',
  processStep: 'THICK_MEAS',
  opType: 'M',
  status: 'WAIT',
  state: 'WIP',
  holdStatus: '',
  operSequence: '010',
  etcMsg: '',
  machineName: '',
  portName: '',
  machineRecipeName: '',
  lotResUser: '',
  reworkFlag: 'N',
  oxMachine: 'FURN-01',
  skipAllowFlag: 'Y',
};

export const mockRemoteMeasEqpInfo: RemoteMeasEqpInfo = {
  mainEqpId: 'MMEQP-01',
  procEqpId: 'MEQP-01',
  eqpArea: 'DIFF',
  eqpType: 'THICKNESS',
  pmMessage: '',
  portName: 'PORT1,PORT2',
  recipeName: 'RCP-MEAS-01',
};

export const mockRemoteMeasPortStatus: RemoteMeasPortStatus = {
  portStateName: 'READY',
  portLotName: '',
  ackMsg: '',
};
