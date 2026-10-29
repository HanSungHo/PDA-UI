export interface WafercodecheckMessageResponse {
  isSuccessFul: boolean;
  messageBody: Record<string, unknown>;
  errorMessage: string;
}

export interface WafercodecheckService {
  getWaferTYpe(lotName: string): Promise<WafercodecheckMessageResponse>;
  ComPareWaferType(
    lotName: string,
    waferType: string,
    initialBoxName: string,
    comment: string,
    userId: string,
  ): Promise<WafercodecheckMessageResponse>;
}

export interface WafercodecheckSpinnerItem {
  label: string;
  value: string;
}
