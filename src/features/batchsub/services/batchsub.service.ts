import {
  assertPass,
  body,
  firstList,
  postJsonMessage,
  text,
} from 'src/services/json-message.service';

import type { BatchsubRequest, BatchsubResponse } from '../types/batchsub.types';

const CHILD_BATCH_SEARCH_TYPE = 'C' as const;

export async function fetchBatchsubList(request: BatchsubRequest): Promise<BatchsubResponse> {
  const parsed = await postJsonMessage('BATCHTYPE', {
    FACILITY: request.facility,
    BATCHID: request.psbatchid,
    BATCHTYPE: CHILD_BATCH_SEARCH_TYPE,
  });
  assertPass(parsed, 'BATCHTYPE_FAILED');

  const responseBody = body(parsed);
  const items = firstList(responseBody, ['ITEMS']);

  return {
    context: {
      facility: request.facility,
      psbatchid: request.psbatchid,
      serchType: CHILD_BATCH_SEARCH_TYPE,
    },
    items: items.map((item) => ({
      no: text(item, 'ROWNUM'),
      batchId: text(item, 'BATCHID'),
      Jalotname: text(item, 'LOT1'),
    })),
  };
}
