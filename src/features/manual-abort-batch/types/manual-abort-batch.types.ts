/** One FURNACEREMANUALLOT ITEMS row, shown as the 구분 / ZONE / LOT grid. */
export interface ManualAbortBatchRow {
  BATCHINFO: string;
  ZONE: string;
  LOT: string;
}

export interface ManualAbortBatchSaveRequest {
  lotId: string;
  eqpId: string;
  rcpId: string;
  userId: string;
}

export interface ManualAbortBatchDialog {
  title: string;
  message: string;
}

/** Fields ManualAbortBatchActivity focuses after a scan or a validation error. */
export type ManualAbortBatchField = 'lot' | 'eqp' | 'recipe';
