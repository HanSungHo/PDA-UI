export interface BatchLotItem {
  lotId: string;
  commentQty: number;
  status: string;
  processStep: string;
  product: string;
  quantity: number;
  errorMessage?: string;
  operation: string;
  subOperation: string;
  lotState: string;
  unreadCommentQty: number;
  operSequence: string;
}

export type DummyMode = 'F' | 'T' | 'NONLOT';
export type RestartMode = 'F' | 'T';

export type PortStatusKind =
  | 'init'
  | 'run'
  | 'pending'
  | 'ready'
  | 'reserved'
  | 'complete'
  | 'idle'
  | 'unknown';

export interface RemoteFurnaceApiResult<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export interface RemoteFurnaceLotInfo {
  product: string;
  facility: string;
  operation: string;
  subOperation: string;
  recipe: string;
  changeRecipe: string;
  eqpGroup: string;
  changeEqpGroup: string;
  batchId: string;
  area: string;
  processStep: string;
  opType: string;
  status: string;
  state: string;
  holdStatus: string;
  operSequence: string;
  etcMsg: string;
  oxMachine: string;
  machineName: string;
  portName: string;
  machineRecipeName: string;
  lotResUser: string;
  nwCommentQty: number;
  processName: string;
  measType: string;
  samplingReason: string;
  samplingMsg: string;
  measOperationName: string;
  fqcLotName: string;
  ficdLot: string;
  inlineSampleMessage: string;
}

export interface RemoteFurnaceEqpInfo {
  mainEqpId: string;
  procEqpId: string;
  eqpArea: string;
  eqpType: string;
  pmMessage: string;
  portName: string;
  cycleMessage: string;
}

export interface RemoteFurnacePortStatus {
  portState: string;
  portLotName: string;
  ackMsg: string;
  chmaRet?: string;
  chmbRet?: string;
}

export interface RemoteFurnaceInterlockResult {
  ret: string;
  intlk: string;
}
