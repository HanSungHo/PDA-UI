import { createPinia, setActivePinia } from 'pinia';
import { useRemoteRamco } from 'src/features/remote-ramco/composables/useRemoteRamco';
import { useRemoteRamcoStore } from 'src/features/remote-ramco/stores/remote-ramco.store';
import type {
  LotInfoResponse,
  RemoteRamcoApi,
  WetRemoteEqpInfoResponse,
} from 'src/features/remote-ramco/types/remote-ramco.types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = (message: string) => ({ ok: false as const, message });

const lot: LotInfoResponse = {
  PRODUCT: 'P',
  OPERATION: 'OP',
  QUANTITY: '5',
  JOBCODE: 'J',
  PROCESSSTEP: 'S',
  SUBOPERATION: '010',
  OPTYPE: 'N',
  OPERSEQUENCE: '1',
  STATUS: '',
  STATE: 'WIP',
  HOLDSTATUS: '',
  BATCHID: '',
  AREA: '',
  LOTRESUSER: '',
  NWCOMMENTQTY: '0',
  COMMENTQTY: '2',
};

const eqp: WetRemoteEqpInfoResponse = {
  MAINEQPID: 'EQP-01',
  JOBID: 'JOB',
  PCOUNT: 'Y',
  EQPTYPE: 'ETCH',
  EQPAREA: 'AREA',
  NUMCST: '1',
};

function makeApi(overrides: Partial<RemoteRamcoApi> = {}): RemoteRamcoApi {
  return {
    fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp })),
    fetchLotInfo: vi.fn(async () => ok({ ...lot })),
    fetchRecipeInfo: vi.fn(async () =>
      ok({ RECIPE: 'RCP-A', POP_MSG: '', QTIME_FLAG: '', QTIME_FLAG_W: '' }),
    ),
    fetchPortStatus: vi.fn(async () => ok({ PORTSTATENAME: 'READY', ACKMSG: '' })),
    clearPort: vi.fn(async () => ok(null)),
    cancelJobs: vi.fn(async () => ok({ RET: '0' })),
    startRemote: vi.fn(async () => ok(null)),
    ...overrides,
  };
}

function setup(api = makeApi(), initialLotId = '') {
  const callbacks = { onOpenComment: vi.fn(), onCancel: vi.fn(), onCompleted: vi.fn() };
  const screen = useRemoteRamco({
    api,
    facility: 'FAC',
    operatorId: 'USER',
    initialLotId,
    ...callbacks,
  });
  return { screen, api, ...callbacks };
}

