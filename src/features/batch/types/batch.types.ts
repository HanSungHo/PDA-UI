export type BatchType = 'R' | 'M';
export type BatchSubmitType = 'C' | 'M' | 'D';

export interface BatchMachineRequest {
  facility: string;
  eqpId: string;
}

export interface BatchMachineResponse {
  EQPID: string;
  MSG: string;
}

export interface BatchLotInfoRequest {
  lotId: string;
  facility: string;
  zone: string;
  eqpId: string;
  addedLotId: string;
}

export interface BatchLotInfoResponse {
  PRODUCT: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  QUANTITY: string;
  BATCHID: string;
  STEPRECIPE: string;
  LIMITZONE: string;
  STATUS: string;
  VIEWCOUNT: string;
  PROCESSNAME: string;
  PTIN: string;
  PTSPEC: string;
  CHECKQTIME: string;
  PROCESSOPERATIONTYPE: string;
  JALOT: string;
  MOLOT: string;
  CHECKRECIPE: string;
  JACOUNT: string;
  LIMITRECIPE: string;
  FQCSAMPLE: string;
  CHECKMACHINE: string;
  CHECKOPERTION: string;
  CHECKDEPOCOMMENT: string;
  CHECKRECYCLECOMMENT: string;
  CHECKTHCIKNESSCOMMENT: string;
  MAXBATCHMESSAGE: string;
}

export interface BatchGridItem {
  NUM: string;
  ISDCOL?: string;
  LOTID?: string;
  PRODUCT?: string;
  QUANTITY?: string;
  PROCESSSTEP?: string;
  OPERATION?: string;
  SUBOPERATION?: string;
  N?: string;
  RECIPE?: string;
  VIEWCOUNT?: string;
  WAFERTYPE?: string;
  THIN?: string;
  THSPEC?: string;
  PTIN?: string;
  PTSPEC?: string;
  STATUS?: string;
}

export interface BatchListByLotRequest {
  lotId: string;
  facility: string;
}

export interface BatchListByLotResponse {
  BATCHID: string;
  EQPID: string;
  BATCHTYPE: string;
  MWCOUNT: string;
  RECIPE: string;
  PARENTBATCHID: string;
  CHILDZONE: string;
  BATCHITEMS: BatchGridItem[];
}

export interface BatchCountResponse {
  BATCHCOUNTVIEW: string;
}

export interface ParentBatchIdRequest {
  facility: string;
  eqpId: string;
  checkLotId: string;
}

export interface ParentBatchIdItem {
  BATCHID: string;
}

export interface BatchZoneRequest {
  facility: string;
  batchId: string;
}

export interface BatchZoneResponse {
  ZONE: string;
}

export interface BatchSubmitItem {
  ZONE: string;
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  SLOTTYPE: string;
  PTIN: string;
  THIN: string;
}

export interface BatchCheckRequest {
  facility: string;
  eqpId: string;
  childCheck: string;
  items: BatchSubmitItem[];
}

export interface BatchSamplingFields {
  CUMCOUNT: string;
  MAXCOUNT: string;
  UPDATEFLAG: string;
  UVFLAG: string;
  SAMPLECYCLE: string;
}

export interface BatchCheckResponse extends BatchSamplingFields {
  BATCHMESSGE: string;
  REMOTE: string;
}

export interface BatchSubmitRequest extends BatchCheckRequest {
  type: BatchSubmitType;
  batchId: string;
  batchType: string;
  parentBatchId: string;
  childZone: string;
  operatorId: string;
  rowNo: string;
  monitorWaferCount: string;
  sampling?: BatchSamplingFields;
}

export interface BatchActionResponse {
  INTERLOCKMSG: string;
  TTINTERLOCKMSG: string;
  NOTICEDOWN: string;
  MSG: string;
}
