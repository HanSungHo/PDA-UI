/** `ISDCOL` flag from the legacy BATCHLIST response, shown in the "D" column. */
export type BatchLotDcolFlag = 'Y' | 'N' | '';

export interface BatchLotListContext {
  batId: string;
  facility: string;
}

export interface BatchLotListItem {
  no: string;
  lotId: string;
  isDcol: BatchLotDcolFlag;
}

export interface BatchLotListRequest {
  batId: string;
  facility: string;
}

export interface BatchLotListResponse {
  context: BatchLotListContext;
  items: BatchLotListItem[];
}

export interface BatchLotListColumn {
  key: keyof BatchLotListItem;
  label: string;
}

export interface BatchLotListPageProps {
  /** Initial batch id (legacy `BATID` intent extra). Falls back to the `batId` route query. */
  batId?: string | undefined;
}

export interface BatchLotListPageEmits {
  /** Fired with the chosen LOT NO (legacy `LOTID` activity result). */
  confirm: [lotId: string];
  cancel: [];
}
