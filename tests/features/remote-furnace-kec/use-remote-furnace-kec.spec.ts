import { describe, expect, it, vi } from 'vitest';

import { useRemoteFurnaceKec } from '../../../src/features/remote-furnace-kec/composables/use-remote-furnace-kec';
import type {
  RemoteFurnaceKecApi,
  RemoteFurnaceKecDialog,
} from '../../../src/features/remote-furnace-kec/types/remote-furnace-kec.types';

const lotInfo = {
  PRODUCT: 'PRODUCT-1',
  OPERATION: 'OP-1',
  SUBOPERATION: 'SUB-1',
  PROCESSSTEP: 'STEP-1',
  OPTYPE: 'M',
  OPERSEQUENCE: '4',
  BATCHID: 'BATCH-01',
  RECIPE: 'BASE-RCP',
  EQPGROUP: 'GROUP',
  STATE: 'WIP',
  STATUS: 'WAIT',
  HOLDSTATUS: '',
  NWCOMMENTQTY: '0',
};

const batchItem = {
  LOTID: 'LOT-01',
  COMMENTQTY: '0',
  STATUS: 'WAIT',
  PROCESSSTEP: 'STEP-1',
  PRODUCT: 'PRODUCT-1',
  QUANTITY: '20',
  ERRORMESSAGE: '',
  OPERATION: 'OP-1',
  SUBOPERATION: 'SUB-1',
  LOTSTATE: 'WIP',
  NWCOMMENTQTY: '0',
  OPERSEQUENCE: '4',
  PROCESSNAME: 'NORMAL',
};

function makeApi(overrides: Partial<RemoteFurnaceKecApi> = {}): RemoteFurnaceKecApi {
  const api: RemoteFurnaceKecApi = {
    FURNACE_KJCHECK: vi.fn(async () => ({ CNT: 'KEC' })),
    REMOTEEQPINFO: vi.fn(async () => ({
      MAINEQPID: 'MAIN-01',
      PROCEQPID: 'PROC-01',
      EQPAREA: 'AREA-1',
      EQPTYPE: 'TYPE-1',
      PORTNAME: 'PORT-1,PORT-2',
      PMMESSAGE: '',
      CYCLE_MESSAGE: '',
    })),
    RECIPEINFO: vi.fn(async () => ({ RECIPE: 'RUN-RCP' })),
    FURNACEDUMMYRCP: vi.fn(async () => ({ RECIPE: 'DUMMY-RCP-1,DUMMY-RCP-2' })),
    LOTINFO: vi.fn(async (_request, includeOperator) =>
      includeOperator ? { ...lotInfo } : { NWCOMMENTQTY: '0' },
    ),
    BATCHLISTBYLOT: vi.fn(async () => ({
      BATCHITEMS: { ITEM: [batchItem] },
      MWCOUNT: '3',
      NWCOMMENTQTY: '0',
    })),
    FURNACEINTLKCHECK: vi.fn(async () => ({})),
    MACHINEPORTSTATUS_KJ: vi.fn(async () => ({
      PORTSTATENAME1: 'IDLE',
      PORTLOTNAME: '',
      BATCH_CNT: '0',
      EXIST_BATCH: '0',
      ACKMSG: '',
    })),
    MACHINEPORTCLEAR: vi.fn(async () => ({})),
    CHANGEEQPSTATUS: vi.fn(async () => ({})),
    FurnaceremoteStart_KEC: vi.fn(async () => ({})),
  };
  return Object.assign(api, overrides);
}

function makeHarness(
  api = makeApi(),
  lot = 'LOT-01',
): {
  api: RemoteFurnaceKecApi;
  dialog: RemoteFurnaceKecDialog;
  confirmRecipe: ReturnType<typeof vi.fn>;
  onComment: ReturnType<typeof vi.fn>;
  onSuccess: ReturnType<typeof vi.fn>;
  screen: ReturnType<typeof useRemoteFurnaceKec>;
} {
  const dialog: RemoteFurnaceKecDialog = {
    alert: vi.fn(async () => undefined),
    confirm: vi.fn(async () => true),
  };
  const confirmRecipe = vi.fn(async () => true);
  const onComment = vi.fn();
  const onSuccess = vi.fn();
  const screen = useRemoteFurnaceKec({
    lotId: lot,
    facility: 'FAB1',
    operatorId: 'OP-01',
    operatorName: 'Operator',
    dialog,
    confirmRecipe,
    onSuccess,
    onComment,
    api,
  });
  return { api, dialog, confirmRecipe, onComment, onSuccess, screen };
}

