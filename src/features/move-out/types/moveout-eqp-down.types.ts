export interface RawChamberInput {
  CH: string;
  MESSTATE: string;
}

export interface ChamberItem {
  name: string;
  mesState: string;
  enabled: boolean;
  checked: boolean;
}

export interface ChangeEqpStatusParams {
  machine: string;
  facility?: string;
  status?: string;
  reasonCode?: string;
  comment?: string;
  operatorId?: string;
  operatorName?: string;
  chamberList: string[];
  mainFlag: 'Y' | 'N';
}

export interface ChangeEqpStatusResult {
  success: boolean;
  message?: string;
  errorDesc?: string;
}

export interface MoveOutEqpDownAlertState {
  open: boolean;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
}

export interface MoveOutEqpDownResolveResult {
  action: 'OK' | 'CANCEL';
  success: boolean;
  changed: boolean;
  mainDown: boolean;
  downChambers: string[];
}

export interface MoveOutEqpDownDialogProps {
  modelValue: boolean;
  machine: string;
  chamberList?: RawChamberInput[];
  facility?: string;
  operatorId?: string;
  operatorName?: string;
}

export interface MoveOutEqpDownDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'resolve', result: MoveOutEqpDownResolveResult): void;
  (e: 'completed', result: { action: 'OK' | 'CANCEL'; success: boolean }): void;
}
