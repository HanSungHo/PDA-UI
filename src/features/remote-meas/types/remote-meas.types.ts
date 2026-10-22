export type PortStatusKind = 'RUN' | 'PENDING' | 'READY' | 'RESERVED' | 'COMPLETE' | 'IDLE' | '';

export type MeasFlag = 'P' | 'T' | 'E';

export interface RemoteMeasApiResult<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export interface RemoteMeasLotInfo {
  product: string;
  facility: string;
  operation: string;
  subOperation: string;
  customer: string;
  category: string;
  engineer: string;
  packing: string;
  quantity: string;
  goodChips: string;
  recipe: string;
  changeRecipe: string;
  measEqpId: string;
  changeEqpGroup: string;
  commentQty: number;
  nwCommentQty: number;
  batchId: string;
  area: string;
  workedEqpId: string;
  workedRecipe: string;
  workedReticle: string;
  jobCode: string;
  processStep: string;
  opType: string;
  status: string;
  state: string;
  holdStatus: string;
  operSequence: string;
  etcMsg: string;
  machineName: string;
  portName: string;
  machineRecipeName: string;
  lotResUser: string;
  reworkFlag: string;
  oxMachine: string;
  skipAllowFlag: string;
}

export interface RemoteMeasEqpInfo {
  mainEqpId: string;
  procEqpId: string;
  eqpArea: string;
  eqpType: string;
  pmMessage: string;
  portName: string;
  recipeName: string;
}

export interface RemoteMeasPortStatus {
  portStateName: string;
  portLotName: string;
  ackMsg: string;
}

export interface RemoteMeasStartPayload {
  machineName: string;
  machineType: string;
  lotName: string;
  portName: string;
  recipeName: string;
  procQty: string;
  measFlag: string;
  prodMachine: string;
  reworkFlag: string;
  eventUser: string;
  wfList: string;
  product: string;
  operation: string;
}

export interface RemoteMeasSlotInfo {
  waferList: string;
  quantity: number;
  checkEtch?: string;
}
