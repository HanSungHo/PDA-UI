import type { MessageResponseData } from 'src/types/api';

export type ESheetMode = 'S' | 'P' | 'M';

export interface ESheetInfoRequest {
  facility: string;
  forwardCount: string;
  historyCount: string;
  lotId: string;
}

/** ESHEETINFO payload aligned with the legacy message body. */
export interface ESheetInfoResult {
  AUTOMOTIVEFLAG: string;
  CUTOFF: string;
  ENGR: string;
  ENGR2: string;
  ESHEETITEMS: ESheetInfoStepResponse[];
  FACILITY: string;
  LOTRESUSER: string;
  MAINTITEM: string;
  PHOTOJOBCODE: string;
  PRIORITY: string;
  PRODUCT: string;
  PRODUCTQUANTITY: string;
  REMAINLAYERS: string;
  RETICLELIST: string;
  STATUS: string;
  TAT: string;
}

export type ESheetInfoResponse = MessageResponseData;

export interface ESheetInfoStepResponse {
  ACTIONTYPE: string;
  BAY: string;
  COMMENTCNT: string;
  ENDTIME: string;
  EQPGROUP: string;
  FUTUREACTIONDESC: string;
  INOPERNAME: string;
  INQTY: string;
  ISCURRENT: string;
  ISDCOL: string;
  ISREWORK: string;
  OPERATION: string;
  OUTOPERNAME: string;
  OUTQTY: string;
  PROCESSSTEP: string;
  REALEQPID: string;
  REALRECIPE: string;
  REALRETICLE: string;
  RECIPE: string;
  SPEC: string;
  STARTTIME: string;
  SUBOPERATION: string;
}

export interface ESheetProcessRow {
  actionType: string;
  bay: string;
  name: string;
  c: number | string;
  current: boolean;
  id: string;
  i: number | string;
  isDcol: string;
  o: number | string;
  operation: string;
  operationType: string;
  realRecipe: string;
  description: string;
  subOperation: string;
  commentCount: string;
  endTime: string;
  lotStatus: string;
  operSequence: string;
  facility: string;
  equipmentGroup: string;
}

/** Raw fields required by the shared Draw Menu List action rules. */
export interface ESheetDrawMenuRow {
  ACTIONTYPE: string;
  COMMENTCNT: string;
  ENDTIME: string;
  EQPGROUP: string;
  ISCURRENT: string;
  LOT_STATUS: string;
  OPERATION: string;
  OPERSEQUENCE: string;
  PROCESSSTEP: string;
  SUBOPERATION: string;
}

export interface ESheetOperationContext {
  lotId: string;
  factoryName: string;
  productName: string;
  routeName: string;
  area: string;
}

export interface ESheetGridRow extends ESheetProcessRow {
  rowClass: string;
}

export interface ESheetViewData {
  automotive: boolean;
  cutoff: string;
  currentProcessId?: string;
  engineer: string;
  engineerSecondary: string;
  equipmentGroup: string;
  facility: string;
  jobCode: string;
  lotQuantity: string;
  lotStatus: string;
  lotType: string;
  maintenanceItem: string;
  maskActionAvailable: boolean;
  processCode: string;
  processRows: ESheetProcessRow[];
  product: string;
  remainingLayers: string;
  tat: string;
}
