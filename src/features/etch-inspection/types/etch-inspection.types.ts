export interface EtchInspectionInfo {
  OLDPROCESSOPERATIONNAME: string;
  OLDOPERATIONDESCRIPTION: string;
  OLDMACHINENAME: string;
  NOWPROCESSOPERATIONNAME: string;
  NOWOPERATIONDESCRIPTION: string;
  INSPDATE: string;
  PRODUCTSPECNAME: string;
}

export interface EtchInspectionSearchResponse {
  success: boolean;
  data: EtchInspectionInfo | null;
  errorMessage: string;
}

export interface EtchInspectionExecutionRequest {
  facility: string;
  lotId: string;
  product: string;
  oldOperation: string;
  oldOperationDesc: string;
  oldMachine: string;
  operatorId: string;
  comment: string;
}

export interface EtchInspectionExecutionResponse {
  success: boolean;
  errorMessage: string;
}
