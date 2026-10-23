export interface RecipeInterlockData {
  machine: string;
  lotid: string;
  rRecipe: string;
  pRecipe: string;
  time: string;
}

export interface RecipeInterlockDialogProps {
  open: boolean;
  receiverMessage: string;
}

export interface RecipeInterlockDialogEmits {
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}

export interface IntlkPopupCheckParams {
  masterTime: string;
  deviceName: string;
  users: string;
  currentTime: string;
  eqpId: string;
  recipe: string;
  lotId?: string;
  slot?: string;
}

export interface IntlkPopupCheckResponse {
  isSuccess: boolean;
  message?: string;
}
