import {
  getRemoteFurnaceKjApi,
  resetRemoteFurnaceKjApi,
} from 'src/features/remote-furnace-kj/services/remote-furnace-kj.service';
import { sendMessage } from 'src/services/message.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/message.service', () => ({
  sendMessage: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  resetRemoteFurnaceKjApi();
});

describe('FURNACE_KJCHECK gateway adapter', () => {
  it.each([
    ['0', 'KJ'],
    ['KEC', 'KEC'],
    ['1', 'OTHER'],
  ] as const)('maps CNT %s to the %s destination', async (count, furnace) => {
    vi.mocked(sendMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { CNT: count } }),
    });

    await expect(getRemoteFurnaceKjApi().checkFurnaceKj({ LOTID: 'WP00001' })).resolves.toEqual({
      ok: true,
      data: { CNT: count, FURNACE: furnace },
    });
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith('FURNACE_KJCHECK', { LOTID: 'WP00001' });
  });

  it('returns the legacy error message for a failed message response', async () => {
    vi.mocked(sendMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'LOT was not found' }),
    });

    await expect(getRemoteFurnaceKjApi().checkFurnaceKj({ LOTID: 'UNKNOWN' })).resolves.toEqual({
      ok: false,
      message: 'LOT was not found',
    });
  });
});
