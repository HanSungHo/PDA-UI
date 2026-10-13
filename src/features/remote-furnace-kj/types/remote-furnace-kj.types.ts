export interface FurnaceKjCheckRequest {
  LOTID: string;
}

export interface FurnaceKjCheckResponse {
  CNT: string;
  FURNACE: 'KJ' | 'KEC' | 'OTHER';
}

export interface FurnaceKjLotRequest {
  LOTID: string;
  FACILITY: string;
  USERID: string;
}

export interface FurnaceKjLotInfo {
  LOTID: string;
  PRODUCT: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  OPERSEQUENCE: string;
  RECIPE: string;
  BATCHID: string;
  STATUS: string;
  STATE: string;
  HOLDSTATUS: string;
  NWCOMMENTQTY: string;
  COMMENTQTY: string;
  LOTRESUSER: string;
  OPTYPE: string;
  AREA: string;
  MEASTYPE: string;
  SAMPLINGREASON: string;
  SAMPLINGMSG: string;
  MEASOPERATIONNAME: string;
  FQCLOTNAME: string;
  FICDLOT: string;
  INLINESAMPLEMESSGE: string;
  ETCMSG: string;
  SKIPALLOWFLAG: string;
  PROCESSNAME: string;
  EQPGROUP: string;
  CHANGEEQPGROUP: string;
  CHANGERECIPE: string;
  MACHINENAME: string;
  PORTNAME: string;
  MACHINERECIPENAME: string;
  OXMACHINE: string;
}

export interface FurnaceKjBatchListRequest {
  LOTID: string;
  FACILITY: string;
}

export interface FurnaceKjBatchLot {
  LOTID: string;
  PRODUCT: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  OPERSEQUENCE: string;
  STATUS: string;
  LOTSTATE: string;
  COMMENTQTY: string;
  NWCOMMENTQTY: string;
  ISCHECK: string;
  PROCESSNAME: string;
  QUANTITY: string;
  ERRORMESSAGE: string;
}

export interface FurnaceKjBatchList {
  rows: FurnaceKjBatchLot[];
  BATCHID: string;
  NO_BATCH: string;
  STEPREMOVE: string;
  NWCOMMENTQTY: string;
  dummyLotIds: string[];
}

export interface FurnaceKjEquipmentRequest {
  EQPID: string;
}

export interface FurnaceKjEquipmentInfo {
  MAINEQPID: string;
  PROCEQPID: string;
  EQPAREA: string;
  EQPTYPE: string;
  ISDOOROPEN: string;
  PMMESSAGE: string;
  PORTNAME: string;
  CYCLE_MESSAGE: string;
  FURNACE: 'KJ' | 'KEC' | 'OTHER';
}

export interface FurnaceKjRecipeRequest {
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PRODUCT: string;
  EQPID: string;
  OPTYPE: string;
  FACILITY: string;
  ISDUMMY: string;
}

export interface FurnaceKjRecipeInfo {
  RECIPE: string;
  ETCHMESSAGE: string;
  MULTIMOVEINACTION: string;
  ETCMSG: string;
}

export interface FurnaceKjInterlockRequest {
  MACHINENAME: string;
  BATCHID: string;
  RECIPENAME: string;
  LOTLIST: string;
}

export interface FurnaceKjInterlockInfo {
  RET: string;
  INTLK: 'Y' | 'N';
}

export interface FurnaceKjPortStatusRequest {
  MACHINENAME: string;
  PORTNAME: string;
  LOTID: string;
  RECIPE: string;
}

export interface FurnaceKjPortStatus {
  PORTSTATENAME: string;
  PORTLOTNAME: string;
  ACKMSG: string;
  PORTSTATENAME1: string;
  PORTSTATENAME2: string;
}

export interface RemoteFurnaceKjDraft {
  lotId: string;
  lotInfo?: FurnaceKjLotInfo;
  batchId: string;
  batchRows: FurnaceKjBatchLot[];
  equipmentInput: string;
  equipment?: FurnaceKjEquipmentInfo;
  standardMachine: string;
  standardMachineError?: boolean;
  externalMachine: string;
  recipeOptions: string[];
  selectedRecipe: string;
  portOptions: string[];
  selectedPort: string;
  portStatus: string;
  dummyMode: 'F' | 'T' | 'NONLOT';
  isReserved: boolean;
  isLotEligible: boolean;
  isInterlocked: boolean;
  startEnabled: boolean;
  restartEnabled: boolean;
  clearPortEnabled: boolean;
}

export interface FurnaceKjClearPortRequest {
  MACHINENAME: string;
  PORTNAME: string;
}

export interface FurnaceKjEquipmentStatusRequest {
  MAINEQPID: string;
  FACILITY: string;
  STATUS: string;
  REASONCODE: string;
  EVENTNAME: string;
  USERID: string;
  USERNAME: string;
  REMARK: string;
}

export interface FurnaceKjStartRequest {
  MACHINENAME: string;
  BATCHID: string;
  RECIPENAME: string;
  EVENTUSER: string;
  PORTNAME: string;
  CMDTYPE: 'S' | 'R';
  LOTLIST: string;
  ISDUMMY: string;
  LOTNAME: string;
  CHKNOBATCH: string;
}

export interface FurnaceKjCommandResponse {
  RET: string;
}

export type RemoteFurnaceKjApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface RemoteFurnaceKjApi {
  checkFurnaceKj(
    request: FurnaceKjCheckRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjCheckResponse>>;
  fetchLotInfo(request: FurnaceKjLotRequest): Promise<RemoteFurnaceKjApiResult<FurnaceKjLotInfo>>;
  fetchBatchListByLot(
    request: FurnaceKjBatchListRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjBatchList>>;
  fetchEquipmentInfo(
    request: FurnaceKjEquipmentRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjEquipmentInfo>>;
  fetchRecipeInfo(
    request: FurnaceKjRecipeRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjRecipeInfo>>;
  checkInterlock(
    request: FurnaceKjInterlockRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjInterlockInfo>>;
  fetchKjPortStatus(
    request: FurnaceKjPortStatusRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjPortStatus>>;
  clearPort(request: FurnaceKjClearPortRequest): Promise<RemoteFurnaceKjApiResult<null>>;
  changeEquipmentStatus(
    request: FurnaceKjEquipmentStatusRequest,
  ): Promise<RemoteFurnaceKjApiResult<FurnaceKjCommandResponse>>;
  startKjRemote(request: FurnaceKjStartRequest): Promise<RemoteFurnaceKjApiResult<null>>;
}
