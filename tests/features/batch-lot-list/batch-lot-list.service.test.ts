import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBatchLotList } from '../../../src/features/batch-lot-list/services/batch-lot-list.service';
import { ApiError } from '../../../src/services/api-error';

describe('fetchBatchLotList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the batch context and numbers each lot like the legacy grid', async () => {
    const request = fetchBatchLotList({ batId: 'BAT-A260915-002', facility: 'KFAB' });
    await vi.runAllTimersAsync();

    await expect(request).resolves.toEqual({
      context: { batId: 'BAT-A260915-002', facility: 'KFAB' },
      items: [
        { no: '1', lotId: 'LOT-A260915-031', isDcol: 'Y' },
        { no: '2', lotId: 'LOT-A260915-032', isDcol: 'Y' },
      ],
    });
  });

  it('rejects with an ApiError when the batch is unknown', async () => {
    const request = fetchBatchLotList({ batId: 'UNKNOWN', facility: 'KFAB' });
    const settled = request.catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    const error = await settled;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'BATCH_NOT_FOUND',
      message: '해당 Batch를 찾을 수 없습니다.',
      status: 404,
    });
  });
});
