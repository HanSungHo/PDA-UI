export type RadioType = 'START' | 'EXPOSURE';

export interface MachineSelectParams {
  identCodeList: string;
  isExposure: string;
  eqpGroup: string;
  expEqpGroup: string;
  operation: string;
  subOperation: string;
  product: string;
  lotId: string;
  facility: string;
}

export interface MachineSelectRealEqpRequest {
  facility: string;
  eqpId: string;
}

export interface MachineSelectRealEqpResult {
  ok: boolean;
  eqpId?: string;
  message?: string;
}

export interface MachineSelectRecipeInfoRequest {
  lotId: string;
  operation: string;
  subOperation: string;
  product: string;
  eqpId: string;
  facility: string;
}

export interface MachineSelectRecipeInfoResult {
  ok: boolean;
  recipe?: string;
  message?: string;
}

export interface MachineSelectResult {
  EQPGROUP: string;
  EQPID: string;
  RECIPE: string;
}
