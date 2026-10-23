export interface SideDmmSelectEqpResponse {
  LOTNAME?: string;
  PROCESSOPERATIONNAME?: string;
  PODESC?: string;
  IN_TIME?: string;
  IN_USER?: string;
}

export interface SideDmmSelectLotResponse {
  PROCESSOPERATIONNAME?: string;
  PODESC?: string;
}

export interface SideDmmInsertPayload {
  eventName: 'IN' | 'OUT';
  eqpId: string;
  lotId: string;
  operId: string;
  operDesc: string;
  inUser: string;
}

export interface SideDmmInsertResponse {
  RET?: string;
}

export interface SideDmmApiResult<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export interface SideDummyAlertDialog {
  open: boolean;
  title: string;
  message: string;
}
