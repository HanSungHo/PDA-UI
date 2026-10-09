import type {
  ChangeEquipmentStatusRequest,
  LotInfoRequest,
  RecipeInfoRequest,
  RemoteFurnaceKecStartRequest,
} from '../services/remote-furnace-kec.api';

export type RemoteFurnaceKecDummyMode = 'F' | 'T' | 'NONLOT';
export type RemoteFurnaceKecPortCommand = 'start' | 'restart' | 'enter' | 'enterStart';

export interface RemoteFurnaceKecBatchRow {
  LOTID: string;
  COMMENTQTY: string;
  STATUS: string;
  PROCESSSTEP: string;
  PRODUCT: string;
  QUANTITY: string;
  ERRORMESSAGE: string;
  OPERATION: string;
  SUBOPERATION: string;
  LOTSTATE: string;
  NWCOMMENTQTY: string;
  OPERSEQUENCE: string;
  PROCESSNAME: string;
}

export interface RemoteFurnaceKecActionAvailability {
  clearPort: boolean;
  start: boolean;
  restart: boolean;
  enter: boolean;
  enterStart: boolean;
}

export interface RemoteFurnaceKecApi {
  FURNACE_KJCHECK(lotId: string): Promise<Record<string, unknown>>;
  REMOTEEQPINFO(equipmentId: string): Promise<Record<string, unknown>>;
  RECIPEINFO(request: RecipeInfoRequest): Promise<Record<string, unknown>>;
  FURNACEDUMMYRCP(equipmentId: string): Promise<Record<string, unknown>>;
  LOTINFO(request: LotInfoRequest, includeOperator: boolean): Promise<Record<string, unknown>>;
  BATCHLISTBYLOT(lotId: string, facility: string, status: string): Promise<Record<string, unknown>>;
  FURNACEINTLKCHECK(
    machineName: string,
    batchId: string,
    recipeName: string,
    lotList: string,
  ): Promise<Record<string, unknown>>;
  MACHINEPORTSTATUS_KJ(
    equipmentId: string,
    portName: string,
    lotId: string,
    recipeName: string,
  ): Promise<Record<string, unknown>>;
  MACHINEPORTCLEAR(equipmentId: string, portName: string): Promise<Record<string, unknown>>;
  CHANGEEQPSTATUS(request: ChangeEquipmentStatusRequest): Promise<Record<string, unknown>>;
  FurnaceremoteStart_KEC(request: RemoteFurnaceKecStartRequest): Promise<Record<string, unknown>>;
}

export interface RemoteFurnaceKecDialog {
  alert(title: string, message: string): Promise<void>;
  confirm(
    title: string,
    message: string,
    positiveLabel?: string,
    negativeLabel?: string,
  ): Promise<boolean>;
}
