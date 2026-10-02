import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBatchLotList } from '../../../src/features/batch-lot-list/services/batch-lot-list.service';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

describe('fetchBatchLotList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts BATCHLIST and maps BATCHITEMS with row numbers like the legacy grid', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            BATCHITEMS: [
              { LOTID: 'LOT-A260915-031', ISDCOL: 'Y' },
              { NO: '7', LOTID: 'LOT-A260915-032', ISDCOL: 'N' },
            ],
          },
        }),
      },
    });

    await expect(
      fetchBatchLotList({ batId: 'BAT-A260915-002', facility: 'KFAB' }),
    ).resolves.toEqual({
      context: { batId: 'BAT-A260915-002', facility: 'KFAB' },
      items: [
        { no: '1', lotId: 'LOT-A260915-031', isDcol: 'Y' },
        { no: '2', lotId: 'LOT-A260915-032', isDcol: 'N' },
      ],
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHLIST', {
      BATCHID: 'BAT-A260915-002',
      FACILITY: 'KFAB',
    });
  });

  it('accepts ITEMS fallback while keeping the legacy request contract', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: [{ LOTID: 'LOT-MOCK-001', ISDCOL: '' }],
          },
        }),
      },
    });

    await expect(fetchBatchLotList({ batId: 'BATCH-DEMO-01', facility: 'KFAB' })).resolves.toEqual({
      context: { batId: 'BATCH-DEMO-01', facility: 'KFAB' },
      items: [{ no: '1', lotId: 'LOT-MOCK-001', isDcol: '' }],
    });
  });

  it('rejects with an ApiError when BATCHLIST fails', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'FAIL',
          ERRMSG: '해당 Batch를 찾을 수 없습니다.',
        }),
      },
    });

    await expect(fetchBatchLotList({ batId: 'UNKNOWN', facility: 'KFAB' })).rejects.toMatchObject({
      code: 'BATCHLIST_FAILED',
      message: '해당 Batch를 찾을 수 없습니다.',
    });
  });

  it('returns an empty grid when BATCHLIST succeeds without lot rows', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {},
        }),
      },
    });

    await expect(fetchBatchLotList({ batId: 'EMPTY', facility: 'KFAB' })).resolves.toEqual({
      context: { batId: 'EMPTY', facility: 'KFAB' },
      items: [],
    });
  });
});
