import { remoteFurnaceKjApi } from 'src/features/remote-furnace-kj';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: Record<string, unknown> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

describe('Remote Furnace KJ API (mock server)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('sends LOTINFO with TYPE MVIN and keeps the LOT fields', async () => {
    postAifMessage.mockResolvedValue(
      pass({ LOTID: 'LOT-KJ-001', BATCHID: 'BAT-KJ-01', OXMACHINE: '' }),
    );

    const result = await remoteFurnaceKjApi.fetchLotInfo({
      LOTID: 'LOT-KJ-001',
      FACILITY: 'KFAB',
      USERID: 'OP1',
    });

    expect(postAifMessage).toHaveBeenCalledWith('LOTINFO', 'LOTINFO', [
      ['LOTID', 'LOT-KJ-001'],
      ['FACILITY', 'KFAB'],
      ['TYPE', 'MVIN'],
      ['OPERATORID', 'OP1'],
    ]);
    expect(result.ok && result.data).toMatchObject({ LOTID: 'LOT-KJ-001', BATCHID: 'BAT-KJ-01' });
  });

  it('maps BATCHLISTBYLOT rows and the LOT1..LOTn dummy ids', async () => {
    postAifMessage.mockResolvedValue(
      pass({
        BATCHID: 'BAT-KJ-01',
        NWCOMMENTQTY: '0',
        LOT1: 'LOT-D1',
        LOT2: '',
        BATCHITEMS: { ITEM: [{ LOTID: 'LOT-KJ-001' }, { LOTID: 'LOT-KJ-EXT' }] },
      }),
    );

    const result = await remoteFurnaceKjApi.fetchBatchListByLot({
      LOTID: 'LOT-KJ-001',
      FACILITY: 'KFAB',
    });

    expect(result.ok && result.data.rows.map((row) => row.LOTID)).toEqual([
      'LOT-KJ-001',
      'LOT-KJ-EXT',
    ]);
    expect(result.ok && result.data.dummyLotIds).toEqual(['LOT-D1', '']);
    expect(result.ok && result.data.BATCHID).toBe('BAT-KJ-01');
  });

  it('sends FURNACEREMOTESTART_KJ in the FurnaceremoteStart_KJ field order', async () => {
    postAifMessage.mockResolvedValue(pass());

    await remoteFurnaceKjApi.startKjRemote({
      MACHINENAME: 'KJ-01',
      BATCHID: 'BAT-KJ-01',
      RECIPENAME: 'KJ-RCP-01',
      EVENTUSER: 'OP1',
      PORTNAME: '1',
      CMDTYPE: 'S',
      LOTLIST: 'LOT-KJ-001',
      ISDUMMY: 'F',
      LOTNAME: 'LOT-KJ-001',
      CHKNOBATCH: 'N',
    });

    expect(postAifMessage.mock.calls[0]?.[2].map(([name]: [string]) => name)).toEqual([
      'MACHINENAME',
      'BATCHID',
      'RECIPENAME',
      'EVENTUSER',
      'PORTNAME',
      'CMDTYPE',
      'LOTLIST',
      'ISDUMMY',
      'LOTNAME',
      'CHKNOBATCH',
    ]);
  });

  it('returns ERRMSG on FAIL and the error message on a transport failure', async () => {
    postAifMessage
      .mockResolvedValueOnce(fail('유효하지 않은 장비입니다.'))
      .mockRejectedValueOnce(new Error('Network Error'));

    await expect(remoteFurnaceKjApi.fetchEquipmentInfo({ EQPID: 'X' })).resolves.toEqual({
      ok: false,
      message: '유효하지 않은 장비입니다.',
    });
    await expect(
      remoteFurnaceKjApi.clearPort({ MACHINENAME: 'KJ-01', PORTNAME: '1' }),
    ).resolves.toEqual({
      ok: false,
      message: 'Network Error',
    });
  });
});
