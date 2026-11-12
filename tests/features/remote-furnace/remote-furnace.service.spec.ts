import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { remoteFurnaceService } from 'src/features/remote-furnace/services/remote-furnace.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteFurnaceService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchLotInfo parses response properly and handles error', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            PRODUCT: 'PRD_01',
            RECIPE: 'R_01',
            NWCOMMENTQTY: 3,
          },
        }),
      },
    });

    const successRes = await remoteFurnaceService.fetchLotInfo('LOT1', 'FAB2', 'USER1');
    expect(successRes.ok).toBe(true);
    expect(successRes.data?.product).toBe('PRD_01');
    expect(successRes.data?.recipe).toBe('R_01');
    expect(successRes.data?.nwCommentQty).toBe(3);

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'FAIL',
          ERRMSG: 'Lot not found',
        }),
      },
    });

    const failRes = await remoteFurnaceService.fetchLotInfo('LOT1', 'FAB2', 'USER1');
    expect(failRes.ok).toBe(false);
    expect(failRes.message).toBe('Lot not found');

    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network disconnected'));
    const netFailRes = await remoteFurnaceService.fetchLotInfo('LOT1', 'FAB2', 'USER1');
    expect(netFailRes.ok).toBe(false);
    expect(netFailRes.message).toBe('Network disconnected');
  });

  it('fetchBatchListByLot parses dummyMode F items properly', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            NWCOMMENTQTY: 1,
            BATCHITEMS: [
              {
                LOTID: 'LOT_A',
                PRODUCT: 'PRD_A',
                QUANTITY: 25,
                PROCESSNAME: 'OX',
                STATUS: 'WAIT',
              },
            ],
          },
        }),
      },
    });

    const res = await remoteFurnaceService.fetchBatchListByLot('LOT_A', 'FAB2', 'R_01', 'F');
    expect(res.ok).toBe(true);
    expect(res.data?.items).toHaveLength(1);
    expect(res.data?.items[0]?.lotId).toBe('LOT_A');
  });

  it('fetchRemoteEqpInfo, checkLotComment, startRemoteFurnace execute API calls', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            MACHINENAME: 'FN01',
            RECIPENAME: 'RCP_01',
            RET: '0',
            INTLK: 'N',
            NWCOMMENTQTY: 0,
          },
        }),
      },
    });

    const eqpRes = await remoteFurnaceService.fetchRemoteEqpInfo('FN01');
    expect(eqpRes.ok).toBe(true);

    const commentRes = await remoteFurnaceService.checkLotComment('LOT1', 'FAB2');
    expect(commentRes.ok).toBe(true);

    const intlkRes = await remoteFurnaceService.checkFurnaceInterlock(
      'FN01',
      'BAT1',
      'RCP_01',
      "'LOT1'",
    );
    expect(intlkRes.ok).toBe(true);
    expect(intlkRes.data?.intlk).toBe('N');

    const startRes = await remoteFurnaceService.startRemoteFurnace({
      machineName: 'FN01',
      remoteBatch: 'BAT1',
      recipeName: 'RCP_01',
      eventUser: 'OP1',
      portName: 'PORT1',
      cmdType: 'S',
      lotList: "'LOT1'",
      dummyMode: 'F',
      lotName: 'LOT1',
      chkNoBatch: 'F',
    });
    expect(startRes.ok).toBe(true);

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'FAIL',
          ERRMSG: 'FURNACEREMOTESTART failed',
        }),
      },
    });

    const startFailRes = await remoteFurnaceService.startRemoteFurnace({
      machineName: 'FN01',
      remoteBatch: 'BAT1',
      recipeName: 'RCP_01',
      eventUser: 'OP1',
      portName: 'PORT1',
      cmdType: 'S',
      lotList: "'LOT1'",
      dummyMode: 'F',
      lotName: 'LOT1',
      chkNoBatch: 'F',
    });
    expect(startFailRes.ok).toBe(false);
    expect(startFailRes.message).toBe('FURNACEREMOTESTART failed');
  });
});
