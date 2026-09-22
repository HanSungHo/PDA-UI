import { ApiError } from 'src/services/api-error';

import { mockBatchLotsByBatId, mockBatchNotFoundMessage } from '../mocks/batch-lot-list.mock';
import type { BatchLotListRequest, BatchLotListResponse } from '../types/batch-lot-list.types';

/**
 * Legacy equivalent: `MessageFactoryUtil.batchList(batId, facility)` sent as
 * message `BATCHLIST` (`POST /hifos/BATCHLIST`), returning `BATCHITEMS`.
 * Backed by mock data until the real endpoint is available.
 */
export async function fetchBatchLotList(
  request: BatchLotListRequest,
): Promise<BatchLotListResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 220));

  const lots = mockBatchLotsByBatId[request.batId];

  if (!lots) {
    throw new ApiError(mockBatchNotFoundMessage, { code: 'BATCH_NOT_FOUND', status: 404 });
  }

  return {
    context: { batId: request.batId, facility: request.facility },
    items: lots.map((lot, index) => ({ ...lot, no: String(index + 1) })),
  };
}