async function settleConfirm(screen: ReturnType<typeof setup>['screen'], value: boolean) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  screen.resolveDialog(value);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('useRemoteRamco equipment lookup', () => {
  it('rejects an empty equipment id', async () => {
    const { screen } = setup();
    await screen.lookupEquipment();
    expect(screen.dialog.value?.message).toBe('장비명을 입력하여 주세요.');
  });

  it('shows the service error message when the lookup fails', async () => {
    const { screen } = setup(makeApi({ fetchEquipmentInfo: vi.fn(async () => fail('boom')) }));
    screen.setEquipmentInput('eqp-01');
    await screen.lookupEquipment();
    expect(screen.dialog.value?.message).toBe('boom');
    expect(screen.rearLotEnabled.value).toBe(false);
  });

  it('shows thrown errors with the fallback text for non-Error values', async () => {
    const { screen } = setup(
      makeApi({
        fetchEquipmentInfo: vi.fn(async () => {
          throw new Error('thrown');
        }),
      }),
    );
    screen.setEquipmentInput('eqp-01');
    await screen.lookupEquipment();
    expect(screen.dialog.value?.message).toBe('thrown');

    const second = setup(
      makeApi({
        fetchEquipmentInfo: vi.fn(async () => {
          throw 'x';
        }),
      }),
    );
    second.screen.setEquipmentInput('eqp-01');
    await second.screen.lookupEquipment();
    expect(second.screen.dialog.value?.message).toBe('요청에 실패하였습니다.');
  });

  it('warns about PM messages and blocks start when PCOUNT is N', async () => {
    const { screen } = setup(
      makeApi({
        fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, PMMESSAGE: 'PM', PCOUNT: 'N' })),
      }),
    );
    screen.setEquipmentInput('EQP-01');
    await screen.lookupEquipment();
    expect(screen.startEnabled.value).toBe(false);
    expect(screen.dialog.value?.message).toBe('진행중인 LOT이 있어 진행이 불가합니다.');
  });

  it('selects the scrubber port for ULTIMA3 and reports RECOMM3', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        ok({ ...eqp, EQPTYPE: 'ULTIMA3', PORTNAME: '1,2', RECOMM3: 'rec' }),
      ),
    });
    const { screen } = setup(api);
    screen.setEquipmentInput('EQP-01-2');
    await screen.lookupEquipment();
    expect(screen.selectedPort.value).toBe('2');
    expect(screen.dialog.value?.title).toBe('추천');
    expect(api.fetchEquipmentInfo).toHaveBeenCalledWith({ EQPID: 'EQP-01' });
  });

  it('falls back to the first ULTIMA3 port for excluded ids and handles a missing list', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, EQPTYPE: 'ULTIMA3' })),
      fetchPortStatus: vi.fn(async () => ok({ PORTSTATENAME: '', ACKMSG: '' })),
    });
    const { screen } = setup(api);
    screen.setEquipmentInput('R-6-1');
    await screen.lookupEquipment();
    expect(screen.selectedPort.value).toBe('');
    expect(api.fetchPortStatus).not.toHaveBeenCalled();
  });

  it('shows recipe service failures, POP messages and Q-Time warnings', async () => {
    const failing = setup(makeApi({ fetchRecipeInfo: vi.fn(async () => fail('rcp')) }));
    failing.screen.setEquipmentInput('EQP-01');
    await failing.screen.lookupEquipment();
    expect(failing.screen.dialog.value?.message).toBe('rcp');

    const qtime = setup(
      makeApi({
        fetchRecipeInfo: vi.fn(async () =>
          ok({ RECIPE: 'A;B', POP_MSG: 'pop', QTIME_FLAG: 'Y', QTIME_FLAG_W: '' }),
        ),
      }),
    );
    qtime.screen.setEquipmentInput('EQP-01');
    await qtime.screen.lookupEquipment();
    expect(qtime.screen.recipes.value).toEqual(['A', 'B']);
    expect(qtime.screen.dialog.value?.title).toBe('Q-Time Over');

    const warn = setup(
      makeApi({
        fetchRecipeInfo: vi.fn(async () =>
          ok({ RECIPE: 'A', POP_MSG: '', QTIME_FLAG: '', QTIME_FLAG_W: 'Y' }),
        ),
      }),
    );
    warn.screen.setEquipmentInput('EQP-01');
    await warn.screen.lookupEquipment();
    expect(warn.screen.dialog.value?.message).toBe('Q-Time 2hr 이내 근접 Lot 입니다');
  });

  it('parses recipe variants for DES220, KAIJO and colon-separated lists', async () => {
    const make = async (type: string, recipe: string) => {
      const { screen } = setup(
        makeApi({
          fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, EQPTYPE: type })),
          fetchRecipeInfo: vi.fn(async () =>
            ok({ RECIPE: recipe, POP_MSG: '', QTIME_FLAG: '', QTIME_FLAG_W: '' }),
          ),
        }),
      );
      screen.setEquipmentInput('EQP-01');
      await screen.lookupEquipment();
      return screen.recipes.value;
    };
    expect(await make('DES220', '5')).toEqual(['#05']);
    expect(await make('KAIJO', 'A(1)')).toEqual(['A(1)']);
    expect(await make('ETCH', 'A(1)')).toEqual(['A']);
    expect(await make('ETCH', 'X:1,2')).toEqual(['X:1', 'X:2']);
  });

  it('handles RAM8500z port availability and start gating', async () => {
    const readyApi = makeApi({
      fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, EQPTYPE: 'RAM8500z', PORTNAME: '1' })),
      fetchPortStatus: vi.fn(async () => ok({ PORTSTATENAME: 'BUSY', ACKMSG: 'ack' })),
    });
    const { screen } = setup(readyApi);
    screen.setEquipmentInput('EQP-01');
    await screen.lookupEquipment();
    expect(screen.startEnabled.value).toBe(false);
    expect(screen.dialog.value?.title).toBe('경  고');

    const noState = setup(
      makeApi({
        fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, EQPTYPE: 'RAM8500z', PORTNAME: '1' })),
        fetchPortStatus: vi.fn(async () => ok({})),
      }),
    );
    noState.screen.setEquipmentInput('EQP-01');
    await noState.screen.lookupEquipment();
    expect(noState.screen.dialog.value?.message).toContain('PORT 정보를 가져올 수 없습니다.');
  });
});

