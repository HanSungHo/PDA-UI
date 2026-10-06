export interface BatchsubRequest {
  facility: string;
  psbatchid: string;
}

export interface BatchsubContext extends BatchsubRequest {
  serchType: 'C';
}

export interface BatchsubItem {
  no: string;
  batchId: string;
  Jalotname: string;
}

export interface BatchsubResponse {
  context: BatchsubContext;
  items: BatchsubItem[];
}

export interface BatchsubColumn {
  key: keyof BatchsubItem;
  label: string;
}

export interface BatchsubResult {
  JALOTNAME: string;
}
