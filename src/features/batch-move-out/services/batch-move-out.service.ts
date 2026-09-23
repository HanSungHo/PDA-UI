import { mockBatchMoveOutResponse } from '../mocks/batch-move-out.mock';
import type {
  BatchMoveOutBatchCountRequest,
  BatchMoveOutBatchCountResult,
  BatchMoveOutFqcRequest,
  BatchMoveOutFqcResult,
  BatchMoveOutListRequest,
  BatchMoveOutListResult,
  BatchMoveOutRequest,
  BatchMoveOutResult,
} from '../types/batch-move-out.types';

export async function fetchBatchMoveOutList(
  _request: BatchMoveOutListRequest,
): Promise<BatchMoveOutListResult> {
  await Promise.resolve();

  return { ok: true, data: structuredClone(mockBatchMoveOutResponse) };
}

export async function executeBatchMoveOut(
  request: BatchMoveOutRequest,
): Promise<BatchMoveOutResult> {
  await Promise.resolve();

  if (request.lotId.includes('FAIL')) {
    return { ok: false, message: `${request.lotId} MOVE OUT failed.` };
  }

  return { ok: true };
}

export async function fetchBatchMoveOutFqcSampling(
  _request: BatchMoveOutFqcRequest,
): Promise<BatchMoveOutFqcResult> {
  await Promise.resolve();

  return { ok: true };
}

export async function checkBatchMoveOutBatchCount(
  _request: BatchMoveOutBatchCountRequest,
): Promise<BatchMoveOutBatchCountResult> {
  await Promise.resolve();

  return { ok: true, batchDown: false };
}
