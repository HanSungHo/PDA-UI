import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());
vi.mock('src/services/api-client', () => ({ default: { post } }));

import {
  fetchLotStatus,
  fetchSlotParticle,
} from 'src/features/lot-status/services/lot-status.service';

describe('Lot Status messages', () => {
  beforeEach(() => post.mockReset());

  it('sends the legacy NORMAL LOTINFO payload and returns its body', async () => {
    post.mockResolvedValue({
      data: { result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { JOBCODE: 'JOB-A' } }) },
    });
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).resolves.toEqual({ JOBCODE: 'JOB-A' });
    expect(post).toHaveBeenCalledWith('/hifos/LOTINFO', {
      TYPE: 'NORMAL',
      LOTID: 'LOT-A',
      FACILITY: 'FAB-A',
    });
  });

  it('sends the stored operation for SPC OUT HOLD particle details', async () => {
    post.mockResolvedValue({
      data: {
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { ITEMS: { ITEM: [{ SLOT: '01' }] } } }),
      },
    });
    await expect(fetchSlotParticle('FAB-A', 'LOT-A', '100-00')).resolves.toEqual([{ SLOT: '01' }]);
    expect(post).toHaveBeenCalledWith('/hifos/SLOTPARTICLE', {
      FACILITY: 'FAB-A',
      LOTID: 'LOT-A',
      OPERATION: '100-00',
    });
  });

  it.each([
    ['legacy ITEM array', { ITEMS: { ITEM: [{ SLOT: '01' }] } }, [{ SLOT: '01' }]],
    ['legacy ITEM object', { ITEMS: { ITEM: { SLOT: '02' } } }, [{ SLOT: '02' }]],
    ['legacy null ITEM', { ITEMS: { ITEM: null } }, []],
    ['direct array', { ITEMS: [{ SLOT: '03' }] }, [{ SLOT: '03' }]],
    ['empty list', { ITEMS: [] }, []],
    ['unexpected list object', { ITEMS: {} }, []],
    ['missing list', {}, []],
  ])('normalizes %s particle responses', async (_label, messageBody, expected) => {
    post.mockResolvedValue({
      data: { result: JSON.stringify({ STATUS: 'PASS', MSGBODY: messageBody }) },
    });
    await expect(fetchSlotParticle('FAB-A', 'LOT-A', '100-00')).resolves.toEqual(expected);
  });

  it('uses the server error message on failure', async () => {
    post.mockResolvedValue({
      data: { result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'LOT unavailable' }) },
    });
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).rejects.toThrow('LOT unavailable');
  });

  it('uses a fallback message when the server omits ERRMSG', async () => {
    post.mockResolvedValue({ data: { result: JSON.stringify({ STATUS: 'FAIL' }) } });
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).rejects.toThrow('LOTINFO failed.');
  });

  it('returns an empty body when a PASS response omits MSGBODY', async () => {
    post.mockResolvedValue({ data: { result: JSON.stringify({ STATUS: 'PASS' }) } });
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).resolves.toEqual({});
  });

  it('rejects malformed response JSON and network errors', async () => {
    post.mockResolvedValueOnce({ data: { result: '{' } });
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).rejects.toThrow();

    post.mockRejectedValueOnce(new Error('Network error'));
    await expect(fetchLotStatus('LOT-A', 'FAB-A')).rejects.toThrow('Network error');
  });
});
