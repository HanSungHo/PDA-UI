export type RemoteCvdMessageBody = Record<string, string>;

export interface RemoteCvdResponse {
  isSuccess: boolean;
  messageBody: RemoteCvdMessageBody;
  errorMessage: string;
}

export interface RemoteCvdRecipeRequest {
  isPhoto: string;
  lotId: string;
  operation: string;
  subOperation: string;
  product: string;
  equipmentId: string;
  operationType: string;
  facility: string;
}

export interface RemoteCvdStartRequest {
  machineName: string;
  machineName2: string;
  machineType: string;
  areaName: string;
  lotName: string;
  portName: string;
  recipeName: string;
  productQty: string;
  operation: string;
  jobCode: string;
  productName: string;
  eventUser: string;
  precedeFlag: string;
  qTimeHold: string;
}

export type RemoteCvdRestartRequest = Omit<RemoteCvdStartRequest, 'qTimeHold'>;

export interface RemoteCvdApi {
  lotInfo(type: string, lotId: string, facility: string): Promise<RemoteCvdResponse>;
  remoteEqpInfo(equipmentId: string): Promise<RemoteCvdResponse>;
  recipeInfo(request: RemoteCvdRecipeRequest): Promise<RemoteCvdResponse>;
  teRcpSelection(equipmentId: string, lotId: string): Promise<RemoteCvdResponse>;
  machinePortStatus(
    equipmentId: string,
    portName: string,
    lotId: string,
    recipe: string,
  ): Promise<RemoteCvdResponse>;
  memorization(
    equipmentId: string,
    recipe: string,
    lotId: string,
    portName: string,
    chamberEquipmentId: string,
    operatorId: string,
    equipmentType: string,
  ): Promise<RemoteCvdResponse>;
  machinePortClear(machineName: string, portName: string): Promise<RemoteCvdResponse>;
  doorOpen(
    machineName: string,
    portName: string,
    areaName: string,
    machineType: string,
  ): Promise<RemoteCvdResponse>;
  remoteInterlockCheck(
    lotId: string,
    operation: string,
    subOperation: string,
    equipmentId: string,
    recipe: string,
  ): Promise<RemoteCvdResponse>;
  remoteStart(request: RemoteCvdStartRequest): Promise<RemoteCvdResponse>;
  remoteRestart(request: RemoteCvdRestartRequest): Promise<RemoteCvdResponse>;
}

export interface RemoteCvdState {
  lotId: string;
  portState: string;
  standardEquipment: string;
  isEquipmentGroupChanged: boolean;
  isRecipeChanged: boolean;
  equipmentId: string;
  recipeOptions: string[];
  selectedRecipe: string;
  portOptions: string[];
  selectedPort: string;
  jobCode: string;
  product: string;
  currentOperation: string;
  quantity: string;
  facility: string;
  customer: string;
  saleType: string;
  engineer: string;
  packing: string;
  goodChips: string;
  commentCount: string;
  qTime: string;
  chamberValues: Record<'A' | 'B' | 'C' | 'D', string>;
  chamberLimits: Record<'A' | 'B' | 'C' | 'D', string>;
  precedeOptionsVisible: boolean;
  precedeChoices: Array<{ value: string; label: string }>;
  selectedPrecede: string;
  precedeTypeOptions: string[];
  selectedPrecedeType: string;
  rcpConditionsVisible: boolean;
  readCommentDisabled: boolean;
  equipmentCancelDisabled: boolean;
  doorOpenDisabled: boolean;
  clearPortDisabled: boolean;
  startDisabled: boolean;
  restartDisabled: boolean;
  equipmentDisabled: boolean;
  recipeDisabled: boolean;
  portDisabled: boolean;
  loading: boolean;
  dialogTitle: string;
  dialogMessage: string;
  dialogKind: 'alert' | 'confirm' | 'info';
}

export interface RemoteCvdDialog {
  alert(title: string, message: string): Promise<void>;
  confirm(title: string, message: string): Promise<boolean>;
}

export interface RemoteCvdOptions {
  lotId: string;
  facility: string;
  operatorId: string;
  dialog: RemoteCvdDialog;
  confirmRecipe(recipeName: string, lotId: string): Promise<boolean>;
  onComplete(): void;
  onCancel(): void;
  onOpenCommentList(context: {
    lotId: string;
    operation: string;
    subOperation: string;
    processStep: string;
    operSequence: string;
    facility: string;
  }): void;
  onOpenRcpConditions(context: {
    lotId: string;
    equipmentId: string;
    recipe: string;
    operation: string;
    processStep: string;
  }): void;
  api?: RemoteCvdApi;
}
