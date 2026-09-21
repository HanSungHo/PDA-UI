import { mockBatchMoveInResponse } from '../mocks/batch-move-in.mock';
import type {
  BatchMoveInListResponse,
  BatchMoveInRequest,
  BatchMoveInResult,
} from '../types/batch-move-in.types';

export async function fetchBatchMoveInList(): Promise<BatchMoveInListResponse> {
  await Promise.resolve();

  return structuredClone(mockBatchMoveInResponse);
}

export async function executeBatchMoveIn(request: BatchMoveInRequest): Promise<BatchMoveInResult> {
  await Promise.resolve();

  if (request.lotId.includes('FAIL')) {
    return { ok: false, message: `${request.lotId} MOVE IN failed.` };
  }

  return { ok: true };
}
