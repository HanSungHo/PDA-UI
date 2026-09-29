export type IlStatus = 'N' | 'Y' | 'C';

export interface InlineInfo {
  product: string;
  operation: string;
  photoJobCode: string;
  maskTag: string;
  changeMaskTag: string;
  inlineRecipe: string;
  processStep: string;
  quantity: string;
  criticalStepper: string;
  criticalStepper2: string;
  criticalStepper3: string;
}

export interface InlineRow {
  processName: string;
  isComplete: IlStatus;
  localRecipe: string;
  workedEqp: string;
  identCode: string;
  subOperation: string;
}

export interface InlineItem {
  subOperation: string;
  identCode: string;
}

export interface InlineInfoResponse {
  info: InlineInfo;
  rows: InlineRow[];
  isSuccessful: boolean;
  errorMessage?: string;
}

export interface MaskLocationInfo {
  maskTag: string;
  product: string;
  giben: string;
  status: string;
  isUse: string;
  currentLoc: string;
  subLocation3: string;
  afterInsp: string;
}

export interface InlineSetParams {
  lotId: string;
  operation: string;
  maskTag: string;
  quantity: string;
  isFullInline: 'Y' | 'N';
  items: InlineItem[];
}

export interface InlineSetResponse {
  isSuccessful: boolean;
  errorMessage?: string;
  isExposure: string;
  eqpGroup: string;
  expEqpGroup: string;
  subOperation: string;
  commentQty: string;
  nrwCommentQty: string;
}

export interface InlineResult {
  eqpGroup: string;
  eqpId: string;
  recipe: string;
  commentQty: string;
  nrwCmtCount: string;
  nest: string;
  identCode: string;
  maskTag: string;
}
