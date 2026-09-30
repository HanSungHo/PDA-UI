export interface DiffEqpDataInfo {
  lotProcessState: string;
  batchId: string;
  machineName: string;
  processOperationName: string;
  reUpdate: string;
}

export interface DiffParameterItem {
  no: string;
  para: string;
  min: string;
  max: string;
  data: string | number;
}

export interface DiffEqpDataInfoResult {
  ok: boolean;
  data?: DiffEqpDataInfo;
  message?: string;
}

export interface DiffParameterListRequest {
  machineName: string;
  facility: string;
}

export interface DiffParameterListResult {
  ok: boolean;
  getDate?: string;
  items?: DiffParameterItem[];
  message?: string;
}

export interface InsertParameterRequest {
  userId: string;
  batchId: string;
  machineName: string;
  facility: string;
  eqpPara: string;
  eqpParaNo: string;
  eqpParaMax: string;
}

export interface InsertParameterResult {
  ok: boolean;
  machineState?: string;
  message?: string;
}