describe('useRemoteRamco LOT lookup', () => {
  it('validates FRONT input and duplicate rear LOT', async () => {
    const { screen } = setup();
    await screen.searchFrontLot('  ');
    expect(screen.dialog.value?.message).toBe('LOT ID를 입력하세요');
    screen.setRearInput('lot-1');
    await screen.searchFrontLot('lot-1');
    expect(screen.dialog.value?.message).toContain('동일 LOT');
    expect(screen.frontLot.value.lotId).toBe('');
  });

  it('validates REAR lookup order and duplicates', async () => {
    const { screen } = setup();
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toBe('FRONT 진행 LOT 부터 순서대로 조회하시기 바랍니다.');
    await screen.searchFrontLot('lot-1');
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toBe('LOT ID를 입력하세요');
    screen.setRearInput('LOT-1');
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toContain('동일 LOT');
  });

  it.each([
    [{ STATUS: 'RUN' }, '이미 MOVE IN된 LOT입니다.'],
    [{ STATE: 'HOLD' }, 'HOLD 상태 입니다. 자동화 진행이 불가합니다.'],
    [{ HOLDSTATUS: 'ONHOLD' }, 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.'],
    [{ BATCHID: 'B' }, 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.'],
    [{ AREA: 'PHOTO' }, 'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.'],
    [{ LOTRESUSER: 'U' }, '이미 작업 예약되었거나 진행중인 LOT입니다.'],
  ])('rejects invalid LOT %j', async (patch, message) => {
    const { screen } = setup(
      makeApi({ fetchLotInfo: vi.fn(async () => ok({ ...lot, ...patch })) }),
    );
    await screen.searchFrontLot('lot-1');
    expect(screen.dialog.value?.message).toBe(message);
    expect(screen.frontLot.value.operation).toBe('');
  });

  it('shows the service error and unread comment warning for FRONT', async () => {
    const failing = setup(makeApi({ fetchLotInfo: vi.fn(async () => fail('nope')) }));
    await failing.screen.searchFrontLot('lot-1');
    expect(failing.screen.dialog.value?.message).toBe('nope');

    const unread = setup(
      makeApi({ fetchLotInfo: vi.fn(async () => ok({ ...lot, NWCOMMENTQTY: '3' })) }),
    );
    await unread.screen.searchFrontLot('lot-1');
    expect(unread.screen.dialog.value?.message).toContain('[3]');

    const thrown = setup(
      makeApi({
        fetchLotInfo: vi.fn(async () => {
          throw new Error('net');
        }),
      }),
    );
    await thrown.screen.searchFrontLot('lot-1');
    expect(thrown.screen.dialog.value?.message).toBe('net');
  });

  it('checks the REAR recipe against the selected recipe and Q-Time flags', async () => {
    const api = makeApi();
    const { screen } = setup(api);
    screen.setEquipmentInput('EQP-01');
    await screen.lookupEquipment();
    await screen.searchFrontLot('lot-1');
    screen.setRearInput('lot-2');
    await screen.searchRearLot();
    expect(screen.rearLot.value.lotId).toBe('LOT-2');

    vi.mocked(api.fetchRecipeInfo).mockResolvedValueOnce(
      ok({ RECIPE: 'OTHER', POP_MSG: '', QTIME_FLAG: '', QTIME_FLAG_W: '' }),
    );
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toBe('RECIPE가 다른 LOT입니다.');
    expect(screen.rearLot.value.lotId).toBe('');
    expect(screen.startEnabled.value).toBe(false);

    vi.mocked(api.fetchRecipeInfo).mockResolvedValueOnce(fail('rear fail'));
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toBe('rear fail');

    vi.mocked(api.fetchRecipeInfo).mockResolvedValueOnce(ok({ RECIPE: 'RCP-A', QTIME_FLAG: 'Y' }));
    await screen.searchRearLot();
    expect(screen.dialog.value?.title).toBe('Q-Time Over');

    vi.mocked(api.fetchRecipeInfo).mockResolvedValueOnce(
      ok({ RECIPE: 'RCP-A', QTIME_FLAG_W: 'Y' }),
    );
    await screen.searchRearLot();
    expect(screen.dialog.value?.message).toBe('Q-Time 2hr 이내 근접 Lot 입니다');
  });

  it('primes the FRONT LOT from the initial id and legacy helpers', async () => {
    const { screen, api } = setup(makeApi(), 'LOT-9');
    expect(screen.frontLot.value.lotId).toBe('LOT-9');
    screen.setInitialFrontLot('  ');
    expect(api.fetchLotInfo).not.toHaveBeenCalled();
    screen.setInitialFrontLot('lot-9');
    await Promise.resolve();
    expect(api.fetchLotInfo).toHaveBeenCalled();
    expect(screen.getLotRequest('X')).toEqual({ TYPE: 'MVIN', LOTID: 'X', FACILITY: 'FAC' });
    screen.primeFrontLot('LOT-P', lot);
    expect(screen.frontLot.value.product).toBe('P (J)');
  });
});

describe('useRemoteRamco port and job actions', () => {
  async function ultima(overrides: Partial<RemoteRamcoApi> = {}) {
    const base = makeApi({
      fetchEquipmentInfo: vi.fn(async () =>
        ok({ ...eqp, EQPTYPE: 'ULTIMA3', PORTNAME: '1,2', INGRCP: 'R' }),
      ),
      ...overrides,
    });
    const ctx = setup(base);
    ctx.screen.setEquipmentInput('EQP-01-1');
    await ctx.screen.lookupEquipment();
    return ctx;
  }

  it('marks RUN and RESERVED ULTIMA3 ports with a clear action', async () => {
    const { screen } = await ultima({
      fetchPortStatus: vi.fn(async () => ok({ PORTSTATENAME: 'RUN', ACKMSG: 'ack' })),
    });
    expect(screen.clearPortEnabled.value).toBe(true);
    expect(screen.dialog.value?.title).toBe('경  고');
  });

  it('reports a failing port refresh and changePort refreshes', async () => {
    const { screen, api } = await ultima({
      fetchPortStatus: vi.fn(async () => fail('port down')),
    });
    expect(screen.dialog.value?.message).toBe('port down');
    vi.mocked(api.fetchPortStatus).mockResolvedValue(ok({ PORTSTATENAME: 'IDLE' }));
    screen.changePort('2');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.selectedPort.value).toBe('2');
    expect(screen.startEnabled.value).toBe(true);
  });

  it('requires a port before clearing and handles confirm/cancel/error paths', async () => {
    const empty = setup();
    await empty.screen.clearPort();
    expect(empty.screen.dialog.value?.message).toBe('진행 Port를 먼저 선택하세요.');

    const { screen, api } = await ultima();
    const cancelled = screen.clearPort();
    await settleConfirm(screen, false);
    await cancelled;
    expect(api.clearPort).not.toHaveBeenCalled();

    const accepted = screen.clearPort();
    await settleConfirm(screen, true);
    await accepted;
    expect(api.clearPort).toHaveBeenCalledWith({ MACHINENAME: 'EQP-01', PORTNAME: '1' });
    expect(screen.dialog.value?.title).not.toBe('');

    vi.mocked(api.clearPort).mockResolvedValueOnce(fail('clr'));
    const failed = screen.clearPort();
    await settleConfirm(screen, true);
    await failed;
    expect(screen.dialog.value?.message).toBe('clr');

    vi.mocked(api.clearPort).mockRejectedValueOnce(new Error('ex'));
    const thrown = screen.clearPort();
    await settleConfirm(screen, true);
    await thrown;
    expect(screen.dialog.value?.message).toBe('ex');
  });

  it('deletes jobs with validation, confirm, and result branches', async () => {
    const none = setup();
    await none.screen.deleteJobs();
    expect(none.screen.dialog.value?.message).toBe('장비명를 선택하여 주세요.');

    const ult = await ultima();
    await ult.screen.deleteJobs();
    expect(ult.api.cancelJobs).not.toHaveBeenCalled();

    const { screen, api } = setup();
    screen.setEquipmentInput('EQP-01');
    const declined = screen.deleteJobs();
    await settleConfirm(screen, false);
    await declined;
    expect(api.cancelJobs).not.toHaveBeenCalled();

    const run = async (value: ReturnType<typeof ok> | ReturnType<typeof fail> | Error) => {
      if (value instanceof Error) vi.mocked(api.cancelJobs).mockRejectedValueOnce(value);
      else vi.mocked(api.cancelJobs).mockResolvedValueOnce(value as never);
      const pending = screen.deleteJobs();
      await settleConfirm(screen, true);
      await pending;
      return screen.dialog.value?.message;
    };
    expect(await run(ok({ RET: '0' }))).toBe('Job 삭제 요청하였습니다.');
    expect(await run(ok({ RET: '1' }))).toBe('Job 삭제 요청에 실패하였습니다.');
    expect(await run(fail('bad'))).toBe('bad');
    expect(await run(new Error('boom'))).toBe('boom');
  });
});

describe('useRemoteRamco start flow', () => {
  async function ready(type = 'ETCH', port = '') {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () => ok({ ...eqp, EQPTYPE: type, PORTNAME: port })),
    });
    const ctx = setup(api);
    ctx.screen.setEquipmentInput('EQP-01');
    await ctx.screen.lookupEquipment();
    await ctx.screen.searchFrontLot('lot-1');
    return ctx;
  }

  async function startConfirmed(screen: ReturnType<typeof setup>['screen']) {
    const pending = screen.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    screen.resolveDialog(true);
    await pending;
  }

  it('validates in legacy order before sending', async () => {
    const { screen } = setup();
    await screen.start();
    expect(screen.dialog.value?.message).toBe('진행장비를 입력하세요.');
    screen.setEquipmentInput('E');
    await screen.start();
    expect(screen.dialog.value?.message).toBe('진행Rcp가 조회되지 않았습니다.');
    screen.selectedRecipe.value = 'R';
    screen.frontLot.value.lotId = 'L';
    await screen.start();
    expect(screen.dialog.value?.message).toBe('LOT 조회가 정상적으로 이루어 지지 않았습니다.');
  });

  it('blocks start when a LOT has unread comments or the check fails', async () => {
    const { screen, api } = await ready();
    vi.mocked(api.fetchLotInfo).mockResolvedValueOnce(ok({ ...lot, NWCOMMENTQTY: '2' }));
    await screen.start();
    expect(screen.dialog.value?.title).toBe('읽은후 진행하세요.');
    vi.mocked(api.fetchLotInfo).mockResolvedValueOnce(fail('lot fail'));
    await screen.start();
    expect(screen.dialog.value?.message).toBe('lot fail');
  });

  it('does nothing when the recipe confirmation is declined', async () => {
    const { screen, api } = await ready();
    const pending = screen.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    screen.closeRecipeDialogAsLegacyBack();
    await pending;
    expect(api.startRemote).toHaveBeenCalledTimes(1);
    const declined = screen.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    screen.resolveDialog(false);
    await declined;
    expect(api.startRemote).toHaveBeenCalledTimes(1);
  });

  it('computes the cassette count per equipment type and completes', async () => {
    const etch = await ready();
    await startConfirmed(etch.screen);
    expect(etch.api.startRemote).toHaveBeenCalledWith(expect.objectContaining({ NUMCASS: '1' }));
    expect(etch.onCompleted).toHaveBeenCalled();

    const des = await ready('DES220');
    await startConfirmed(des.screen);
    expect(des.api.startRemote).toHaveBeenCalledWith(expect.objectContaining({ NUMCASS: '1' }));

    const ult = await ready('ULTIMA3', '1,2');
    await startConfirmed(ult.screen);
    expect(ult.api.startRemote).toHaveBeenCalledWith(expect.objectContaining({ NUMCASS: '1' }));

    const ram = await ready('RAM8500z', '3,4');
    ram.screen.startEnabled.value = true;
    await startConfirmed(ram.screen);
    expect(ram.api.startRemote).toHaveBeenCalledWith(
      expect.objectContaining({ NUMCASS: 'PORT34' }),
    );
    ram.screen.selectedPort.value = '1';
    await startConfirmed(ram.screen);
    expect(ram.api.startRemote).toHaveBeenLastCalledWith(
      expect.objectContaining({ NUMCASS: 'PORT12' }),
    );

    const ramNoPort = await ready('RAM8500z', '');
    ramNoPort.screen.setRearInput('lot-2');
    ramNoPort.screen.rearLot.value = { ...ramNoPort.screen.frontLot.value, lotId: 'LOT-2' };
    await startConfirmed(ramNoPort.screen);
    expect(ramNoPort.api.startRemote).toHaveBeenCalledWith(
      expect.objectContaining({ NUMCASS: '12' }),
    );
    ramNoPort.screen.setRearInput('');
    ramNoPort.screen.rearLot.value = { ...ramNoPort.screen.rearLot.value, operation: '' };
    await startConfirmed(ramNoPort.screen);
    expect(ramNoPort.api.startRemote).toHaveBeenLastCalledWith(
      expect.objectContaining({ NUMCASS: '1' }),
    );
  });

  it('uses the REAR cassette count for non-RAM types', async () => {
    const { screen, api } = await ready();
    screen.setRearInput('lot-2');
    await screen.searchRearLot();
    await startConfirmed(screen);
    expect(api.startRemote).toHaveBeenCalledWith(expect.objectContaining({ NUMCASS: '3' }));
  });

  it('shows start failures and vibrates when available', async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    const { screen, api } = await ready();
    vi.mocked(api.startRemote).mockResolvedValueOnce(fail('start fail'));
    await startConfirmed(screen);
    expect(screen.dialog.value?.message).toBe('start fail');
    expect(vibrate).toHaveBeenCalledWith(1000);

    vibrate.mockImplementationOnce(() => {
      throw new Error('denied');
    });
    vi.mocked(api.startRemote).mockRejectedValueOnce(new Error('ex'));
    await startConfirmed(screen);
    expect(screen.dialog.value?.message).toBe('ex');
    Reflect.deleteProperty(navigator, 'vibrate');
  });
});