describe('useRemoteFurnaceKec', () => {
  it('exposes caller detection and loading-wrapped port/interlock refreshes', async () => {
    const { api, screen } = makeHarness();
    expect(await screen.getFurnaceLotTarget()).toBe('KEC');

    await screen.refreshPortState();
    expect(screen.loading.value).toBe(false);
    expect(api.MACHINEPORTSTATUS_KJ).not.toHaveBeenCalled();

    await screen.initialize();
    screen.selectedRecipe.value = 'RUN-RCP';
    await screen.checkRecipeInterlock();
    expect(api.FURNACEINTLKCHECK).toHaveBeenCalledWith('', 'BATCH-01', 'RUN-RCP', 'LOT-01');
    expect(screen.loading.value).toBe(false);
  });

  it('loads LOTINFO, derives the changed equipment/recipe state and maps BATCHITEMS', async () => {
    const api = makeApi({
      LOTINFO: vi.fn(async (_request, includeOperator) =>
        includeOperator
          ? { ...lotInfo, CHANGERECIPE: 'NEW-RCP', CHANGEEQPGROUP: 'ALT-GROUP' }
          : { NWCOMMENTQTY: '0' },
      ),
    });
    const { screen } = makeHarness(api);

    await screen.initialize();

    expect(api.LOTINFO).toHaveBeenCalledWith(
      { lotId: 'LOT-01', facility: 'FAB1', operatorId: 'OP-01' },
      true,
    );
    expect(screen.isRecipeChanged.value).toBe(true);
    expect(screen.isStandardEquipmentChanged.value).toBe(true);
    expect(screen.standardEquipment.value).toBe('ALT-GROUP');
    expect(screen.batchId.value).toBe('BATCH-01');
    expect(screen.rows.value[0].LOTID).toBe('LOT-01');
    expect(screen.selectedMwf.value).toBe('3');
    expect(screen.mwfPosition.value).toBe(3);
  });

  it('stops initialization for RUN, non-WIP and ONHOLD lots', async () => {
    for (const response of [
      { ...lotInfo, STATUS: 'RUN' },
      { ...lotInfo, STATE: 'WAIT' },
      { ...lotInfo, HOLDSTATUS: 'ONHOLD' },
    ]) {
      const api = makeApi({ LOTINFO: vi.fn(async () => response) });
      const { dialog, screen } = makeHarness(api);
      await screen.initialize();
      expect(api.BATCHLISTBYLOT).not.toHaveBeenCalled();
      expect(dialog.alert).toHaveBeenCalled();
    }
  });

  it('skips initialization without LOTID and reports initial LOT lookup errors', async () => {
    const noLot = makeHarness(makeApi(), '');
    await noLot.screen.initialize();
    expect(noLot.api.LOTINFO).not.toHaveBeenCalled();

    const failedApi = makeApi({
      LOTINFO: vi.fn(async () => Promise.reject(new Error('LOT failed'))),
    });
    const failed = makeHarness(failedApi);
    await failed.screen.initialize();
    expect(failed.dialog.alert).toHaveBeenCalledWith('에  러', 'LOT failed');
    expect(failed.screen.availability.start).toBe(false);
  });

  it('normalizes the EQP barcode, loads recipe/port state and sends Enter+Start', async () => {
    const { api, screen, confirmRecipe, onSuccess } = makeHarness();
    await screen.initialize();
    await screen.handleEquipmentEnter('EQP-MACHINE1*');

    expect(api.REMOTEEQPINFO).toHaveBeenCalledWith('MACHINE1');
    expect(screen.equipmentId.value).toBe('PROC-01');
    expect(screen.selectedRecipe.value).toBe('RUN-RCP');
    expect(screen.availability.enterStart).toBe(true);

    await screen.executeCommand('enterStart');

    expect(confirmRecipe).toHaveBeenCalledWith('RUN-RCP', 'LOT-01');
    expect(api.FurnaceremoteStart_KEC).toHaveBeenCalledWith(
      expect.objectContaining({
        commandType: 'ENTER_START',
        lotList: "'LOT-01'",
        isDummy: 'F',
        mwfCount: '3',
      }),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('does not submit a command when the shared recipe confirmation is cancelled', async () => {
    const api = makeApi();
    const harness = makeHarness(api);
    await harness.screen.initialize();
    await harness.screen.handleEquipmentEnter('EQP-MACHINE1*');
    harness.confirmRecipe.mockResolvedValueOnce(false);

    await harness.screen.executeCommand('start');

    expect(harness.confirmRecipe).toHaveBeenCalledWith('RUN-RCP', 'LOT-01');
    expect(api.FurnaceremoteStart_KEC).not.toHaveBeenCalled();
    expect(harness.onSuccess).not.toHaveBeenCalled();
  });

  it('keeps loading active through the nested equipment, port and recipe requests', async () => {
    let resolveEquipment: ((response: Record<string, unknown>) => void) | undefined;
    const equipmentResponse = new Promise<Record<string, unknown>>((resolve) => {
      resolveEquipment = resolve;
    });
    const api = makeApi({ REMOTEEQPINFO: vi.fn(() => equipmentResponse) });
    const { screen } = makeHarness(api);
    await screen.initialize();

    const pending = screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(screen.loading.value).toBe(true);
    resolveEquipment?.({
      MAINEQPID: 'MAIN-01',
      PROCEQPID: 'PROC-01',
      PORTNAME: 'PORT-1',
    });
    await pending;

    expect(screen.loading.value).toBe(false);
  });

  it('rejects invalid equipment barcodes and equipment outside the standard group', async () => {
    const invalidBarcode = makeHarness();
    await invalidBarcode.screen.handleEquipmentEnter('MACHINE1*');
    expect(invalidBarcode.screen.equipmentId.value).toBe('');
    expect(invalidBarcode.dialog.alert).toHaveBeenCalledWith(
      'READING ERROR',
      '진행할 장비를 읽어주세요.',
    );

    const api = makeApi({
      LOTINFO: vi.fn(async (_request, includeOperator) =>
        includeOperator ? { ...lotInfo, EQPGROUP: 'EQP-1~3' } : { NWCOMMENTQTY: '0' },
      ),
    });
    const { screen, dialog } = makeHarness(api);
    await screen.initialize();
    await screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(screen.equipmentId.value).toBe('');
    expect(dialog.alert).toHaveBeenCalledWith(
      '에  러',
      '[PROC-01]장비가 기준장비에 존재하지 않습니다.',
    );
  });

  it('handles equipment lookup notifications, cycle messages and failed lookups', async () => {
    const api = makeApi({
      REMOTEEQPINFO: vi.fn(async () => ({
        MAINEQPID: 'MAIN-01',
        PROCEQPID: 'PROC-01',
        PORTNAME: 'PORT-1,PORT-2',
        PMMESSAGE: 'PM warning',
        CYCLE_MESSAGE: 'cycle one/cycle two',
      })),
    });
    const { dialog, screen } = makeHarness(api);
    await screen.initialize();
    await screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(dialog.alert).toHaveBeenCalledWith('PM주기 경고', 'PM warning');
    expect(dialog.alert).toHaveBeenCalledWith('계측 주기 알림', 'cycle one');
    expect(dialog.alert).toHaveBeenCalledWith('계측 주기 알림', 'cycle two');
    expect(screen.portOptions.value).toEqual(['PORT-1', 'PORT-2']);

    const failedApi = makeApi({
      REMOTEEQPINFO: vi.fn(async () => Promise.reject(new Error('equipment failed'))),
    });
    const failed = makeHarness(failedApi);
    await failed.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(failed.dialog.alert).toHaveBeenCalledWith('에  러', 'equipment failed');
    expect(failed.screen.equipmentId.value).toBe('');
  });

  it('handles recipe etch confirmation, multi-move warning, equipment-down recovery and other errors', async () => {
    const cancelledApi = makeApi({
      RECIPEINFO: vi.fn(async () => ({ ETCHMESSAGE: 'Etch warning' })),
    });
    const cancelled = makeHarness(cancelledApi);
    vi.mocked(cancelled.dialog.confirm).mockResolvedValueOnce(false);
    await cancelled.screen.initialize();
    await cancelled.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(cancelled.dialog.confirm).toHaveBeenCalledWith('확  인', 'Etch warning');
    expect(cancelled.screen.equipmentId.value).toBe('');

    const acceptedApi = makeApi({
      RECIPEINFO: vi.fn(async () => ({
        ETCHMESSAGE: 'Etch warning',
        MULTIMOVEINACTION: 'Multi move warning',
        RECIPE: 'RUN-RCP',
      })),
    });
    const accepted = makeHarness(acceptedApi);
    await accepted.screen.initialize();
    await accepted.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(accepted.dialog.alert).toHaveBeenCalledWith('WARNING', 'Multi move warning');
    expect(accepted.screen.selectedRecipe.value).toBe('RUN-RCP');

    const downApi = makeApi({
      RECIPEINFO: vi.fn(async () =>
        Promise.reject(new Error('현재 장비 상태가 비부하DOWN 입니다.')),
      ),
    });
    const down = makeHarness(downApi);
    vi.mocked(down.dialog.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await down.screen.initialize();
    await down.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(down.dialog.confirm).toHaveBeenCalledWith(
      '확  인',
      '현재 장비 상태가 가동중(RUN)이 아닙니다.\n장비 상태를 가동중(RUN)으로 변경 하시겠습니까?',
    );
    expect(downApi.CHANGEEQPSTATUS).toHaveBeenCalledOnce();
    expect(downApi.RECIPEINFO).toHaveBeenCalledOnce();

    const rejectedApi = makeApi({
      RECIPEINFO: vi.fn(async () => Promise.reject(new Error('recipe rejected'))),
    });
    const rejected = makeHarness(rejectedApi);
    await rejected.screen.initialize();
    await rejected.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(rejected.dialog.alert).toHaveBeenCalledWith('에  러', 'recipe rejected');
  });

  it('keeps all port operations disabled when recipe interlock returns Y', async () => {
    const api = makeApi({ FURNACEINTLKCHECK: vi.fn(async () => ({ INTLK: 'Y' })) });
    const { screen } = makeHarness(api);
    await screen.initialize();
    await screen.handleEquipmentEnter('EQP-MACHINE1*');

    expect(screen.availability.start).toBe(false);
    expect(screen.availability.restart).toBe(false);
    expect(screen.availability.enter).toBe(false);
    expect(screen.availability.enterStart).toBe(false);
  });

  it('handles empty/failed batch lookups, interlock RET and port lookup failures', async () => {
    const emptyBatch = makeHarness(
      makeApi({ BATCHLISTBYLOT: vi.fn(async () => ({ BATCHITEMS: { ITEM: [] } })) }),
    );
    await emptyBatch.screen.initialize();
    expect(emptyBatch.dialog.alert).toHaveBeenCalledWith('에  러', 'MOVE IN할 LOT이 없습니다.');

    const failedBatch = makeHarness(
      makeApi({ BATCHLISTBYLOT: vi.fn(async () => Promise.reject(new Error('batch failed'))) }),
    );
    await failedBatch.screen.initialize();
    expect(failedBatch.dialog.alert).toHaveBeenCalledWith('에  러', 'batch failed');

    const interlock = makeHarness(
      makeApi({ FURNACEINTLKCHECK: vi.fn(async () => ({ RET: 'Interlock reason' })) }),
    );
    await interlock.screen.initialize();
    await interlock.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(interlock.dialog.alert).toHaveBeenCalledWith('에  러', 'Interlock reason');

    const failedPort = makeHarness(
      makeApi({
        MACHINEPORTSTATUS_KJ: vi.fn(async () => Promise.reject(new Error('port failed'))),
      }),
    );
    await failedPort.screen.initialize();
    await failedPort.screen.handleEquipmentEnter('EQP-MACHINE1*');
    expect(failedPort.dialog.alert).toHaveBeenCalledWith('에  러', 'port failed');
  });

  it('blocks commands for unread work comments and non-WIP batch rows', async () => {
    const commentApi = makeApi({
      LOTINFO: vi.fn(async (_request, includeOperator) =>
        includeOperator ? { ...lotInfo } : { NWCOMMENTQTY: '2' },
      ),
    });
    const commentHarness = makeHarness(commentApi);
    await commentHarness.screen.initialize();
    await commentHarness.screen.handleEquipmentEnter('EQP-MACHINE1*');
    await commentHarness.screen.executeCommand('start');
    expect(commentApi.FurnaceremoteStart_KEC).not.toHaveBeenCalled();
    expect(commentHarness.dialog.alert).toHaveBeenCalledWith(
      '에  러',
      '[LOT-01] 읽지 않은 작업성 COMMENT가 [2]가 있습니다.\n읽은후 진행하세요.',
    );

    const rowApi = makeApi({
      BATCHLISTBYLOT: vi.fn(async () => ({
        BATCHITEMS: { ITEM: [{ ...batchItem, LOTSTATE: 'RUN' }] },
      })),
    });
    const rowHarness = makeHarness(rowApi);
    await rowHarness.screen.initialize();
    await rowHarness.screen.handleEquipmentEnter('EQP-MACHINE1*');
    await rowHarness.screen.executeCommand('start');
    expect(rowApi.FurnaceremoteStart_KEC).not.toHaveBeenCalled();
    expect(rowHarness.dialog.alert).toHaveBeenCalledWith(
      '에  러',
      '[LOT-01]는 [RUN]상태로\nMOVE IN할수 없습니다.',
    );
    expect(rowHarness.screen.availability.start).toBe(true);
  });

  it('requires port-clear confirmation and refreshes after successful clear', async () => {
    const { api, dialog, screen } = makeHarness();
    vi.mocked(dialog.confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await screen.initialize();
    await screen.handleEquipmentEnter('EQP-MACHINE1*');

    await screen.executeClearPort();
    expect(api.MACHINEPORTCLEAR).not.toHaveBeenCalled();
    await screen.executeClearPort();
    expect(dialog.confirm).toHaveBeenLastCalledWith(
      '확  인',
      'PORT [PORT-1]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?',
      '확인',
      '취소',
    );
    expect(api.MACHINEPORTCLEAR).toHaveBeenCalledWith('MAIN-01', 'PORT-1');
    expect(api.MACHINEPORTSTATUS_KJ).toHaveBeenCalledTimes(2);
  });

  it('opens the comment screen for nonzero integer row counts only', async () => {
    const { onComment, screen } = makeHarness();
    await screen.initialize();
    const row = screen.rows.value[0];
    screen.selectRow({ ...row, COMMENTQTY: '-1' });
    expect(onComment).toHaveBeenCalledOnce();
    expect(onComment).toHaveBeenCalledWith({ ...row, COMMENTQTY: '-1' });
    screen.selectRow({ ...row, COMMENTQTY: 'not-a-number' });
    expect(onComment).toHaveBeenCalledOnce();
    screen.selectRow({ ...row, COMMENTQTY: '0' });
    expect(onComment).toHaveBeenCalledOnce();
  });

  it('supports NONLOT and restart command contracts', async () => {
    const nonLot = makeHarness(makeApi(), '');
    await nonLot.screen.handleEquipmentEnter('EQP-MACHINE1*');
    await nonLot.screen.executeCommand('start');
    expect(nonLot.api.FurnaceremoteStart_KEC).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'S', lotList: '', isDummy: 'NONLOT' }),
    );

    const restartApi = makeApi({
      LOTINFO: vi.fn(async (_request, includeOperator) =>
        includeOperator
          ? {
              ...lotInfo,
              LOTRESUSER: 'OP-OLD',
              MACHINENAME: 'MACHINE-OLD',
              PORTNAME: 'PORT-1',
              MACHINERECIPENAME: 'RESERVED-RCP',
            }
          : { NWCOMMENTQTY: '0' },
      ),
      MACHINEPORTSTATUS_KJ: vi.fn(async () => ({
        PORTSTATENAME1: 'PENDING',
        BATCH_CNT: '1',
        EXIST_BATCH: '1',
      })),
    });
    const restart = makeHarness(restartApi);
    await restart.screen.initialize();
    expect(restart.screen.restartMode.value).toBe(true);
    expect(restart.screen.selectedRecipe.value).toBe('RESERVED-RCP');
    expect(restart.screen.availability.restart).toBe(true);
    await restart.screen.executeCommand('restart');
    expect(restartApi.FurnaceremoteStart_KEC).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'R', recipeName: 'RESERVED-RCP' }),
    );
  });

  it('sends the START and ENTER command types and reports command failure', async () => {
    for (const [command, commandType] of [
      ['start', 'S'],
      ['enter', 'ENTER'],
    ] as const) {
      const harness = makeHarness();
      await harness.screen.initialize();
      await harness.screen.handleEquipmentEnter('EQP-MACHINE1*');
      await harness.screen.executeCommand(command);
      expect(harness.api.FurnaceremoteStart_KEC).toHaveBeenCalledWith(
        expect.objectContaining({ commandType }),
      );
    }

    const failedApi = makeApi({
      FurnaceremoteStart_KEC: vi.fn(async () => Promise.reject(new Error('start failed'))),
    });
    const failed = makeHarness(failedApi);
    await failed.screen.initialize();
    await failed.screen.handleEquipmentEnter('EQP-MACHINE1*');
    await failed.screen.executeCommand('start');
    expect(failed.dialog.alert).toHaveBeenCalledWith('에  러', 'start failed');
    expect(failed.onSuccess).not.toHaveBeenCalled();
  });
});
