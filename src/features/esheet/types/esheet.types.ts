export type ESheetLotStatus = '' | 'RUN' | 'WAIT' | '예약' | 'HOLD' | (string & {});

export interface ESheetDrawMenuRow {
  ISCURRENT?: string | null;
  OPERATION?: string | null;
  SUBOPERATION?: string | null;
  PROCESSSTEP?: string | null;
  OPERSEQUENCE?: string | number | null;
  COMMENTCNT?: string | number | null;
  ENDTIME?: string | null;
  LOT_STATUS?: ESheetLotStatus | null;
}

export interface ESheetOperationContext {
  lotId: string;
  factoryName: string;
  productName: string;
  routeName: string;
  area: string;
}