describe('useRemoteRamco dialogs, comments and session state', () => {
  it('opens comments only for LOTs with an operation and forwards cancel', async () => {
    const { screen, onOpenComment, onCancel } = setup();
    screen.openComment(screen.frontLot.value);
    expect(onOpenComment).not.toHaveBeenCalled();
    await screen.searchFrontLot('lot-1');
    screen.openComment(screen.frontLot.value);
    expect(onOpenComment).toHaveBeenCalledWith(expect.objectContaining({ LOTID: 'LOT-1' }));
    screen.cancel();
    expect(onCancel).toHaveBeenCalled();
  });

  it('only closes info dialogs via closeInfo', () => {
    const { screen } = setup();
    screen.showInfo('m');
    screen.closeInfo();
    expect(screen.dialog.value).toBeUndefined();
    screen.dialog.value = { title: 't', message: 'm', kind: 'confirm' };
    screen.closeInfo();
    expect(screen.dialog.value).toBeDefined();
  });

  it('resets state with setApi and rejects a pending confirmation', async () => {
    const { screen } = setup();
    screen.setEquipmentInput('e');
    const pending = screen.deleteJobs();
    await Promise.resolve();
    screen.setApi(makeApi());
    expect(await pending).toBeUndefined();
    expect(screen.equipmentInput.value).toBe('');
    screen.setApi();
    expect(screen.dialog.value).toBeUndefined();
  });

  it('syncs comment counts for a side and ignores errors', async () => {
    const api = makeApi();
    const { screen } = setup(api);
    await screen.syncLotComment('rear');
    expect(api.fetchLotInfo).not.toHaveBeenCalled();
    await screen.searchFrontLot('lot-1');
    vi.mocked(api.fetchLotInfo).mockResolvedValueOnce(
      ok({ ...lot, COMMENTQTY: '9', NWCOMMENTQTY: '1' }),
    );
    await screen.syncLotComment('front');
    expect(screen.frontLot.value.commentQty).toBe('9');
    vi.mocked(api.fetchLotInfo).mockResolvedValueOnce(fail('x'));
    await screen.syncLotComment('front');
    vi.mocked(api.fetchLotInfo).mockRejectedValueOnce(new Error('x'));
    await screen.syncLotComment('front');
    expect(screen.frontLot.value.commentQty).toBe('9');
  });

  it('round-trips session state, including empty restores', async () => {
    const { screen } = setup();
    screen.setEquipmentInput('eqp');
    await screen.searchFrontLot('lot-1');
    const dump = screen.dumpSessionState('front');
    const other = setup().screen;
    other.restoreSessionState(dump);
    expect(other.equipmentInput.value).toBe('EQP');
    expect(other.frontLot.value.lotId).toBe('LOT-1');
    other.restoreSessionState({});
    expect(other.equipmentInput.value).toBe('');
    other.restoreSessionState(undefined as never);
    expect(other.frontLot.value.lotId).toBe('LOT-1');
  });
});

