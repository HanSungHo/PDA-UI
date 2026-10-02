export interface MoveOutMessageResponse {
  result: string;
}

export type MoveOutRawBody = Record<string, unknown>;

export interface MoveOutLotInfoRequest {
  lotId: string;
  facility: string;
  operatorId: string;
}

export interface MoveOutLotDisplay {
  lotNo: string;
  batchId: string;
  recipe: string;
  machine: string;
  maskTag: string;
  product: string;
  currentOperation: string;
  nextOperation: string;
  quantity: string;
  goodChips: string;
  commentQty: string;
}

export interface MoveOutLotInfo {
  lotId: string;
  batchId: string;
  area: string;
  display: MoveOutLotDisplay;
  operation: string;
  subOperation: string;
  processStep: string;
  operSequence: string;
  opType: string;
  processType: string;
  state: string;
  status: string;
  holdStatus: string;
  remoteCheck: string;
  nwCommentQty: string;
  pqcSkipUser: string;
  checkSkipWafer: string;
  checkSkipWaferMachine: string;
  checkSkipWaferRecipe: string;
  checkSkipWaferQty: string;
  checkSkipMachineQty: string;
  checkSkipReasonList: string;
  createCategory: '' | 'COUNT' | 'SLOT';
  lastEventComment: string;
  productQuantity: string;
  owner: string;
  checkEtch: string;
  checkInterlock: string;
  lampComment: string;
  aramComment: string;
  machineState: string;
  machineCode: string;
  holdCodeOut: string;
  holdCommentOut: string;
  etcMsg: string;
  pcmCheck: string;
  thicknessCheck: string;
  mvinWaferCheck: string;
  btaWarning: string;
  childBatchId: string;
  bibuhaDown: string;
  chamberList: string;
  checkGateInspMsg: string;
  automotiveFlag: string;
  photoOperType: string;
  nextBay: string;
  nextStocker: string;
}

export interface MoveOutOption {
  label: string;
  value: string;
}

export type MoveOutBayOption = MoveOutOption;
export type MoveOutStockerOption = MoveOutOption;

export interface MoveOutLoginUserCheckRequest {
  operatorId: string;
  eqpId: string;
  automotiveFlag: string;
}

export interface MoveOutLoginUserCheckResult {
  areaCheck: string;
}

export interface MoveOutRequest {
  lotId: string;
  facility: string;
  eqpId: string;
  operation: string;
  subOperation: string;
  recipe: string;
  opType: string;
  isSkip: 'Y' | 'N';
  operatorId: string;
  comment: string;
  isCarry: 'Y' | 'N';
  bay: string;
  stocker: string;
  quantity: string;
  inputMaskLogo: string;
  wfInterlock: 'Y' | 'N';
}

export interface MoveOutResult {
  tanpi: string;
  sampleResult: string;
}

export interface MoveOutFqcSamplingRequest {
  lotId: string;
  opType: string;
  eqpId: string;
  oper: string;
  subOper: string;
}

export interface MoveOutFqcSamplingResult {
  cycleComment: string;
  recipeComment: string;
  deleteCode: string;
  updateCode: string;
}

export interface MoveOutSlotInfoRequest {
  lotId: string;
  facility: string;
  operatorId: string;
}

export interface MoveOutSlotInfo {
  waferList: string;
  quantity: string;
  checkEtch: string;
}

export interface MoveOutUpdateSkipWaferRequest {
  lotId: string;
  machineName: string;
  recipeName: string;
  skipWafer: string;
  operatorId: string;
  skipReason: string;
  minusString: string;
}

export interface MoveOutUpdateSkipWaferResult {
  updateFlag: string;
}

export interface MoveOutProbeCardSetRequest {
  lotId: string;
  facility: string;
  quantity: string;
  machineName: string;
  operation: string;
  subOperation: string;
  operationDescription: string;
  operatorId: string;
}
