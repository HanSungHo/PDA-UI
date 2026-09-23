export interface BackupBayRowItem {
  id: number;
  lotId: string;
  selectedFloor: string;
  selectedBay: string;
  bayOptions: string[];
  jobCode: string;
  quantity: string;
  processName: string;
  isValid: boolean;
}

export type LotProcessStateType = 'RUN' | 'WAIT' | 'COMPLETE';
export type LotHoldStateType = 'OnHold' | 'NotOnHold';
export type LotStateType = 'Released' | 'Created';

export interface LotInfoResult {
  lotId: string;
  lotProcessState: string;
  lotHoldState: string;
  lotState: string;
  jobCode: string;
  productQuantity: string;
  operationDescription: string;
}

export interface InFactoryRecord {
  lotId: string;
  bay: string;
  operatorId: string;
}

export interface InFactoryResult {
  success: boolean;
  successCount: number;
  message?: string;
}

export interface BarcodeParseResult {
  isValid: boolean;
  lotId: string;
  error?: string;
}

export interface AlertState {
  open: boolean;
  title: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface BackupBayDialogProps {
  modelValue: boolean;
}

export interface BackupBayDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'completed', successCount: number): void;
}