describe('useRemoteRamco sparse service responses', () => {
  it('falls back to empty strings when optional response fields are missing', async () => {
    const api = makeApi({
      fetchEquipmentInfo: vi.fn(async () => ok({ PCOUNT: 'Y' } as WetRemoteEqpInfoResponse)),
      fetchLotInfo: vi.fn(async () => ok({ STATE: 'WIP' } as LotInfoResponse)),
      fetchRecipeInfo: vi.fn(async () => ok({})),
      fetchPortStatus: vi.fn(async () => ok({})),
    });
    const { screen } = setup(api);
    screen.setEquipmentInput('eqp-01');
    await screen.lookupEquipment();
    await screen.searchFrontLot('lot-1');
    expect(screen.frontLot.value).toMatchObject({ quantity: '', operationCode: '', opType: '' });
    expect(screen.recipes.value).toEqual([]);
    screen.setRearInput('lot-2');
    await screen.searchRearLot();
    expect(screen.rearLot.value.lotId).toBe('LOT-2');
    screen.selectedRecipe.value = 'R';
    const started = screen.start();
    await settleConfirm(screen, false);
    await started;
    await screen.syncLotComment('front');
    expect(screen.frontLot.value.commentQty).toBe('');
    await screen.refreshPortState();
    screen.selectedPort.value = 'P';
    await screen.refreshPortState();
    expect(screen.portState.value).toBe('');
  });

  it('treats a non-numeric NWCOMMENTQTY as zero and covers DES220 cassette fallback', async () => {
    const { screen } = setup(
      makeApi({
        fetchEquipmentInfo: vi.fn(async () =>
          ok({ MAINEQPID: 'E', PCOUNT: 'Y', EQPTYPE: 'DES220' } as WetRemoteEqpInfoResponse),
        ),
        fetchLotInfo: vi.fn(async () => ok({ ...lot, NWCOMMENTQTY: 'abc' })),
      }),
    );
    screen.setEquipmentInput('eqp-01');
    await screen.lookupEquipment();
    await screen.searchFrontLot('lot-1');
    expect(screen.dialog.value?.message ?? '').not.toContain('읽지 않은');
    const pending = screen.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    screen.resolveDialog(true);
    await pending;
  });
});

describe('useRemoteRamcoStore session state', () => {
  it('saves, consumes once, and tolerates corrupt storage', () => {
    setActivePinia(createPinia());
    const store = useRemoteRamcoStore();
    expect(store.consumeSessionState()).toBeNull();
    store.saveSessionState({ equipmentInput: 'E' } as never);
    expect(store.consumeSessionState()).toEqual({ equipmentInput: 'E' });
    expect(store.consumeSessionState()).toBeNull();
    window.sessionStorage.setItem('hf_remote_ramco_session', '{bad');
    expect(store.consumeSessionState()).toBeNull();
    store.setReturnLotId('L');
    expect(store.consumeReturnLotId()).toBe('L');
    expect(store.consumeReturnLotId()).toBe('');
  });
});
