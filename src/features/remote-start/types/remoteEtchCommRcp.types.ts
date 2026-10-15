export interface RemoteEtchInboundParams {
  LOTID?: string;
  RECIPE?: string;
  EQPID?: string;
  OPERID?: string;
  OPERDESC?: string;
}

export type ProcessType = 'eMAX CT' | 'DPS POLY' | 'TE8500';

export type DownloadStatus = 'OK' | 'D_FAIL' | 'V_FAIL';

export interface CommRcpRawItem {
  CHAMBER?: string;
  ETCVALUE?: string;
  BASE_VALUE?: string;
  TUNE_VALUE?: string;
  STEP?: string;
  RMS_PARANAME?: string;
  COL?: string;
  VALUE?: string;
  RESULT?: string;
  [key: string]: unknown;
}

export interface GridRowItem {
  id: string | number;
  CHAMBER: string;
  ETCVALUE: string;
  BASE_VALUE: string;
  TUNE_VALUE: string;
  STEP: string;
  RMS_PARANAME: string;
  COL: string;
  VALUE: string;
  RESULT: string;
  resultBgColor?: string;
  resultTextColor?: string;
}

export interface EtchCommRcpResponseBody {
  DOWNLOAD?: string;
  PROCESS_TYPE?: string;
  SAMPLE_CHK?: string;
  OWNERCODE?: string;
  COMMRCP?: CommRcpRawItem[];
  PARA2ND?: string;
  VALUE2ND?: string;
  COMM2ND?: string;
  STI_PROC_RCP?: string;
  EQP_TYPE?: string;
}

export interface EtchCommRcpRequest {
  lotId: string;
  recipe: string;
  eqpId: string;
  operId: string;
  operDesc: string;
}

export interface EtchRcpDownloadRequest {
  lotId: string;
  recipe: string;
  eqpId: string;
  operatorId: string;
  chamber: string;
  rmsPara: string;
  downValue: string;
  step: string;
}

export interface ApiResponse<T> {
  isSuccessFul: boolean;
  result: T;
  errorMessage?: string;
}

export interface DialogState {
  open: boolean;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'confirm';
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
}
