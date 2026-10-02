export const REMOTE_RAMCO_MESSAGES = {
  equipmentInfo: 'WETREMOTEEQPINFO',
  lotInfo: 'LOTINFO',
  recipeInfo: 'RECIPEINFO',
  portStatus: 'MACHINEPORTSTATUS',
  portClear: 'MACHINEPORTCLEAR',
  jobCancel: 'RAMJOBCANCEL',
  remoteStart: 'WETREMOTESTART',
} as const;

export type RemoteRamcoMessageName =
  (typeof REMOTE_RAMCO_MESSAGES)[keyof typeof REMOTE_RAMCO_MESSAGES];

export interface WetRemoteEqpInfoRequest {
  EQPID: string;
}

export interface WetRemoteEqpInfoResponse {
  MAINEQPID?: string;
  JOBID?: string;
  PCOUNT?: string;
  CNT?: string;
  EQPTYPE?: string;
  EQPAREA?: string;
  INGRCP?: string;
  INGRCP2?: string;
  COM_TIME1?: string;
  COM_TIME2?: string;
  NUMCST?: string;
  PMMESSAGE?: string;
  RECOMM3?: string;
  PORTNAME?: string;
}

export interface LotInfoRequest {
  TYPE: 'MVIN';
  LOTID: string;
  FACILITY: string;
}

export interface LotInfoResponse {
  PRODUCT?: string;
  OPERATION?: string;
  ENGINEER?: string;
  QUANTITY?: string;
  RECIPE?: string;
  CHANGERECIPE?: string;
  COMMENTQTY?: string;
  NWCOMMENTQTY?: string;
  BATCHID?: string;
  AREA?: string;
  WORKEDEQPID?: string;
  WORKEDRECIPE?: string;
  JOBCODE?: string;
  PROCESSSTEP?: string;
  SUBOPERATION?: string;
  OPTYPE?: string;
  STATUS?: string;
  STATE?: string;
  HOLDSTATUS?: string;
  OPERSEQUENCE?: string;
  ETCMSG?: string;
  MACHINENAME?: string;
  PORTNAME?: string;
  MACHINERECIPENAME?: string;
  LOTRESUSER?: string;
  SKIPALLOWFLAG?: string;
}

export interface RecipeInfoRequest {
  ISPHOTO: string;
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PRODUCT: string;
  EQPID: string;
  OPTYPE: string;
  FACILITY: string;
}

export interface RecipeInfoAshRequest extends RecipeInfoRequest {
  CHMEQPID: string;
}

export interface RecipeInfoResponse {
  RECIPE?: string;
  POP_MSG?: string;
  QTIME_FLAG?: string;
  QTIME_FLAG_W?: string;
}

export interface MachinePortStatusRequest {
  EQPID: string;
  PORTNAME: string;
  LOTID: string;
  RECIPE: string;
}

export interface MachinePortStatusResponse {
  PORTSTATENAME?: string;
  ACKMSG?: string;
}

export interface MachinePortClearRequest {
  MACHINENAME: string;
  PORTNAME: string;
}

export interface RamJobCancelRequest {
  MACHINETYPE: string;
  MACHINENAME: string;
  MACHINENAME2: string;
  EVENTUSER: string;
  JOBNAME1: string;
  JOBNAME2: string;
}

export interface RamJobCancelResponse {
  RET?: string;
}

export interface WetRemoteStartRequest {
  MACHINENAME: string;
  MACHINENAME2: string;
  MACHINETYPE: string;
  AREANAME: string;
  NUMCASS: string;
  LOTNAME: string;
  LOTNAME2: string;
  RECIPENAME: string;
  JOBNAME: string;
  PRODUCTQTY: string;
  PRODUCTQTY2: string;
  OPERATION: string;
  OPERATION2: string;
  EVENTUSER: string;
  ISCARRAY: string;
  BAY: string;
  STOCKER: string;
}

export type RemoteRamcoApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface RemoteRamcoApi {
  fetchEquipmentInfo(
    request: WetRemoteEqpInfoRequest,
  ): Promise<RemoteRamcoApiResult<WetRemoteEqpInfoResponse>>;
  fetchLotInfo(request: LotInfoRequest): Promise<RemoteRamcoApiResult<LotInfoResponse>>;
  fetchRecipeInfo(
    request: RecipeInfoRequest | RecipeInfoAshRequest,
  ): Promise<RemoteRamcoApiResult<RecipeInfoResponse>>;
  fetchPortStatus(
    request: MachinePortStatusRequest,
  ): Promise<RemoteRamcoApiResult<MachinePortStatusResponse>>;
  clearPort(request: MachinePortClearRequest): Promise<RemoteRamcoApiResult<null>>;
  cancelJobs(request: RamJobCancelRequest): Promise<RemoteRamcoApiResult<RamJobCancelResponse>>;
  startRemote(request: WetRemoteStartRequest): Promise<RemoteRamcoApiResult<null>>;
}
