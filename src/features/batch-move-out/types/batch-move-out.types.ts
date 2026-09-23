export type BatchMoveOutStatus = string;

export interface BatchMoveOutContext {
  batchId: string;
  lotId: string;
  eqpId: string;
  recipe: string;
  comment: string;
  transport: string;
  facility: string;
}

export interface BatchMoveOutItem {
  lotId: string;
  commentQty: number;
  status: BatchMoveOutStatus;
  processStep: string;
  product: string;
  quantity: string;
  errorMessage: string;
  operation: string;
  subOperation: string;
  lotState: string;
  nwCommentQty: number;
  operSequence: string;
  opType: string;
  bayName: string;
  stockerName: string;
  processName?: string;
  thickArea?: string;
}

export interface BatchMoveOutListResponse {
  context: BatchMoveOutContext;
  checkParameter: string;
  unreadWorkCommentQty: number;
  items: BatchMoveOutItem[];
}

export interface BatchMoveOutListRequest {
  lotId: string;
  batchId: string;
  eqpId: string;
  facility: string;
  state: string;
}

export interface BatchMoveOutListResult {
  ok: boolean;
  data?: BatchMoveOutListResponse;
  message?: string;
}

export interface BatchMoveOutRequest {
  lotId: string;
  facility: string;
  recipe: string;
  eqpId: string;
  operation: string;
  subOperation: string;
  opType: string;
  comment: string;
  isCarry: string;
  bayName: string;
  stockerName: string;
  quantity: string;
  isSkip: string;
  operatorId: string;
  inputMaskLogo: string;
  wfInterlock: string;
}

export interface BatchMoveOutResult {
  ok: boolean;
  message?: string;
}

export interface BatchMoveOutFqcRequest {
  lotId: string;
  opType: string;
  eqpId: string;
  operation: string;
  subOperation: string;
}

export interface BatchMoveOutFqcResult {
  ok: boolean;
  message?: string;
  cycleComment?: string;
  recipeComment?: string;
  updateCode?: string;
  deleteCode?: string;
}

export interface BatchMoveOutBatchCountRequest {
  facility: string;
  eqpId: string;
  operatorId: string;
}

export interface BatchMoveOutBatchCountResult {
  ok: boolean;
  message?: string;
  batchDown?: boolean;
  downMessage?: string;
}
