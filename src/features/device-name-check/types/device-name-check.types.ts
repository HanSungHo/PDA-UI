export interface DeviceNameCheckState {
  pdaIp: string;
  currentPdaName: string;
  newPdaDigits: string;
  isLoading: boolean;
  isOpen: boolean;
  alertState: {
    isOpen: boolean;
    title: string;
    message: string;
  };
}

export type DeviceNameValidationError = 'EMPTY' | 'INVALID_LENGTH';

export interface DeviceNameValidationResult {
  isValid: boolean;
  error?: DeviceNameValidationError;
  message?: string;
}

export interface DeviceNameCheckModalProps {
  open: boolean;
  initialIp?: string;
  initialDeviceName?: string;
}

export interface DeviceNameCheckModalEmits {
  (event: 'update:open', value: boolean): void;
  (event: 'confirm', newDeviceName: string): void;
}
