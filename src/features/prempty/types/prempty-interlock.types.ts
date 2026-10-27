export interface PremptyDialogProps {
  open: boolean;
  receiverMessage: string;
}

export interface PremptyDialogEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}

export interface IntlkPopupCheckParams {
  masterTime: string;
  deviceName: string;
  users: string;
  currentTime: string;
  eqpId: string;
}

export interface IntlkPopupCheckResponse {
  isSuccess: boolean;
  message?: string;
}
