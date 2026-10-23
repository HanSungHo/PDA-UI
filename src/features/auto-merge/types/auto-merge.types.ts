export interface CandidateLot {
  LOTNAME: string;
  MAINLOTNAME: string;
  PRODUCTSPECNAME: string;
  PROCESSFLOWNAME: string;
  PROCESSOPERATIONNAME: string;
  DESCRIPTION: string;
}

export interface MergeLot {
  LOTNAME: string;
  PRODUCTQUANTITY: string;
  PRODUCTSPECNAME: string;
  PROCESSFLOWNAME: string;
  PROCESSOPERATIONNAME: string;
  OPERATIONDESCRIPTION: string;
  LOTSTATE: string;
}

export interface ParentLot {
  PARENTLOTNAME: string;
  PARENTQTY: string;
  PARENTPRODUCTSPECNAME: string;
  PARENTPROCESSFLOWNAME: string;
  PARENTOPERATION: string;
  PARENTDESCRIPTION: string;
}

export interface LotInfo extends ParentLot {
  ITEMS: MergeLot[];
}

export interface ExecuteRequest {
  FACTORYNAME: string;
  LOTNAME: string;
  PARENTLOTNAME: string;
  PRODUCTSPECNAME: string;
  ROUTE: string;
  PROCESSOPERATIONNAME: string;
  QTY: string;
  OPERATORID: string;
  COMMENT: string;
  MERGELOT: string;
}

export interface MergeResult {
  FAILLOTNAME: string;
  SUCCESS: string;
}
