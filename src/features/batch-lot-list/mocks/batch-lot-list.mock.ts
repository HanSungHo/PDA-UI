import type { BatchLotListContext, BatchLotListItem } from '../types/batch-lot-list.types';

export const defaultBatchLotListContext: BatchLotListContext = {
  batId: 'BAT-A260915-001',
  facility: 'KFAB',
};

/** Raw `BATCHITEMS` rows keyed by batch id; `NO` is assigned by the service like the legacy grid. */
export const mockBatchLotsByBatId: Record<string, Omit<BatchLotListItem, 'no'>[]> = {
  'BAT-A260915-001': [
    { lotId: 'LOT-A260915-018', isDcol: 'Y' },
    { lotId: 'LOT-A260915-019', isDcol: 'N' },
    { lotId: 'LOT-A260915-020', isDcol: 'Y' },
    { lotId: 'LOT-A260915-021', isDcol: 'N' },
    { lotId: 'LOT-A260915-022', isDcol: 'N' },
  ],
  'BAT-A260915-002': [
    { lotId: 'LOT-A260915-031', isDcol: 'Y' },
    { lotId: 'LOT-A260915-032', isDcol: 'Y' },
  ],
  'BAT-A260916-001': [
    { lotId: 'LOT-A260916-004', isDcol: 'N' },
    { lotId: 'LOT-A260916-005', isDcol: 'N' },
    { lotId: 'LOT-A260916-006', isDcol: 'Y' },
  ],
};

export const mockBatchNotFoundMessage = '해당 Batch를 찾을 수 없습니다.';
