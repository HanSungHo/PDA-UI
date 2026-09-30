export interface WaferSlotItem {
  slotNumber: string;
  waferName: string;
  isPresent: boolean;
  isSelected: boolean;
}

export interface ScopeLotMasterInfo {
  lotName: string;
  factoryName: string;
  processOperationName: string;
  machineName: string;
  layerId: string;
  isExist: boolean;
  faultCategories: string[];
}

export interface InputScopeDataPayload {
  factoryName: string;
  lotId: string;
  processOperationName: string;
  machineName: string;
  layerId: string;
  sideRinse: string;
  weeWidth: string;
  logo: string;
  slotList: string;
  faultCategory: string;
  inputUser: string;
}

export interface ScopeDataResult {
  lotId: string;
  logo: string;
  waferList: string;
}

export interface GetScopeLotInfoResult {
  success: boolean;
  data?: ScopeLotMasterInfo;
  errorMessage?: string;
}

export interface GetSlotInfoResult {
  success: boolean;
  waferList?: string;
  errorMessage?: string;
}

export interface InputScopeDataResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export interface InputScopeDataModalProps {
  modelValue?: boolean;
  initialLotId?: string;
  standalone?: boolean;
}

export interface InputScopeDataModalEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'complete', result: ScopeDataResult): void;
  (e: 'cancel'): void;
}
