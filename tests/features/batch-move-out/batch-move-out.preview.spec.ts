import {
  checkPreviewBatchMoveOutBatchCount,
  executePreviewBatchMoveOut,
  fetchPreviewBatchMoveOutFqcSampling,
  fetchPreviewBatchMoveOutList,
  previewBatchMoveOutId,
} from 'src/features/batch-move-out/mocks/batch-move-out.preview';
import { describe, expect, it } from 'vitest';

const baseRequest = { lotId: '', batchId: '', eqpId: '', facility: '', state: 'MVOU' };

describe('batch move out preview mocks', () => {
  it('returns a cloned demo batch for an empty or matching batch id', () => {
    const empty = fetchPreviewBatchMoveOutList(baseRequest);
    const matching = fetchPreviewBatchMoveOutList({
      ...baseRequest,
      batchId: ` ${previewBatchMoveOutId.toLowerCase()} `,
    });

    expect(empty.ok).toBe(true);
    expect(matching.ok).toBe(true);
    expect(empty.data).not.toBe(matching.data);
    expect(empty.data?.context.batchId).toBe(previewBatchMoveOutId);
  });

  it('rejects an unknown demo batch id', () => {
    expect(fetchPreviewBatchMoveOutList({ ...baseRequest, batchId: 'UNKNOWN' })).toEqual({
      ok: false,
      message: 'Demo batch [UNKNOWN] was not found.',
    });
  });

  it('succeeds for the demo move out, FQC sampling and batch count', () => {
    expect(executePreviewBatchMoveOut()).toEqual({ ok: true });
    expect(fetchPreviewBatchMoveOutFqcSampling()).toEqual({ ok: true });
    expect(checkPreviewBatchMoveOutBatchCount()).toEqual({ ok: true, batchDown: false });
  });
});
