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
  CESC?: string;
  CUTOFF: string;
  FACTORYNAME?: string;
  GOLDENPATHEQP?: string;
  ENGR: string;
  ENGR2: string;
  ESHEETITEMS: ESheetInfoStepResponse[];
  FACILITY: string;
  HOLD_COMMENT?: string;
  LOTRESUSER: string;
  LASTLOGGEDOUTTIME?: string;
  LOTPROCESSSTATE?: string;
  MAINTITEM: string;
  PHOTOJOBCODE: string;
  PRIORITY: string;
  PROCESSOPERATIONTYPE?: string;
  PRODUCT: string;
  PRODUCTQUANTITY: string;
  QTIMECHECK?: string;
  REMAINLAYERS: string;
  RETICLELIST: string;
  REWORK_BACKCOL?: string;
  ROOTLOTNAME?: string;
  SAFELAUNCHLOT?: string;
  PROCESSFLOWNAME?: string;
  STATUS: string;
  TAT: string;
}

export type ESheetInfoResponse = MessageResponseData;

export interface ESheetInfoStepResponse {
  ACTIONTYPE: string;
  BAY: string;
  CHANGEEQPGROUP?: string;
  CHANGERECIPE?: string;
  COMMENTCNT: string;
  CPN?: string;
  ENDTIME: string;
  EQPGROUP: string;
  FUTUREACTIONDESC: string;
  INOPERNAME: string;
  INQTY: string;
  ISCURRENT: string;
  ISDCOL: string;
  ISREWORK: string;
  OPERATION: string;
  OPERTYPE: string;
  OPERSEQUENCE?: string;
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
  operationNumber: string;
  c: number | string;
  current: boolean;
  id: string;
  i: number | string;
  isDcol: string;
  o: number | string;
  operation: string;
  operationType: string;
  displayName: string;
  subOperationNumber: string;
  realRecipe: string;
  realEquipmentId: string;
  realReticle: string;
  recipe: string;
  recipeChanged: boolean;
  equipmentGroupChanged: boolean;
  isRework: string;
  description: string;
  subOperation: string;
  commentCount: string;
  endTime: string;
  lotStatus: string;
  operSequence: string;
  inOperationName: string;
  outOperationName: string;
  startTime: string;
  futureActionDescription: string;
  facility: string;
  equipmentGroup: string;
  rowClass: string;
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

/** Current-process fields from the Android activity_esheet.xml block above the grid. */
export interface ESheetCurrentProcessSummary {
  bay: string;
  operationName: string;
  moveInTime: string;
  realRecipe: string;
  recipe: string;
  machine: string;
  /** Double-tap dialog content; empty when Android registers no dialog (LOT moved in). */
  recipeDetails: string;
  machineDetails: string;
}

export interface ESheetViewData {
  automotive: boolean;
  cutoff: string;
  currentProcessId?: string;
  currentProcessSummary: ESheetCurrentProcessSummary;
  engineer: string;
  engineerSecondary: string;
  engineerSecondaryWarning: boolean;
  equipmentGroup: string;
  facility: string;
  factoryName: string;
  jobCode: string;
  jobCodeTone: 'green' | 'orange' | 'cyan' | 'default';
  lotQuantity: string;
  lotStatus: string;
  lotStatusCode: string;
  lotStatusTone: 'rework' | 'hold' | 'run' | 'wait' | 'default';
  lotType: string;
  lotTypeTone: 'green' | 'orange' | 'yellow' | 'cyan' | 'default';
  maintenanceItem: string;
  qTimeTarget: boolean;
  showLastLoggedOutTime: boolean;
  lastLoggedOutTime: string;
  reworkBackColor: string;
  maskActionAvailable: boolean;
  processCode: string;
  routeName: string;
  processRows: ESheetProcessRow[];
  product: string;
  holdComment: string;
  reticleList: string;
  remainingLayers: string;
  rootLotName: string;
  tat: string;
  goldenEquipment: string;
  safeLaunch: boolean;
}
