export interface DispatchingRow extends Record<string, string> {
  NUMBER: string;
  RESERVE: string;
  LOTNAME: string;
  OPREATIONNAME: string;
  OPREATIONDESC: string;
  PRODUCTSPECNAME: string;
  MAINTITEM: string;
  REWORKSTATUS: string;
}

export interface GetDispatchRequest {
  reserve: 'T' | 'F';
  machineName: string;
  wet: string;
}

export interface SetDispatchRequest {
  machineName: string;
  operatorId: string;
  operatorName: string;
  reserve: 'Y' | 'N';
  items: DispatchingRow[];
}

export interface DispatchingResult {
  rows: DispatchingRow[];
  hiddenColumns: string[];
}
