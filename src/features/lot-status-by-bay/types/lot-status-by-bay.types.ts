/** legacy: viewBinding.radioOneOut / radioTwoOut, sent as the STOCKOUT PORT. */
export type LotStatusByBayPort = 'OUT' | '2OUT';

export interface LotStatusByBayServiceResult<TBody = Record<string, unknown>> {
  isSuccessFul: boolean;
  messageBody: TBody;
  errorMessage: string;
}

/** One BLSTITEMS.ITEM row; keys are the legacy columnData keys read by gridService.getCellValue. */
export interface LotStatusByBayRow {
  JOBCODE: string;
  PROCESSSTEP: string;
  LOTID: string;
  LOCATION: string;
  QUANTITY: string;
  LOC_TYPE: string;
}

export interface AreaBayInfoRequest {
  area: string;
  facility: string;
}

export interface BayStockerInfoRequest {
  bay: string;
  facility: string;
}

export interface BlstInfoRequest {
  bay: string;
  stk: string;
  job: string;
  facility: string;
}

export interface StockOutItem {
  lotId: string;
  stockerId: string;
}

export interface StockOutRequest {
  facility: string;
  port: LotStatusByBayPort;
  items: readonly StockOutItem[];
}

export interface LotStatusByBayDialog {
  title: string;
  message: string;
}
