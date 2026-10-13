import type { RemoteFurnaceKjApi } from 'src/features/remote-furnace-kj';
import {
  createRemoteFurnaceKjMockApi,
  REMOTE_FURNACE_KJ_MOCK_CASES,
} from 'src/features/remote-furnace-kj';
import { describe, expect, it } from 'vitest';

const recipeRequest = {
  LOTID: 'LOT-KJ-001',
  OPERATION: 'FURNACE',
  SUBOPERATION: 'KJ',
  PRODUCT: 'PRODUCT-KJ-01',
  EQPID: 'KJ-01',
  OPTYPE: 'N',
  FACILITY: 'FAB-A',
  ISDUMMY: 'F',
};

describe('Remote Furnace KJ mock API', () => {
  it('classifies the default Furnace mock as KJ', async () => {
    const result = await createRemoteFurnaceKjMockApi().checkFurnaceKj({ LOTID: 'LOT-KJ-001' });

    expect(result).toEqual({ ok: true, data: { CNT: '0', FURNACE: 'KJ' } });
  });

  it('provides stable LOT, batch, equipment, recipe, interlock, and port fixtures', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const lot = await api.fetchLotInfo({ LOTID: 'LOT-KJ-001', FACILITY: 'FAB-A', USERID: 'OP-01' });
    const batch = await api.fetchBatchListByLot({ LOTID: 'WP00001', FACILITY: 'FAB-A' });
    const equipment = await api.fetchEquipmentInfo({ EQPID: 'EQP-KJ-01' });
    const recipe = await api.fetchRecipeInfo(recipeRequest);
    const interlock = await api.checkInterlock({
      MACHINENAME: 'KJ-01',
      BATCHID: 'BATCH-KJ-01',
      RECIPENAME: 'RCP-KJ-01',
      LOTLIST: 'LOT-KJ-001',
    });
    const port = await api.fetchKjPortStatus({
      MACHINENAME: 'KJ-01',
      PORTNAME: '1',
      LOTID: 'LOT-KJ-001',
      RECIPE: 'RCP-KJ-01',
    });

    expect(lot).toMatchObject({ ok: true, data: { LOTID: 'LOT-KJ-001', STATE: 'WIP' } });
    expect(batch).toMatchObject({
      ok: true,
      data: { rows: [expect.objectContaining({ LOTID: 'WP00001' })] },
    });
    expect(equipment).toMatchObject({ ok: true, data: { MAINEQPID: 'KJ-01', PORTNAME: '1,2' } });
    expect(recipe).toMatchObject({ ok: true, data: { RECIPE: 'RCP-KJ-01' } });
    expect(interlock).toMatchObject({ ok: true, data: { RET: '', INTLK: 'N' } });
    expect(port).toMatchObject({ ok: true, data: { PORTSTATENAME: 'IDLE' } });
  });

  it('keeps explicit mock scenarios for no-LOT, reserved LOT, unread comments, interlock, and port states', async () => {
    const noLotApi = createRemoteFurnaceKjMockApi('no-lot');
    const reservedApi = createRemoteFurnaceKjMockApi('reserved-lot');
    const commentsApi = createRemoteFurnaceKjMockApi('unread-comments');
    const interlockApi = createRemoteFurnaceKjMockApi('interlock');
    const completePortApi = createRemoteFurnaceKjMockApi('port-complete');

    expect(REMOTE_FURNACE_KJ_MOCK_CASES).toContain('no-lot');
    expect(
      await noLotApi.fetchLotInfo({ LOTID: '', FACILITY: 'FAB-A', USERID: 'OP-01' }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      await reservedApi.fetchLotInfo({ LOTID: 'LOT-RESERVED', FACILITY: 'FAB-A', USERID: 'OP-01' }),
    ).toMatchObject({
      ok: true,
      data: { LOTRESUSER: 'OP-RESERVED' },
    });
    expect(
      await commentsApi.fetchBatchListByLot({ LOTID: 'LOT-KJ-001', FACILITY: 'FAB-A' }),
    ).toMatchObject({
      ok: true,
      data: { rows: [expect.objectContaining({ NWCOMMENTQTY: '1' })] },
    });
    expect(
      await interlockApi.checkInterlock({
        MACHINENAME: 'KJ-01',
        BATCHID: 'BATCH-KJ-01',
        RECIPENAME: 'RCP-KJ-01',
        LOTLIST: 'LOT-KJ-001',
      }),
    ).toMatchObject({ ok: true, data: { INTLK: 'Y' } });
    expect(
      await completePortApi.fetchKjPortStatus({
        MACHINENAME: 'KJ-01',
        PORTNAME: '1',
        LOTID: 'LOT-KJ-001',
        RECIPE: 'RCP-KJ-01',
      }),
    ).toMatchObject({ ok: true, data: { PORTSTATENAME: 'COMPLETE' } });
  });

  it('returns typed success results for reset, equipment status, and Start/Restart commands', async () => {
    const api = createRemoteFurnaceKjMockApi();

    await expect(api.clearPort({ MACHINENAME: 'KJ-01', PORTNAME: '1' })).resolves.toEqual({
      ok: true,
      data: null,
    });
    await expect(
      api.changeEquipmentStatus({
        MAINEQPID: 'KJ-01',
        FACILITY: 'FAB-A',
        STATUS: 'R  가동중',
        REASONCODE: 'RR001',
        EVENTNAME: 'PDA_MVIN_UP',
        USERID: 'OP-01',
        USERNAME: 'Operator One',
        REMARK: '',
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { RET: '0' },
    });
    await expect(
      api.startKjRemote({
        MACHINENAME: 'KJ-01',
        BATCHID: 'BATCH-KJ-01',
        RECIPENAME: 'RCP-KJ-01',
        EVENTUSER: 'OP-01',
        PORTNAME: '1',
        CMDTYPE: 'S',
        LOTLIST: 'LOT-KJ-001',
        ISDUMMY: 'F',
        LOTNAME: 'LOT-KJ-001',
        CHKNOBATCH: 'N',
      }),
    ).resolves.toEqual({ ok: true, data: null });
  });

  it('returns a failed result from each operation-specific error fixture', async () => {
    const cases = [
      [
        'classification-error',
        (api: RemoteFurnaceKjApi) => api.checkFurnaceKj({ LOTID: 'LOT-KJ-001' }),
      ],
      [
        'lot-error',
        (api: RemoteFurnaceKjApi) =>
          api.fetchLotInfo({ LOTID: 'LOT-KJ-001', FACILITY: 'FAB-A', USERID: 'OP-01' }),
      ],
      [
        'batch-error',
        (api: RemoteFurnaceKjApi) =>
          api.fetchBatchListByLot({ LOTID: 'LOT-KJ-001', FACILITY: 'FAB-A' }),
      ],
      [
        'equipment-error',
        (api: RemoteFurnaceKjApi) => api.fetchEquipmentInfo({ EQPID: 'EQP-KJ-01' }),
      ],
      ['recipe-error', (api: RemoteFurnaceKjApi) => api.fetchRecipeInfo(recipeRequest)],
      [
        'interlock-error',
        (api: RemoteFurnaceKjApi) =>
          api.checkInterlock({ MACHINENAME: 'KJ-01', BATCHID: '', RECIPENAME: '', LOTLIST: '' }),
      ],
      [
        'port-error',
        (api: RemoteFurnaceKjApi) =>
          api.fetchKjPortStatus({ MACHINENAME: 'KJ-01', PORTNAME: '1', LOTID: '', RECIPE: '' }),
      ],
      [
        'clear-port-error',
        (api: RemoteFurnaceKjApi) => api.clearPort({ MACHINENAME: 'KJ-01', PORTNAME: '1' }),
      ],
      [
        'equipment-status-error',
        (api: RemoteFurnaceKjApi) =>
          api.changeEquipmentStatus({
            MAINEQPID: 'KJ-01',
            FACILITY: 'FAB-A',
            STATUS: 'R  가동중',
            REASONCODE: 'RR001',
            EVENTNAME: 'PDA_MVIN_UP',
            USERID: 'OP-01',
            USERNAME: 'Operator One',
            REMARK: '',
          }),
      ],
      [
        'start-error',
        (api: RemoteFurnaceKjApi) =>
          api.startKjRemote({
            MACHINENAME: 'KJ-01',
            BATCHID: '',
            RECIPENAME: '',
            EVENTUSER: 'OP-01',
            PORTNAME: '1',
            CMDTYPE: 'S',
            LOTLIST: '',
            ISDUMMY: 'F',
            LOTNAME: '',
            CHKNOBATCH: 'N',
          }),
      ],
    ] as const;

    for (const [mockCase, call] of cases) {
      await expect(call(createRemoteFurnaceKjMockApi(mockCase))).resolves.toMatchObject({
        ok: false,
      });
    }
  });
});
