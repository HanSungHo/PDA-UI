import type {
  BatchMoveOutBatchCountResult,
  BatchMoveOutFqcResult,
  BatchMoveOutListRequest,
  BatchMoveOutListResult,
  BatchMoveOutResult,
} from '../types/batch-move-out.types';
import { mockBatchMoveOutResponse } from './batch-move-out.mock';

export const previewBatchMoveOutId = mockBatchMoveOutResponse.context.batchId;

export function fetchPreviewBatchMoveOutList(
  request: BatchMoveOutListRequest,
): BatchMoveOutListResult {
  const batchId = request.batchId.trim().toUpperCase();
  if (batchId && batchId !== previewBatchMoveOutId) {
    return { ok: false, message: `Demo batch [${request.batchId}] was not found.` };
  }

  return { ok: true, data: structuredClone(mockBatchMoveOutResponse) };
}

export function executePreviewBatchMoveOut(): BatchMoveOutResult {
  return { ok: true };
}

export function fetchPreviewBatchMoveOutFqcSampling(): BatchMoveOutFqcResult {
  return { ok: true };
}

export function checkPreviewBatchMoveOutBatchCount(): BatchMoveOutBatchCountResult {
  return { ok: true, batchDown: false };
}
