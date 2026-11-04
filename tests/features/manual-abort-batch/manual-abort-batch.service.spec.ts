import {
  fetchRemanualLot,
  ManualAbortBatchMessageError,
  saveRemanual,
} from 'src/features/manual-abort-batch/services/manual-abort-batch.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPostAifMessage } = vi.hoisted(() => ({ mockPostAifMessage: vi.fn() }));

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: mockPostAifMessage }));

function reply(result: Record<string, unknown>) {
  return { statusCode: 200, result: JSON.stringify(result) };
}

const pass = (body: unknown) => reply({ STATUS: 'PASS', MSGBODY: body });

describe('manual abort batch service', () => {
  beforeEach(() => {
    mockPostAifMessage.mockReset();
  });

  it('posts FURNACEREMANUALLOT with the LOT and reads ITEMS.ITEM', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      pass({ ITEMS: { ITEM: [{ BATCHINFO: '자', ZONE: 3, LOT: 'LOT-2', EXTRA: 'x' }] } }),
    );

    await expect(fetchRemanualLot('LOT-1')).resolves.toEqual([
      { BATCHINFO: '자', ZONE: '3', LOT: 'LOT-2' },
    ]);
    expect(mockPostAifMessage).toHaveBeenCalledWith('furnaceremanuallot', 'FURNACEREMANUALLOT', [
      ['LOTID', 'LOT-1'],
    ]);
  });

  it('accepts a single ITEM object and treats a missing ITEMS list as empty', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(pass({ ITEMS: { ITEM: { BATCHINFO: '모', ZONE: 'TOP' } } }))
      .mockResolvedValueOnce(pass({ ITEMS: '' }))
      .mockResolvedValueOnce(pass({ OTHER: 'x' }));

    await expect(fetchRemanualLot('LOT-1')).resolves.toEqual([
      { BATCHINFO: '모', ZONE: 'TOP', LOT: '' },
    ]);
    await expect(fetchRemanualLot('LOT-1')).resolves.toEqual([]);
    await expect(fetchRemanualLot('LOT-1')).resolves.toEqual([]);
  });

  it('throws ERRMSG on failure and the Android message for a PASS without MSGBODY', async () => {
    mockPostAifMessage
      .mockResolvedValueOnce(reply({ STATUS: 'FAIL', ERRMSG: 'LOT 없음', MSGBODY: '' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS', MSGBODY: '' }))
      .mockResolvedValueOnce(reply({ STATUS: 'PASS' }));

    await expect(fetchRemanualLot('LOT-1')).rejects.toEqual(
      new ManualAbortBatchMessageError('LOT 없음'),
    );
    await expect(fetchRemanualLot('LOT-1')).rejects.toThrow('BODY가 존재하지 않습니다');
    await expect(fetchRemanualLot('LOT-1')).rejects.toThrow('BODY가 존재하지 않습니다');
  });

  it('posts FURNACEREMANUALSAVE with LOTID, EQPID, RCPID and USERID', async () => {
    mockPostAifMessage.mockResolvedValueOnce(pass({}));

    await expect(
      saveRemanual({ lotId: 'LOT-1', eqpId: 'FURNACE-01', rcpId: 'RCP-1', userId: 'OP1' }),
    ).resolves.toBeUndefined();
    expect(mockPostAifMessage).toHaveBeenCalledWith('furnaceremanualsave', 'FURNACEREMANUALSAVE', [
      ['LOTID', 'LOT-1'],
      ['EQPID', 'FURNACE-01'],
      ['RCPID', 'RCP-1'],
      ['USERID', 'OP1'],
    ]);
  });

  it('rejects a failed save with ERRMSG as is', async () => {
    mockPostAifMessage.mockResolvedValueOnce(
      reply({ STATUS: 'FAIL', ERRMSG: '매뉴얼 등록 실패', MSGBODY: '' }),
    );

    await expect(
      saveRemanual({ lotId: 'LOT-1', eqpId: 'E', rcpId: 'R', userId: 'U' }),
    ).rejects.toThrow('매뉴얼 등록 실패');
  });
});
