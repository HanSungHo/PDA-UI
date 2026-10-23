export interface DropdownOption {
  label: string;
  value: string;
}

export interface PortViewState {
  id: 1 | 2;
  label: string;
  lotId: string;
  product: string;
  jobCode: string;
  operation: string;
  qty: string;
  searchOperation: string;
  searchSubOperation: string;
  searchOpType: string;
  searchProcessStep: string;
  searchOperSeq: string;
  isSearchDisabled: boolean;
  isCommentEnabled: boolean;
  isReadonlyInput: boolean;
}

// --- Legacy Request Payloads (1:1 with MessageFactoryUtil) ---

export interface LotInfoPayload {
  TYPE: 'MVIN';
  LOTID: string;
  FACILITY: string;
}

export interface RecipeInfoPayload {
  ISPHOTO: string;
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PRODUCT: string;
  EQPID: string;
  OPTYPE: string;
  FACILITY: string;
}

export interface MemorizationPayload {
  EQPID: string;
  RECIPE: string;
  LOTID: string;
  PORTNAME: string;
  CH_EQPID: string;
  USER_ID: string;
  EQP_TYPE: string;
}

export interface AreaBayInfoPayload {
  FACILITY: string;
}

export interface BayStockerInfoPayload {
  BAY: string;
  FACILITY: string;
}

export interface ImpBatchRemoteStartPayload {
  LOTNAME1: string;
  LOTNAME2: string;
  MACHINENAME: string;
  MACHINETYPE: string;
  RECIPENAME: string;
  ISCARRY: 'Y' | 'N';
  BAY: string;
  STOCKER: string;
  EVENTUSER: string;
  PRODUCTNAME1: string;
  PRODUCTNAME2: string;
  OPERATION1: string;
  OPERATION2: string;
  JOBCODE1: string;
  JOBCODE2: string;
}

// --- Legacy Response Bodies (1:1 with ResponseDataToJsonUtil) ---

export interface LotInfoBody {
  PRODUCT: string;
  OPERATION: string;
  ENGINEER: string;
  QUANTITY: string;
  RECIPE: string;
  CHANGERECIPE: string;
  COMMENTQTY: string;
  NWCOMMENTQTY: string;
  BATCHID: string;
  AREA: string;
  WORKEDEQPID: string;
  WORKEDRECIPE: string;
  JOBCODE: string;
  PROCESSSTEP: string;
  SUBOPERATION: string;
  OPTYPE: string;
  STATUS: string;
  STATE: string;
  HOLDSTATUS: string;
  OPERSEQUENCE: string;
  ETCMSG: string;
  MACHINENAME: string;
  PORTNAME: string;
  MACHINERECIPENAME: string;
  LOTRESUSER: string;
  SKIPALLOWFLAG: string;
}

export interface RecipeInfoBody {
  RECIPE: string;
}

export interface MemorizationBody {
  POPUP: string;
}

export interface AreaBayItem {
  BAY: string;
}

export interface AreaBayInfoBody {
  BAYS: AreaBayItem[];
}

export interface BayStockerItem {
  STOCKER: string;
}

export interface BayStockerInfoBody {
  STOCKERS: BayStockerItem[];
}

export interface HifosServiceResult<T> {
  isSuccessFul: boolean;
  body: T;
  errorMessage: string;
}
