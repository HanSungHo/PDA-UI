import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  isRemoteFurnaceMockMode,
  remoteFurnaceService,
  setRemoteFurnaceMockMode,
} from 'src/features/remote-furnace/services/remote-furnace.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteFurnaceService (mock mode)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setRemoteFurnaceMockMode(true);

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  afterEach(() => {
    setRemoteFurnaceMockMode(false);
  });

  // ─── Mock mode toggle ─────────────────────────────────────────────────────

  it('isRemoteFurnaceMockMode returns current flag', () => {
    expect(isRemoteFurnaceMockMode()).toBe(true);
    setRemoteFurnaceMockMode(false);
    expect(isRemoteFurnaceMockMode()).toBe(false);
    setRemoteFurnaceMockMode(true);
  });

  // ─── fetchLotInfo ─────────────────────────────────────────────────────────

  describe('fetchLotInfo', () => {
    it('returns ok:true with mock lot data', async () => {
      const result = await remoteFurnaceService.fetchLotInfo('WIP00001', 'FAB2', 'OP_TEST');

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.recipe).toBe('FURNACE_DIFF_1000');
      expect(result.data?.batchId).not.toBe('');
      expect(result.data?.facility).toBe('FAB2');
    });

    it('returns eqpGroup from mock', async () => {
      const result = await remoteFurnaceService.fetchLotInfo('LOT_ANY', 'FAB2', 'OP_TEST');
      expect(result.data?.eqpGroup).toContain('FN01');
    });
  });

  // ─── fetchBatchListByLot ──────────────────────────────────────────────────

  describe('fetchBatchListByLot', () => {
    it('returns lot items in normal mode', async () => {
      const result = await remoteFurnaceService.fetchBatchListByLot(
        'WIP00001',
        'FAB2',
        'FURNACE_DIFF_1000',
        'F',
      );

      expect(result.ok).toBe(true);
      expect(result.data?.items.length).toBeGreaterThan(0);
      expect(result.data?.items[0]).toMatchObject({
        lotId: 'WIP00001',
        status: 'WAIT',
        lotState: 'WIP',
      });
    });

    it('returns empty items array when lotId contains "EMPTY"', async () => {
      const result = await remoteFurnaceService.fetchBatchListByLot(
        'WIP_EMPTY_TEST',
        'FAB2',
        'FURNACE_DIFF_1000',
        'F',
      );

      expect(result.ok).toBe(true);
      expect(result.data?.items).toHaveLength(0);
      expect(result.data?.unreadCommentQty).toBe(0);
    });

    it('returns unreadCommentQty > 0 for non-empty lot', async () => {
      const result = await remoteFurnaceService.fetchBatchListByLot('WIP00001', 'FAB2', '', 'F');
      expect(result.data?.unreadCommentQty).toBeGreaterThan(0);
    });

    it('uses fallback WIP00001 when lotId is empty in mock', async () => {
      const result = await remoteFurnaceService.fetchBatchListByLot('', 'FAB2', '', 'F');
      expect(result.data?.items[0]?.lotId).toBe('WIP00001');
    });
  });

  // ─── fetchRemoteEqpInfo ───────────────────────────────────────────────────

  describe('fetchRemoteEqpInfo', () => {
    it('returns mock eqp info with portName', async () => {
      const result = await remoteFurnaceService.fetchRemoteEqpInfo('FN01');

      expect(result.ok).toBe(true);
      expect(result.data?.mainEqpId).toBe('FN01');
      expect(result.data?.portName).toContain('PORT1');
    });

    it('uppercases eqpId in the mock result', async () => {
      const result = await remoteFurnaceService.fetchRemoteEqpInfo('fn02');
      expect(result.data?.mainEqpId).toBe('FN02');
    });
  });

  // ─── fetchDummyRecipeInfo ─────────────────────────────────────────────────

  describe('fetchDummyRecipeInfo', () => {
    it('returns a list of dummy recipes', async () => {
      const result = await remoteFurnaceService.fetchDummyRecipeInfo('FN01');

      expect(result.ok).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.data![0]).toContain('FURNACE');
    });
  });

  // ─── fetchMachinePortStatus ───────────────────────────────────────────────

  describe('fetchMachinePortStatus', () => {
    it('returns READY state for PORT1', async () => {
      const result = await remoteFurnaceService.fetchMachinePortStatus(
        'FN01',
        'PORT1',
        'WIP00001',
        'FURNACE_DIFF_1000',
      );

      expect(result.ok).toBe(true);
      expect(result.data?.portState).toBe('READY');
    });

    it('returns RUN state for PORT2', async () => {
      const result = await remoteFurnaceService.fetchMachinePortStatus(
        'FN01',
        'PORT2',
        'WIP00001',
        '',
      );
      expect(result.data?.portState).toBe('RUN');
    });

    it('returns PENDING state for PORT3', async () => {
      const result = await remoteFurnaceService.fetchMachinePortStatus(
        'FN01',
        'PORT3',
        'WIP00001',
        '',
      );
      expect(result.data?.portState).toBe('PENDING');
    });
  });

  // ─── clearMachinePort ────────────────────────────────────────────────────

  describe('clearMachinePort', () => {
    it('returns ok:true in mock mode', async () => {
      const result = await remoteFurnaceService.clearMachinePort('FN01', 'PORT1');
      expect(result.ok).toBe(true);
    });
  });

  // ─── checkFurnaceInterlock ────────────────────────────────────────────────

  describe('checkFurnaceInterlock', () => {
    it('returns intlk=N in mock mode (no interlock)', async () => {
      const result = await remoteFurnaceService.checkFurnaceInterlock(
        'FN01',
        'BAT-FN-202610',
        'FURNACE_DIFF_1000',
        "'WIP00001','WIP00002'",
      );

      expect(result.ok).toBe(true);
      expect(result.data?.intlk).toBe('N');
      expect(result.data?.ret).toBe('');
    });
  });

  // ─── changeEquipmentStatus ────────────────────────────────────────────────

  describe('changeEquipmentStatus', () => {
    it('returns ok:true in mock mode', async () => {
      const result = await remoteFurnaceService.changeEquipmentStatus(
        'FN01',
        'FAB2',
        'OP_TEST',
        'Test Operator',
      );
      expect(result.ok).toBe(true);
    });
  });

  // ─── checkLotComment ──────────────────────────────────────────────────────

  describe('checkLotComment', () => {
    it('returns 0 comment count in mock mode', async () => {
      const result = await remoteFurnaceService.checkLotComment('WIP00001', 'FAB2');
      expect(result.ok).toBe(true);
      expect(result.data).toBe(0);
    });
  });

  // ─── startRemoteFurnace ───────────────────────────────────────────────────

  describe('startRemoteFurnace', () => {
    it('returns ok:true for START command in mock mode', async () => {
      const result = await remoteFurnaceService.startRemoteFurnace({
        machineName: 'FN01',
        remoteBatch: 'BAT-FN-202610',
        recipeName: 'FURNACE_DIFF_1000',
        eventUser: 'OP_TEST',
        portName: 'PORT1',
        cmdType: 'S',
        lotList: "'WIP00001'",
        dummyMode: 'F',
        lotName: 'WIP00001',
        chkNoBatch: 'F',
      });

      expect(result.ok).toBe(true);
    });

    it('returns ok:true for RESTART command in mock mode', async () => {
      const result = await remoteFurnaceService.startRemoteFurnace({
        machineName: 'FN01',
        remoteBatch: 'BAT-FN-202610',
        recipeName: 'FURNACE_DIFF_1000',
        eventUser: 'OP_TEST',
        portName: 'PORT1',
        cmdType: 'R',
        lotList: '',
        dummyMode: 'NONLOT',
        lotName: '',
        chkNoBatch: 'F',
      });

      expect(result.ok).toBe(true);
    });
  });

  // ─── fetchRecipeInfo ──────────────────────────────────────────────────────

  describe('fetchRecipeInfo', () => {
    it('returns a recipe name in mock mode', async () => {
      const result = await remoteFurnaceService.fetchRecipeInfo(
        'WIP00001',
        '3100',
        '010',
        'ATOP26-W01',
        'FN01',
        'N',
        'FAB2',
        'F',
      );

      expect(result.ok).toBe(true);
      expect(result.data?.recipe).toBeTruthy();
    });
  });
});

describe('remoteFurnaceService (api client mode)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setRemoteFurnaceMockMode(false);

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  afterEach(() => {
    setRemoteFurnaceMockMode(false);
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
