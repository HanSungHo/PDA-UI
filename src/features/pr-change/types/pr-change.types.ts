export type PrChangeRadioType = 'LEAK_Y' | 'LEAK_N';

export interface PrChangeServiceResult {
  isSuccessFul: boolean;
  messageBody: Record<string, string>;
  errorMessage: string;
}

export interface PrInfoMap {
  PRID: string;
  VISCOSITY: string;
  PRLOTNO: string;
  VALIDATE: string;
}

export interface PumpStatusRequest {
  pumpId: string;
}

export interface CurrentPrInfoRequest {
  eqpId: string;
  pumpName: string;
  prId: string;
  prLot: string;
  viscosity: string;
}

export interface PrInfoRequest extends CurrentPrInfoRequest {
  validate: string;
}

export interface ComparePrInfoRequest extends CurrentPrInfoRequest {
  time: string;
  banJangId: string;
}

export interface PrChangeRequest {
  eqpId: string;
  pumpName: string;
  prId: string;
  prDesc: string;
  prComp: string;
  viscosity: string;
  prLot: string;
  validateTime: string;
  userId: string;
  userName: string;
  leak: string;
  inDate: string;
}

export interface PrChangeDialog {
  title: string;
  message: string;
}
