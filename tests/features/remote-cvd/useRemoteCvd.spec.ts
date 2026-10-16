import { describe, expect, it, vi } from 'vitest';

import { useRemoteCvd } from '../../../src/features/remote-cvd/composables/useRemoteCvd';
import type {
  RemoteCvdApi,
  RemoteCvdDialog,
  RemoteCvdOptions,
  RemoteCvdResponse,
} from '../../../src/features/remote-cvd/types/remote-cvd.types';

const lotInfo = {
  PRODUCT: 'PRODUCT-CVD',
  FACILITY: 'FAB-A',
  OPERATION: '10020',
  CUSTOMER: 'CUSTOMER-A',
  CATEGORY: 'SALE-A',
  ENGINEER: 'ENGINEER-A',
  PACKING: 'PACKING-A',
  QUANTITY: '24',
  GOODCHIPS: '23',
  RECIPE: 'CVD:BASE-RCP',
  CHANGERECIPE: 'CVD:RUN-RCP',
  EQPGROUP: 'CVD01,CVD02',
  CHANGEEQPGROUP: '',
  COMMENTQTY: '2',
  NWCOMMENTQTY: '0',
  AREA: 'CVD',
  JOBCODE: 'JOB-01',
  PROCESSSTEP: 'CVD PROCESS',
  SUBOPERATION: '00',
  OPTYPE: 'C',
  STATUS: 'WAIT',
  STATE: 'WIP',
  HOLDSTATUS: '',
  OPERSEQUENCE: '7',
  LOTRESUSER: '',
  MACHINENAME: '',
  PORTNAME: '',
  MACHINERECIPENAME: '',
};

const equipmentInfo = {
  MAINEQPID: 'CVD-MAIN-01',
  PROCEQPID: 'CVD01',
  EQPAREA: 'CVD',
  EQPTYPE: 'CVD',
  ISDOOROPEN: 'Y',
  PORTNAME: '1,2',
  PARA1: '92%',
  PARA1_LIMIT: 'N80',
  PARA2: '18%',
  PARA2_LIMIT: 'N90',
};

function success(messageBody: Record<string, string> = {}): RemoteCvdResponse {
  return { isSuccess: true, messageBody, errorMessage: '' };
}

function makeApi(overrides: Partial<RemoteCvdApi> = {}): RemoteCvdApi {
  return Object.assign(
    {
      lotInfo: vi.fn(async () => success(lotInfo)),
      remoteEqpInfo: vi.fn(async () => success(equipmentInfo)),
      recipeInfo: vi.fn(async () => success({ RECIPE: 'CVD:RUN-A,RUN-B', DOWN_CH: '' })),
      teRcpSelection: vi.fn(async () => success({ TE_FLAG: 'N', TE_RCP: '', TE_ORDERS: '0' })),
      machinePortStatus: vi.fn(async () => success({ PORTSTATENAME: 'READY', PORTLOTNAME: '' })),
      memorization: vi.fn(async () => success({ ETCH_COMMRCP: 'N', 'Q-TIME': '' })),
      machinePortClear: vi.fn(async () => success()),
      doorOpen: vi.fn(async () => success()),
      remoteInterlockCheck: vi.fn(async () => success()),
      remoteStart: vi.fn(async () => success()),
      remoteRestart: vi.fn(async () => success()),
    } satisfies RemoteCvdApi,
    overrides,
  );
}

function makeHarness(api = makeApi()) {
  const dialog: RemoteCvdDialog = {
    alert: vi.fn(async () => undefined),
    confirm: vi.fn(async () => true),
  };
  const confirmRecipe = vi.fn(async () => true);
  const onComplete = vi.fn();
  const onCancel = vi.fn();
  const onOpenCommentList = vi.fn();
  const onOpenRcpConditions = vi.fn();
  const options: RemoteCvdOptions = {
    lotId: 'LOT-CVD-01',
    facility: 'FAB-A',
    operatorId: 'OP-01',
    dialog,
    confirmRecipe,
    onComplete,
    onCancel,
    onOpenCommentList,
    onOpenRcpConditions,
    api,
  };
  const screen = useRemoteCvd(options);
  return {
    api,
    dialog,
    confirmRecipe,
    onComplete,
    onCancel,
    onOpenCommentList,
    onOpenRcpConditions,
    screen,
  };
}

