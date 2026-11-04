export interface DropdownOption {
  label: string;
  value: string;
}

export interface BayItem {
  BAY: string;
  CONTEXT01?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  isSuccessFul: boolean;
  result?: T;
  errorMessage?: string;
}

export interface RemoteXrfRecipeResult {
  ITEM: string;
  PRODEQP: string;
  CATEGORY: string;
  SAMPLE: string;
  PARA: string;
  RECIPE: string;
  SLOT: string;
  THICK: string;
}

export interface DialogState {
  open: boolean;
  title: string;
  message: string;
  buttonText: string;
}
