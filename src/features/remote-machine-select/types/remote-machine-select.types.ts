export type RemoteMachineChildFlow = 'meas' | 'imp' | 'cvd';

export interface RemoteMachineLotInfo {
  PRODUCT: string;
  RECIPE: string;
  EQPGROUP: string;
  JOBCODE: string;
  PROCESSSTEP: string;
  OPERATION: string;
  SUBOPERATION: string;
  STATUS: string;
  STATE: string;
  HOLDSTATUS: string;
  QUANTITY: string;
  NEXTOPERATION: string;
  NEXTSUBOPERATION: string;
  NEXTPROCESSSTEP: string;
  OPTYPE: string;
  AREA: string;
  TREEFLAG: string;
  C1STEPPERNAME: string;
  PHOTOTYPE: string;
  INLINESAMPLEMESSGE: string;
  EQPTYPE: string;
  EQP_MODEL: string;
}

export interface RemoteMachineEqpInfo {
  MAINEQPID: string;
  PROCEQPID: string;
  ISLOCALTRACK: string;
  PRNAME: string;
  RECIPE: string;
  INLINEMODE: string;
  LAYERID: string;
  RANDOMFLAG: string;
  SAMPLEFLAG: string;
  EQPTYPE: string;
  REWORK_CODE: string;
  BARCCOUNT: string;
  PMMESSAGE: string;
  PORTNAME: string;
}

export interface RemoteMachineResponse {
  isSuccess: boolean;
  messageBody: Record<string, string>;
  errorMessage: string;
}

export interface RemoteMachineSelectState {
  lotId: string;
  status: string;
  product: string;
  jobCode: string;
  currentOper: string;
  nextOper: string;
  recipe: string;
  pr: string;
  rework: string;
  hold: string;
  qty: string;
  eqpGroup: string;
  machineSelect: string;
  portList: string[];
  selectedPort: string;
  portStatus: string;
  portStatusKind: 'ready' | 'busy' | 'pending' | 'idle' | 'other' | '';
  machineDisabled: boolean;
  okDisabled: boolean;
  refreshDisabled: boolean;
  loading: boolean;
  dialogTitle: string;
  dialogMessage: string;
  dialogKind: 'info' | 'error' | 'warning';
}
