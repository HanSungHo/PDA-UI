export interface GasMessageResponse {
  isSuccessFul: boolean;
  messageBody: Record<string, unknown>;
  errorMessage: string;
}

/** Cabinet lookup fields; `USAGES` is parsed by legacy but never displayed or used. */
export interface GasCabinetItem {
  CABINET?: string;
  GAS?: string;
  TYPE?: string;
}
