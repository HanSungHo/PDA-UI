export interface WetAutoEquipmentRequest {
  EQPID: string;
}

export interface WetAutoEquipmentResponse {
  MAINEQPID?: string;
  JOBID?: string;
  PCOUNT?: string;
  EQPTYPE?: string;
  EQPAREA?: string;
  PMMESSAGE?: string;
}

export interface WetAutoLotDetails {
  product: string;
  operation: string;
  quantity: string;
  operationCode: string;
  subOperation: string;
  processStep: string;
  opType: string;
  operSequence: string;
}

export interface WetAutoSessionState {
  machineInput: string;
  frontInput: string;
  rearInput: string;
  equipment?: WetAutoEquipmentResponse;
  reservationTime: string;
  recipe: string;
  frontLot: WetAutoLotDetails;
  rearLot: WetAutoLotDetails;
  frontLotEnabled: boolean;
  rearLotEnabled: boolean;
  carryEnabled: boolean;
  frontCommentEnabled: boolean;
  rearCommentEnabled: boolean;
  startEnabled: boolean;
  carryChecked: boolean;
  bayOptions: string[];
  stockerOptions: string[];
  selectedBay: string;
  selectedStocker: string;
  bayEnabled: boolean;
  stockerEnabled: boolean;
  cachedBay: string;
  cachedStocker: string;
  focusTarget: 'machine' | 'front' | 'rear';
}

export interface WetAutoLotRequest {
  TYPE: 'MVIN';
  LOTID: string;
  FACILITY: string;
}

export interface WetAutoLotResponse {
  PRODUCT?: string;
  OPERATION?: string;
  QUANTITY?: string;
  JOBCODE?: string;
  PROCESSSTEP?: string;
  SUBOPERATION?: string;
  OPTYPE?: string;
  COMMENTQTY?: string;
  NWCOMMENTQTY?: string;
  STATUS?: string;
  STATE?: string;
  HOLDSTATUS?: string;
  BATCHID?: string;
  AREA?: string;
  LOTRESUSER?: string;
  OPERSEQUENCE?: string;
}

export interface WetAutoRecipeRequest {
  ISPHOTO: 'N';
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PRODUCT: string;
  EQPID: string;
  OPTYPE: string;
  FACILITY: string;
}

export interface WetAutoRecipeResponse {
  RECIPE?: string;
}

export interface WetAutoBayRequest {
  FACILITY: string;
}

export interface WetAutoBayResponse {
  BAYS?: { ITEM?: Array<{ BAY?: string }> };
}

export interface WetAutoStockerRequest {
  BAY: string;
  FACILITY: string;
}

export interface WetAutoStockerResponse {
  STOCKERS?: { ITEM?: Array<{ STOCKER?: string }> };
}

export interface WetAutoStartRequest {
  MACHINENAME: string;
  MACHINENAME2: string;
  MACHINETYPE: string;
  AREANAME: string;
  NUMCASS: '1' | '2';
  LOTNAME: string;
  LOTNAME2: string;
  RECIPENAME: string;
  JOBNAME: string;
  PRODUCTQTY: string;
  PRODUCTQTY2: string;
  OPERATION: string;
  OPERATION2: string;
  EVENTUSER: string;
  ISCARRAY: 'N' | 'Y';
  BAY: string;
  STOCKER: string;
}

export type WetAutoApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface WetAutoApi {
  fetchEquipment(
    request: WetAutoEquipmentRequest,
  ): Promise<WetAutoApiResult<WetAutoEquipmentResponse>>;
  fetchLot(request: WetAutoLotRequest): Promise<WetAutoApiResult<WetAutoLotResponse>>;
  fetchRecipe(request: WetAutoRecipeRequest): Promise<WetAutoApiResult<WetAutoRecipeResponse>>;
  fetchBays(request: WetAutoBayRequest): Promise<WetAutoApiResult<WetAutoBayResponse>>;
  fetchStockers(request: WetAutoStockerRequest): Promise<WetAutoApiResult<WetAutoStockerResponse>>;
  start(request: WetAutoStartRequest): Promise<WetAutoApiResult<null>>;
}
