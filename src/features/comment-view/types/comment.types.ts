export interface CommentRequest {
  LOTID: string;
  FACILITY: string;
  OPERATION: string;
  SUBOPERATION: string;
  COMMENTNO: string;
  OPERSEQUENCE: string;
  OPERATORID: string;
}

export interface CommentResponse {
  DESCRIPTION: string;
  PROCESSSTEP: string;
  PW: string;
  ISCURRENT: string; // 'Y' or other
  WORKCODE: string;
  ISCHECK: string; // 'Y' or 'N'
}

export interface CommentSetRequest {
  LOTID: string;
  FACILITY: string;
  OPERATION: string;
  SUBOPERATION: string;
  COMMENTNO: string;
  OPERATORID: string;
  OPERNAME: string;
  OPERSEQUENCE: string;
  PASSWORD: string;
}

export interface OperatorContext {
  operatorId: string;
  operatorName: string;
  permission?: string; // legacy values 'C','H','B', etc.
  facility: string;
}
