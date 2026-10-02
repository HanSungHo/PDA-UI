import {
  assertPass,
  body,
  firstList,
  postJsonMessage,
  text,
} from 'src/features/move-out/services/message.service';

import type {
  BatchLotDcolFlag,
  BatchLotListRequest,
  BatchLotListResponse,
} from '../types/batch-lot-list.types';

function dcolFlag(value: string): BatchLotDcolFlag {
  return value === 'Y' || value === 'N' ? value : '';
}

export async function fetchBatchLotList(
  request: BatchLotListRequest,
): Promise<BatchLotListResponse> {
  const parsed = await postJsonMessage('BATCHLIST', {
    BATCHID: request.batId,
    FACILITY: request.facility,
  });
  assertPass(parsed, 'BATCHLIST_FAILED');

  const responseBody = body(parsed);
  const lots = firstList(responseBody, ['BATCHITEMS', 'ITEMS']);
  return {
    context: { batId: request.batId, facility: request.facility },
    items: lots.map((lot, index) => ({
      no: String(index + 1),
      lotId: text(lot, 'LOTID'),
      isDcol: dcolFlag(text(lot, 'ISDCOL')),
    })),
  };
}
