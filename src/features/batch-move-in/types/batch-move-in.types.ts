export type BatchMoveInStatus = string;

export interface BatchMoveInContext {
  batchId: string;
  lotId: string;
  eqpId: string;
  recipe: string;
  isSkip: string;
  facility: string;
}

export interface BatchMoveInItem {
  lotId: string;
  commentQty: number;
  status: BatchMoveInStatus;
  processStep: string;
  product: string;
  quantity: string;
  errorMessage: string;
  operation: string;
  subOperation: string;
  lotState: string;
  nwCommentQty: number;
  operSequence: string;
  processName?: string;
}

export interface BatchMoveInListResponse {
  context: BatchMoveInContext;
  unreadWorkCommentQty: number;
  items: BatchMoveInItem[];
}

export interface BatchMoveInRequest {
  lotId: string;
  facility: string;
  recipe: string;
  eqpId: string;
  operation: string;
  subOperation: string;
  isSkip: string;
  quantity: string;
}

export interface BatchMoveInResult {
  ok: boolean;
  message?: string;
}