describe('useRemoteCvd legacy flow', () => {
  it('clears data for an empty LOT and reports a backend lookup failure', async () => {
    const api = makeApi({ lotInfo: vi.fn(async () => ({ ...success(), isSuccess: false })) });
    const { dialog, screen } = makeHarness(api);

    await screen.searchData('');
    expect(api.lotInfo).not.toHaveBeenCalled();

    await screen.searchData('LOT-ERROR');
    expect(dialog.alert).toHaveBeenCalledWith('에  러', 'Message failed.');
    expect(screen.state.loading).toBe(false);
  });

  it('maps LOT info and locks automation for non-WIP or held LOTs', async () => {
    const heldLot = makeApi({
      lotInfo: vi.fn(async () => success({ ...lotInfo, HOLDSTATUS: 'ONHOLD' })),
    });
    const { dialog, screen } = makeHarness(heldLot);

    await screen.searchData('LOT-HELD');

    expect(heldLot.lotInfo).toHaveBeenCalledWith('MVIN', 'LOT-HELD', 'FAB-A');
    expect(screen.state.equipmentDisabled).toBe(true);
    expect(screen.state.startDisabled).toBe(true);
    expect(dialog.alert).toHaveBeenCalledWith(
      '에  러',
      'HOLD된 LOT입니다. 자동화 진행이 불가합니다.',
    );
  });

  it.each([
    ['RUN', ''],
    ['WAIT', ''],
    ['WIP', 'ONHOLD'],
  ])('blocks LOT status %s/%s before enabling equipment', async (lotState, hold) => {
    const api = makeApi({
      lotInfo: vi.fn(async () => success({ ...lotInfo, STATE: lotState, HOLDSTATUS: hold })),
    });
    const { dialog, screen } = makeHarness(api);

    await screen.searchData('LOT-BLOCKED');

    expect(screen.state.equipmentDisabled).toBe(true);
    expect(screen.state.startDisabled).toBe(true);
    expect(dialog.alert).toHaveBeenCalledOnce();
  });

  it.each(['PHOTO', 'IMP'])(
    'blocks the legacy %s area with its dedicated guidance',
    async (area) => {
      const api = makeApi({ lotInfo: vi.fn(async () => success({ ...lotInfo, AREA: area })) });
      const { dialog, screen } = makeHarness(api);

      await screen.searchData('LOT-AREA');

      expect(screen.state.equipmentDisabled).toBe(true);
      expect(dialog.alert).toHaveBeenCalledOnce();
      expect(vi.mocked(dialog.alert).mock.calls[0]?.[1]).toContain(area);
    },
  );

  it('validates equipment only on barcode entry, maps recipe/PORT and completes START flow', async () => {
    const harness = makeHarness();
    await harness.screen.searchData('LOT-CVD-01');

    expect(harness.screen.state.product).toBe('PRODUCT-CVD');
    expect(harness.screen.state.currentOperation).toBe('CVD PROCESS(1002000)');
    expect(harness.screen.state.readCommentDisabled).toBe(false);

    await harness.screen.onEquipmentEnter('EQP-CVD01X');
    expect(harness.api.remoteEqpInfo).toHaveBeenCalledWith('CVD01');
    expect(harness.api.recipeInfo).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentId: 'CVD01', operation: '10020', subOperation: '00' }),
    );
    expect(harness.screen.state.recipeOptions).toEqual(['CVD:RUN-A', 'CVD:RUN-B']);

    await harness.screen.handlePortChange('1');
    expect(harness.screen.state.portState).toBe('READY');
    expect(harness.screen.state.startDisabled).toBe(false);
    expect(harness.screen.state.doorOpenDisabled).toBe(false);

    await harness.screen.executeStart();

    expect(harness.api.remoteInterlockCheck).toHaveBeenCalledWith(
      'LOT-CVD-01',
      '10020',
      '00',
      'CVD01',
      'CVD:RUN-A',
    );
    expect(harness.api.remoteStart).toHaveBeenCalledWith(
      expect.objectContaining({
        machineName: 'CVD-MAIN-01',
        machineName2: 'CVD01',
        operation: '10020-00',
        eventUser: 'OP-01',
      }),
    );
    expect(harness.confirmRecipe).toHaveBeenCalledWith('CVD:RUN-A', 'LOT-CVD-01');
    expect(harness.onComplete).toHaveBeenCalledOnce();
  });

  it('keeps RECIPEINFO inputs bound to the legacy member values', async () => {
    const api = makeApi({
      lotInfo: vi.fn(async () => success({ ...lotInfo, FACILITY: 'LOT-FACILITY', OPTYPE: 'M' })),
    });
    const { screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('EQP-CVD01X');

    expect(screen.state.facility).toBe('LOT-FACILITY');
    expect(api.recipeInfo).toHaveBeenCalledWith(
      expect.objectContaining({ operationType: '', facility: 'FAB-A' }),
    );
  });

  it('rejects invalid equipment barcode values and reports equipment lookup errors', async () => {
    const api = makeApi({
      remoteEqpInfo: vi.fn(async () => ({
        isSuccess: false,
        messageBody: {},
        errorMessage: 'Unknown equipment',
      })),
    });
    const { dialog, screen } = makeHarness(api);

    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('CVD01');
    await screen.onEquipmentEnter('EQP-');
    expect(api.remoteEqpInfo).not.toHaveBeenCalled();
    expect(dialog.alert).toHaveBeenCalledTimes(2);

    await screen.onEquipmentEnter('EQP-CVD01X');
    expect(api.remoteEqpInfo).toHaveBeenCalledWith('CVD01');
    expect(dialog.alert).toHaveBeenLastCalledWith('에  러', 'Unknown equipment');
    expect(screen.state.equipmentId).toBe('');
    expect(screen.state.loading).toBe(false);
  });

  it('reports a recipe request error and clears recipe and PORT selection', async () => {
    const api = makeApi({
      recipeInfo: vi.fn(async () => ({
        isSuccess: false,
        messageBody: {},
        errorMessage: 'Recipe unavailable',
      })),
    });
    const { dialog, screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('EQP-CVD01X');

    expect(screen.state.recipeOptions).toEqual([]);
    expect(screen.state.selectedRecipe).toBe('');
    expect(screen.state.portOptions).toEqual([]);
    expect(dialog.alert).toHaveBeenLastCalledWith('에  러', 'Recipe unavailable');
  });

  it('uses the legacy RESERVED PORT rule to enable RESTART only for the same LOT', async () => {
    const api = makeApi({
      machinePortStatus: vi.fn(async () =>
        success({ PORTSTATENAME: 'RESERVED', PORTLOTNAME: 'LOT-CVD-01' }),
      ),
    });
    const { screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('EQP-CVD01X');
    await screen.handlePortChange('1');

    expect(screen.state.startDisabled).toBe(true);
    expect(screen.state.restartDisabled).toBe(false);
  });

  it('handles an unrecognized port status as unavailable and blocks automation', async () => {
    const api = makeApi({
      machinePortStatus: vi.fn(async () => success({ PORTSTATENAME: '', PORTLOTNAME: '' })),
    });
    const { dialog, screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('EQP-CVD01X');
    await screen.handlePortChange('1');

    expect(screen.state.startDisabled).toBe(true);
    expect(screen.state.restartDisabled).toBe(true);
    expect(dialog.alert).toHaveBeenCalledWith(
      '장비 MESSAGE',
      'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
    );
  });

  it('requires PORT selection before clear/open and honors their confirmations', async () => {
    const api = makeApi();
    const { dialog, screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');

    await screen.executeClearPort();
    await screen.executeOpen();
    expect(dialog.alert).toHaveBeenCalledTimes(2);
    expect(api.machinePortClear).not.toHaveBeenCalled();
    expect(api.doorOpen).not.toHaveBeenCalled();

    await screen.onEquipmentEnter('EQP-CVD01X');
    await screen.handlePortChange('1');
    vi.mocked(dialog.confirm).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await screen.executeClearPort();
    await screen.executeOpen();
    expect(api.machinePortClear).not.toHaveBeenCalled();
    expect(api.doorOpen).not.toHaveBeenCalled();

    vi.mocked(dialog.confirm).mockResolvedValue(true);
    await screen.executeClearPort();
    await screen.executeOpen();
    expect(api.machinePortClear).toHaveBeenCalledWith('CVD-MAIN-01', '1');
    expect(api.doorOpen).toHaveBeenCalledWith('CVD-MAIN-01', '1', 'CVD', 'CVD');
  });

  it('blocks START when unread work comments remain', async () => {
    const api = makeApi({
      lotInfo: vi.fn(async (_type, _lotId, _facility) =>
        success({ ...lotInfo, NWCOMMENTQTY: '3' }),
      ),
    });
    const { api: testedApi, dialog, screen } = makeHarness(api);
    await screen.searchData('LOT-CVD-01');
    await screen.onEquipmentEnter('EQP-CVD01X');
    await screen.handlePortChange('1');
    await screen.executeStart();

    expect(testedApi.remoteStart).not.toHaveBeenCalled();
    expect(dialog.alert).toHaveBeenCalledWith(
      '에  러',
      '읽지 않은 작업성 COMMENT가 [3]가 있습니다.\n읽은후 진행하세요.',
    );
  });

  it('blocks START for missing equipment, PORT, or recipe selections', async () => {
    const { dialog, screen } = makeHarness();
    await screen.searchData('LOT-CVD-01');

    await screen.executeStart();
    await screen.onEquipmentEnter('EQP-CVD01X');
    await screen.executeStart();
    await screen.handlePortChange('1');
    screen.state.selectedRecipe = '';
    await screen.executeStart();

    expect(dialog.alert).toHaveBeenCalledTimes(3);
    expect(vi.mocked(dialog.alert).mock.calls.map((call) => call[1])).toEqual([
      '진행장비를 입력하세요.',
      '진행 Port를 선택하세요.',
      '진행 Rcp를 선택하세요.',
    ]);
  });

  it('honors recipe confirmation and interlock outcomes before START', async () => {
    const api = makeApi({
      remoteInterlockCheck: vi.fn(async () => ({
        isSuccess: false,
        messageBody: {},
        errorMessage: 'Interlock blocked',
      })),
    });
    const harness = makeHarness(api);
    await harness.screen.searchData('LOT-CVD-01');
    await harness.screen.onEquipmentEnter('EQP-CVD01X');
    await harness.screen.handlePortChange('1');

    vi.mocked(harness.confirmRecipe).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await harness.screen.executeStart();
    expect(api.remoteInterlockCheck).not.toHaveBeenCalled();
    await harness.screen.executeStart();
    expect(api.remoteStart).not.toHaveBeenCalled();
    expect(harness.dialog.alert).toHaveBeenCalledWith('에  러', 'Interlock blocked');
  });

  it('does not run the interlock check for RESTART and returns to the caller on cancel', async () => {
    const api = makeApi({
      machinePortStatus: vi.fn(async () =>
        success({ PORTSTATENAME: 'RESERVED', PORTLOTNAME: 'LOT-CVD-01' }),
      ),
    });
    const harness = makeHarness(api);
    await harness.screen.searchData('LOT-CVD-01');
    await harness.screen.onEquipmentEnter('EQP-CVD01X');
    await harness.screen.handlePortChange('1');
    await harness.screen.executeReStart();

    expect(harness.api.remoteRestart).toHaveBeenCalledOnce();
    expect(harness.api.remoteInterlockCheck).not.toHaveBeenCalled();
    expect(harness.confirmRecipe).toHaveBeenCalledWith('CVD:RUN-A', '');
    harness.screen.executeCancel();
    expect(harness.onCancel).toHaveBeenCalledOnce();
  });
});
