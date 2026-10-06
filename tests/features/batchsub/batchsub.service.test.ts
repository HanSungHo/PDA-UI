import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBatchsubList } from '../../../src/features/batchsub/services/batchsub.service';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

describe('fetchBatchsubList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts BATCHTYPE with fixed child search type C and maps ITEMS rows', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: [
              { ROWNUM: '1', BATCHID: 'BAT2026092201', LOT1: 'LOT2026092201 01' },
              { ROWNUM: 2, BATCHID: 'BAT2026092201', LOT1: 'LOT2026092201 02' },
            ],
          },
        }),
      },
    });

    await expect(
      fetchBatchsubList({ facility: 'KFAB', psbatchid: 'BAT2026092201' }),
    ).resolves.toEqual({
      context: { facility: 'KFAB', psbatchid: 'BAT2026092201', serchType: 'C' },
      items: [
        { no: '1', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 01' },
        { no: '2', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 02' },
      ],
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHTYPE', {
      FACILITY: 'KFAB',
      BATCHID: 'BAT2026092201',
      BATCHTYPE: 'C',
    });
  });

  it('returns deterministic empty items when ITEMS is absent', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {},
        }),
      },
    });

    await expect(fetchBatchsubList({ facility: 'KFAB', psbatchid: 'EMPTY' })).resolves.toEqual({
      context: { facility: 'KFAB', psbatchid: 'EMPTY', serchType: 'C' },
      items: [],
    });
  });

  it('rejects with an ApiError when BATCHTYPE fails', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'FAIL',
          ERRMSG: 'failed',
        }),
      },
    });

    await expect(
      fetchBatchsubList({ facility: 'KFAB', psbatchid: 'UNKNOWN' }),
    ).rejects.toMatchObject({
      code: 'BATCHTYPE_FAILED',
      message: 'failed',
    });
  });
});
