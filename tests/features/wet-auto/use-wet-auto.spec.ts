import { useWetAuto } from 'src/features/wet-auto/composables/use-wet-auto';
import type {
  WetAutoApi,
  WetAutoApiResult,
  WetAutoLotResponse,
} from 'src/features/wet-auto/types/wet-auto.types';
import { describe, expect, it, vi } from 'vitest';

const validLot: WetAutoLotResponse = {
  PRODUCT: 'PRODUCT-A',
  JOBCODE: 'JOB-A',
  OPERATION: 'OP-A',
  SUBOPERATION: '010',
  PROCESSSTEP: 'STEP-A',
  OPERSEQUENCE: '003',
  OPTYPE: 'WET',
  QUANTITY: '24',
  STATE: 'WIP',
  STATUS: '',
  HOLDSTATUS: '',
  BATCHID: '',
  AREA: 'WET',
  LOTRESUSER: '',
  NWCOMMENTQTY: '0',
};

function success<T>(data: T): WetAutoApiResult<T> {
  return { ok: true, data };
}

function failure(message: string): WetAutoApiResult<never> {
  return { ok: false, message };
}

function makeApi(overrides: Partial<WetAutoApi> = {}): WetAutoApi {
  return {
    fetchEquipment: vi.fn(async () =>
      success({
        MAINEQPID: 'EQP-MAIN',
        JOBID: 'JOB-01',
        PCOUNT: 'Y',
        EQPTYPE: 'WET-TYPE',
        EQPAREA: 'WET-AREA',
      }),
    ),
    fetchLot: vi.fn(async () => success({ ...validLot })),
    fetchRecipe: vi.fn(async () => success({ RECIPE: 'RCP-01 (RUN-01)' })),
    fetchBays: vi.fn(async () =>
      success({ BAYS: { ITEM: [{ BAY: 'BAY-01' }, { BAY: 'BAY-02' }] } }),
    ),
    fetchStockers: vi.fn(async () =>
      success({ STOCKERS: { ITEM: [{ STOCKER: 'STK-01' }, { STOCKER: 'STK-02' }] } }),
    ),
    start: vi.fn(async () => success(null)),
    ...overrides,
  };
}

function makeScreen(api = makeApi()) {
  const onOpenComment = vi.fn();
  const onCancel = vi.fn();
  const onCompleted = vi.fn();
  const screen = useWetAuto({
    api,
    facility: 'FAC-01',
    operatorId: 'USER-01',
    onOpenComment,
    onCancel,
    onCompleted,
  });
  return { screen, api, onOpenComment, onCancel, onCompleted };
}

async function loadFront(screen: ReturnType<typeof useWetAuto>) {
  screen.setMachineInput('wet-eqp-01');
  await screen.lookupEquipment();
  screen.setFrontInput('lot-front');
  await screen.lookupFrontLot();
}

describe('useWetAuto', () => {
  it('starts with Android control enablement and sends no equipment request for empty input', async () => {
    const { screen, api } = makeScreen();
    expect(screen.startEnabled.value).toBe(true);
    expect(screen.dumpSessionState().equipment).toBeUndefined();
    expect(screen.bayEnabled.value).toBe(true);
    expect(screen.stockerEnabled.value).toBe(true);
    expect(screen.carryEnabled.value).toBe(false);
    expect(screen.frontLotEnabled.value).toBe(false);

    await screen.lookupEquipment();
    expect(api.fetchEquipment).not.toHaveBeenCalled();
    expect(screen.dialog.value?.message).toBe('장비명을 입력하여 주세요.');
  });

  it('maps thrown equipment and LOT requests to Android error dialogs', async () => {
    const equipmentApi = makeApi({
      fetchEquipment: vi.fn().mockRejectedValue(new Error('equipment transport error')),
    });
    const { screen: equipmentScreen } = makeScreen(equipmentApi);
    equipmentScreen.setMachineInput('EQP-01');
    await equipmentScreen.lookupEquipment();
    expect(equipmentScreen.dialog.value?.message).toBe('equipment transport error');
    expect(equipmentScreen.loading.value).toBe(false);

    const lotApi = makeApi({ fetchLot: vi.fn().mockRejectedValue('lot transport error') });
    const { screen: lotScreen } = makeScreen(lotApi);
    lotScreen.setFrontInput('LOT-01');
    await lotScreen.lookupFrontLot();
    expect(lotScreen.dialog.value?.message).toBe('Request failed.');
    expect(lotScreen.loading.value).toBe(false);
  });

  it('shows LOTINFO failures without populating LOT display values', async () => {
    const api = makeApi({ fetchLot: vi.fn(async () => failure('lot lookup failed')) });
    const { screen } = makeScreen(api);
    screen.setFrontInput('LOT-01');
    await screen.lookupFrontLot();
    expect(screen.dialog.value?.message).toBe('lot lookup failed');
    expect(screen.frontLot.value.product).toBe('');
    expect(api.fetchRecipe).not.toHaveBeenCalled();
  });

  it('uses empty defaults when equipment, LOT, and recipe responses omit optional fields', async () => {
    const api = makeApi({
      fetchEquipment: vi.fn(async () => success({})),
      fetchLot: vi.fn(async () => success({ STATE: 'WIP' })),
      fetchRecipe: vi.fn(async () => success({})),
    });
    const { screen } = makeScreen(api);
    screen.setMachineInput('EQP-01');
    await screen.lookupEquipment();
    expect(screen.reservationTime.value).toBe('');
    screen.setFrontInput('LOT-01');
    await screen.lookupFrontLot();
    expect(api.fetchRecipe).toHaveBeenCalledWith({
      ISPHOTO: 'N',
      LOTID: 'LOT-01',
      OPERATION: '',
      SUBOPERATION: '',
      PRODUCT: ' ()',
      EQPID: '',
      OPTYPE: '',
      FACILITY: 'FAC-01',
    });
    expect(screen.frontLot.value).toMatchObject({
      product: ' ()',
      operation: '-',
      quantity: '',
      processStep: '',
      operSequence: '',
    });
    expect(screen.recipe.value).toBe('');
    expect(screen.rearLotEnabled.value).toBe(true);
  });

  it('clears equipment-dependent data but preserves stale enabled flags after failed repeated lookup', async () => {
    const api = makeApi({
      fetchEquipment: vi
        .fn()
        .mockResolvedValueOnce(
          success({ MAINEQPID: 'MAIN', JOBID: 'JOB', EQPTYPE: 'WET', EQPAREA: 'AREA' }),
        )
        .mockResolvedValueOnce(failure('equipment failure')),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    expect(screen.recipe.value).toBe('RCP-01 ');
    expect(screen.frontCommentEnabled.value).toBe(true);
    expect(screen.rearLotEnabled.value).toBe(true);

    await screen.lookupEquipment();
    expect(screen.equipment.value).toBeUndefined();
    expect(screen.reservationTime.value).toBe('');
    expect(screen.frontInput.value).toBe('');
    expect(screen.recipe.value).toBe('');
    expect(screen.frontLotEnabled.value).toBe(true);
    expect(screen.frontCommentEnabled.value).toBe(true);
    expect(screen.carryEnabled.value).toBe(true);
    expect(screen.rearLotEnabled.value).toBe(false);
    expect(screen.dialog.value?.message).toBe('equipment failure');
  });

  it('keeps both equipment warnings observable in order while PCOUNT N remains usable', async () => {
    const { screen } = makeScreen(
      makeApi({
        fetchEquipment: vi.fn(async () =>
          success({
            MAINEQPID: 'MAIN',
            JOBID: 'JOB',
            EQPTYPE: 'WET',
            EQPAREA: 'AREA',
            PMMESSAGE: 'PM warning',
            PCOUNT: 'N',
          }),
        ),
      }),
    );
    screen.setMachineInput('eqp');
    await screen.lookupEquipment();
    expect(screen.dialog.value?.message).toBe('PM warning');
    screen.closeInfo();
    expect(screen.dialog.value?.message).toBe('진행가능한 JOB 수량을 초과하여 진행이 불가합니다.');
    expect(screen.frontLotEnabled.value).toBe(true);
    expect(screen.carryEnabled.value).toBe(true);
  });

  it('normalizes text inputs to uppercase and blocks equal empty FRONT/REAR before LOTINFO', async () => {
    const { screen, api } = makeScreen();
    screen.setMachineInput('wet-a');
    screen.setFrontInput('lot-a');
    screen.setRearInput('lot-a');
    expect(screen.machineInput.value).toBe('WET-A');
    expect(screen.frontInput.value).toBe('LOT-A');
    await screen.lookupFrontLot();
    expect(api.fetchLot).not.toHaveBeenCalled();
    expect(screen.dialog.value?.message).toBe(
      '동일 LOT으로 조회가 불가합니다.\nLOTNAME을 다시 확인해 주시기 바랍니다.',
    );
  });

  it.each([
    ['RUN', 'WIP', '', '', '', '', '이미 MOVE IN된 LOT입니다.'],
    ['', 'WAIT', '', '', '', '', 'WAIT 상태 입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', 'ONHOLD', '', '', '', 'HOLD된 LOT입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', '', 'BATCH-01', '', '', 'BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다.'],
    ['', 'WIP', '', '', 'PHOTO', '', 'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.'],
    ['', 'WIP', '', '', '', 'USER-01', '이미 작업 예약되었거나 진행중인 LOT입니다.'],
  ])(
    'validates LOT fields in Android order: %s/%s',
    async (status, state, hold, batch, area, reserved, message) => {
      const api = makeApi({
        fetchLot: vi.fn(async () =>
          success({
            ...validLot,
            STATUS: status,
            STATE: state,
            HOLDSTATUS: hold,
            BATCHID: batch,
            AREA: area,
            LOTRESUSER: reserved,
          }),
        ),
      });
      const { screen } = makeScreen(api);
      screen.setFrontInput('LOT-01');
      await screen.lookupFrontLot();
      expect(screen.dialog.value?.message).toBe(message);
      expect(screen.frontLot.value.product).toBe('');
      expect(api.fetchRecipe).not.toHaveBeenCalled();
    },
  );

  it('maps accepted FRONT data and requests RECIPEINFO with cached equipment and formatted product', async () => {
    const { screen, api } = makeScreen();
    await loadFront(screen);
    expect(api.fetchLot).toHaveBeenCalledWith({
      TYPE: 'MVIN',
      LOTID: 'LOT-FRONT',
      FACILITY: 'FAC-01',
    });
    expect(api.fetchRecipe).toHaveBeenCalledWith({
      ISPHOTO: 'N',
      LOTID: 'LOT-FRONT',
      OPERATION: 'OP-A',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT-A (JOB-A)',
      EQPID: 'EQP-MAIN',
      OPTYPE: 'WET',
      FACILITY: 'FAC-01',
    });
    expect(screen.frontLot.value).toMatchObject({
      product: 'PRODUCT-A (JOB-A)',
      operation: 'OP-A-010',
      quantity: '24',
      operSequence: '003',
    });
    expect(screen.recipe.value).toBe('RCP-01 ');
    expect(screen.rearLotEnabled.value).toBe(true);
    expect(screen.focusTarget.value).toBe('rear');
  });

  it('keeps a recipe without a parenthetical suffix unchanged', async () => {
    const api = makeApi({ fetchRecipe: vi.fn(async () => success({ RECIPE: 'RCP-PLAIN' })) });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    expect(screen.recipe.value).toBe('RCP-PLAIN');
  });

  it('clears FRONT display on recipe failure but retains cached LOT metadata', async () => {
    const api = makeApi({ fetchRecipe: vi.fn(async () => failure('recipe failure')) });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    expect(screen.frontLot.value.product).toBe('');
    expect(screen.frontLot.value.operation).toBe('');
    expect(screen.frontLot.value.operationCode).toBe('OP-A');
    expect(screen.frontLot.value.processStep).toBe('STEP-A');
    expect(screen.startEnabled.value).toBe(false);
    expect(screen.focusTarget.value).toBe('front');
  });

  it('checks REAR guards in order and keeps the accepted FRONT untouched', async () => {
    const { screen, api } = makeScreen();
    screen.setRearInput('');
    await screen.lookupRearLot();
    expect(screen.dialog.value?.message).toBe('FRONT 진행 LOT 부터 순서대로 조회하시기 바랍니다.');
    expect(api.fetchLot).not.toHaveBeenCalled();
    screen.closeInfo();

    screen.setFrontInput('LOT-FRONT');
    await screen.lookupRearLot();
    expect(screen.dialog.value?.message).toBe('LOT ID를 입력하세요');
    expect(api.fetchLot).not.toHaveBeenCalled();
    screen.closeInfo();

    screen.setRearInput('LOT-FRONT');
    await screen.lookupRearLot();
    expect(screen.dialog.value?.message).toContain('동일 LOT으로 조회가 불가합니다.');
    expect(api.fetchLot).not.toHaveBeenCalled();
  });

  it('uses the raw machine text for REAR recipe lookup and preserves mismatch metadata', async () => {
    const api = makeApi({
      fetchRecipe: vi
        .fn()
        .mockResolvedValueOnce(success({ RECIPE: 'RCP-01 (RUN-01)' }))
        .mockResolvedValueOnce(success({ RECIPE: 'OTHER-RCP' })),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    await screen.lookupRearLot();
    expect(api.fetchRecipe).toHaveBeenLastCalledWith({
      ISPHOTO: 'N',
      LOTID: 'LOT-REAR',
      OPERATION: 'OP-A',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT-A (JOB-A)',
      EQPID: 'WET-EQP-01',
      OPTYPE: 'WET',
      FACILITY: 'FAC-01',
    });
    expect(screen.dialog.value?.message).toBe('RECIPE가 다른 LOT입니다.');
    expect(screen.rearLot.value.product).toBe('');
    expect(screen.rearLot.value.operationCode).toBe('OP-A');
    expect(screen.startEnabled.value).toBe(false);
    expect(screen.focusTarget.value).toBe('rear');
  });

  it('clears REAR display and disables START when RECIPEINFO fails', async () => {
    const api = makeApi({
      fetchRecipe: vi
        .fn()
        .mockResolvedValueOnce(success({ RECIPE: 'RCP-01' }))
        .mockResolvedValueOnce(failure('rear recipe error')),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    await screen.lookupRearLot();
    expect(screen.dialog.value?.message).toBe('rear recipe error');
    expect(screen.rearLot.value.product).toBe('');
    expect(screen.rearLot.value.operationCode).toBe('OP-A');
    expect(screen.startEnabled.value).toBe(false);
    expect(screen.focusTarget.value).toBe('rear');
  });

  it('retains accepted REAR metadata when a later FRONT LOTINFO request fails', async () => {
    const api = makeApi({
      fetchLot: vi
        .fn()
        .mockResolvedValueOnce(success({ ...validLot }))
        .mockResolvedValueOnce(success({ ...validLot }))
        .mockResolvedValueOnce(failure('front refresh failed')),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    await screen.lookupRearLot();
    expect(screen.rearLot.value.product).toBe('PRODUCT-A (JOB-A)');

    screen.setFrontInput('LOT-FRONT-NEW');
    await screen.lookupFrontLot();
    expect(screen.dialog.value?.message).toBe('front refresh failed');
    expect(screen.rearInput.value).toBe('LOT-REAR');
    expect(screen.rearLot.value.product).toBe('PRODUCT-A (JOB-A)');
    expect(screen.rearLot.value.operationCode).toBe('OP-A');
  });

  it('accepts same REAR recipe and displays the unread-comment warning without rejecting LOT state', async () => {
    const api = makeApi({
      fetchLot: vi.fn(async () => success({ ...validLot, NWCOMMENTQTY: '2' })),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    expect(screen.frontLot.value.quantity).toBe('24');
    expect(screen.dialog.value?.message).toContain('읽지 않은 작업성 COMMENT가 [2]');
    screen.closeInfo();
    expect(screen.dialog.value).toBeUndefined();
    expect(screen.startEnabled.value).toBe(true);
    expect(screen.frontCommentEnabled.value).toBe(true);
  });

  it('does not treat malformed unread-comment counts as zero during lookup or START recheck', async () => {
    const api = makeApi({
      fetchLot: vi
        .fn()
        .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: 'not-a-number' }))
        .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: 'not-a-number' })),
    });
    const { screen } = makeScreen(api);

    screen.setMachineInput('WET-EQP-01');
    await screen.lookupEquipment();
    screen.setFrontInput('LOT-FRONT');
    await screen.lookupFrontLot();
    expect(screen.dialog.value?.message).toBe('Invalid integer: not-a-number');
    expect(api.fetchRecipe).not.toHaveBeenCalled();
    screen.closeInfo();

    screen.recipe.value = 'RCP-READY';
    await screen.start();
    expect(screen.dialog.value?.message).toBe('Invalid integer: not-a-number');
    expect(screen.recipeConfirmationOpen.value).toBe(false);
  });

  it('loads dependent BAY/STK lists, restores cached selections and disables them on uncheck', async () => {
    const { screen, api } = makeScreen();
    await screen.setCarry(true);
    expect(screen.bayOptions.value).toEqual(['BAY-01', 'BAY-02']);
    await screen.setBay('BAY-01');
    expect(api.fetchStockers).toHaveBeenCalledWith({ BAY: 'BAY-01', FACILITY: 'FAC-01' });
    expect(screen.stockerOptions.value).toEqual(['STK-01', 'STK-02']);
    screen.selectedStocker.value = 'STK-02';
    await screen.setCarry(false);
    expect(screen.bayEnabled.value).toBe(false);
    expect(screen.stockerEnabled.value).toBe(false);
    await screen.setCarry(true);
    expect(screen.selectedBay.value).toBe('BAY-01');
    expect(screen.selectedStocker.value).toBe('STK-02');
  });

  it('reports BAY and STOCKER failures without inventing options', async () => {
    const api = makeApi({
      fetchBays: vi.fn(async () => failure('bay failure')),
      fetchStockers: vi.fn(async () => failure('stocker failure')),
    });
    const { screen } = makeScreen(api);
    await screen.setCarry(true);
    expect(screen.bayOptions.value).toEqual([]);
    expect(screen.dialog.value?.message).toBe('bay failure');
    screen.closeInfo();
    await screen.setBay('BAY-01');
    expect(screen.dialog.value?.message).toBe('stocker failure');
  });

  it('handles thrown carry requests and an empty BAY selection', async () => {
    const api = makeApi({
      fetchBays: vi.fn().mockRejectedValue(new Error('bay transport error')),
      fetchStockers: vi.fn().mockRejectedValue('stocker transport error'),
    });
    const { screen } = makeScreen(api);
    await screen.setCarry(true);
    expect(screen.dialog.value?.message).toBe('bay transport error');
    expect(screen.loading.value).toBe(false);
    screen.closeInfo();

    await screen.setBay('');
    expect(api.fetchStockers).not.toHaveBeenCalled();
    await screen.setBay('BAY-01');
    expect(screen.dialog.value?.message).toBe('Request failed.');
    expect(screen.loading.value).toBe(false);
  });

  it('filters missing and empty entries from nested BAY and STOCKER responses', async () => {
    const api = makeApi({
      fetchBays: vi.fn(async () =>
        success({ BAYS: { ITEM: [{}, { BAY: '' }, { BAY: 'BAY-01' }] } }),
      ),
      fetchStockers: vi.fn(async () =>
        success({ STOCKERS: { ITEM: [{}, { STOCKER: '' }, { STOCKER: 'STK-01' }] } }),
      ),
    });
    const { screen } = makeScreen(api);
    await screen.setCarry(true);
    expect(screen.bayOptions.value).toEqual(['BAY-01']);
    await screen.setBay('BAY-01');
    expect(screen.stockerOptions.value).toEqual(['STK-01']);

    const missingLists = makeScreen(
      makeApi({
        fetchBays: vi.fn(async () => success({})),
        fetchStockers: vi.fn(async () => success({})),
      }),
    ).screen;
    await missingLists.setCarry(true);
    expect(missingLists.bayOptions.value).toEqual([]);
    await missingLists.setBay('BAY-01');
    expect(missingLists.stockerOptions.value).toEqual([]);
  });

  it.each([
    ['', 'RCP', '', '진행장비를 입력하세요.'],
    ['EQP', '', '', '진행Rcp가 조회되지 않았습니다.'],
    ['EQP', 'RCP', 'LOT', 'LOT 조회가 정상적으로 이루어 지지 않았습니다.'],
  ])(
    'uses the START validation order for machine/recipe/LOT: %s/%s/%s',
    async (machine, rcp, lot, message) => {
      const { screen } = makeScreen();
      screen.setMachineInput(machine);
      screen.recipe.value = rcp;
      screen.setFrontInput(lot);
      await screen.start();
      expect(screen.dialog.value?.message).toBe(message);
      expect(screen.recipeConfirmationOpen.value).toBe(false);
    },
  );

  it('checks FRONT comments before REAR and blocks unread comments with exact dialog text', async () => {
    const api = makeApi({
      fetchLot: vi.fn(async (_request) => success({ ...validLot, NWCOMMENTQTY: '1' })),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    screen.closeInfo();
    screen.setRearInput('LOT-REAR');
    screen.rearLot.value.operation = 'OP-B-010';
    await screen.start();
    expect(screen.dialog.value).toEqual({
      title: '읽은후 진행하세요.',
      message: 'LOT[ LOT-FRONT]에 읽지 않은 작업성 COMMENT가 [1]가 있습니다.',
    });
    expect(api.fetchLot).toHaveBeenCalledTimes(2);
    expect(screen.recipeConfirmationOpen.value).toBe(false);
  });

  it('blocks START and shows the server error when the comment recheck fails', async () => {
    const api = makeApi({
      fetchLot: vi
        .fn()
        .mockResolvedValueOnce(success({ ...validLot }))
        .mockResolvedValueOnce(failure('comment recheck error')),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    await screen.start();
    expect(screen.dialog.value?.message).toBe('comment recheck error');
    expect(screen.recipeConfirmationOpen.value).toBe(false);
  });

  it('blocks START when the FRONT comment recheck throws', async () => {
    const api = makeApi({
      fetchLot: vi
        .fn()
        .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: '' }))
        .mockRejectedValueOnce(new Error('comment transport error')),
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    await screen.start();
    expect(screen.dialog.value?.message).toBe('comment transport error');
    expect(screen.recipeConfirmationOpen.value).toBe(false);
  });

  it('checks REAR comments only after FRONT comments pass', async () => {
    const fetchLot = vi
      .fn()
      .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: '0' }))
      .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: '0' }))
      .mockResolvedValueOnce(success({ ...validLot, NWCOMMENTQTY: '2' }));
    const api = makeApi({
      fetchLot,
    });
    const { screen } = makeScreen(api);
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    screen.rearLot.value.operation = 'OP-A-010';
    await screen.start();
    expect(fetchLot.mock.calls.slice(-2).map(([request]) => request.LOTID)).toEqual([
      'LOT-FRONT',
      'LOT-REAR',
    ]);
    expect(screen.dialog.value?.message).toBe(
      'LOT[ LOT-REAR]에 읽지 않은 작업성 COMMENT가 [2]가 있습니다.',
    );
    expect(screen.recipeConfirmationOpen.value).toBe(false);
  });

  it('requires BAY then STOCKER only when carry is checked', async () => {
    const { screen, api } = makeScreen();
    screen.setMachineInput('EQP-01');
    screen.recipe.value = 'RCP-01';
    await screen.start();
    expect(screen.recipeConfirmationOpen.value).toBe(true);
    await screen.confirmRecipe(false);

    await screen.setCarry(true);
    await screen.start();
    expect(screen.dialog.value?.message).toBe('BAY를 선택하세요.');
    screen.closeInfo();
    screen.selectedBay.value = 'BAY-01';
    await screen.start();
    expect(screen.dialog.value?.message).toBe('STOCKER를 선택하세요.');
    expect(api.fetchLot).not.toHaveBeenCalled();
  });

  it('sends exact one/two cassette start values and routes success or retains failure', async () => {
    const api = makeApi();
    const { screen, onCompleted } = makeScreen(api);
    await loadFront(screen);
    await screen.start();
    expect(screen.recipeConfirmationOpen.value).toBe(true);
    await screen.confirmRecipe(true);
    expect(api.start).toHaveBeenCalledWith({
      MACHINENAME: 'EQP-MAIN',
      MACHINENAME2: 'WET-EQP-01',
      MACHINETYPE: 'WET-TYPE',
      AREANAME: 'WET-AREA',
      NUMCASS: '1',
      LOTNAME: 'LOT-FRONT',
      LOTNAME2: '',
      RECIPENAME: 'RCP-01 ',
      JOBNAME: 'JOB-01',
      PRODUCTQTY: '24',
      PRODUCTQTY2: '',
      OPERATION: 'OP-A-010',
      OPERATION2: '',
      EVENTUSER: 'USER-01',
      ISCARRAY: 'N',
      BAY: '',
      STOCKER: '',
    });
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  it('sends carry selection and keeps the screen open when start fails', async () => {
    const api = makeApi({ start: vi.fn(async () => failure('start failure')) });
    const { screen, onCompleted } = makeScreen(api);
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    screen.rearLot.value = {
      ...screen.frontLot.value,
      operation: 'OP-A-010',
      operationCode: 'OP-A',
      quantity: '18',
    };
    await screen.setCarry(true);
    await screen.setBay('BAY-02');
    screen.selectedStocker.value = 'STK-02';
    await screen.start();
    await screen.confirmRecipe(true);
    expect(api.start).toHaveBeenCalledWith(
      expect.objectContaining({
        NUMCASS: '2',
        LOTNAME2: 'LOT-REAR',
        PRODUCTQTY2: '18',
        ISCARRAY: 'Y',
        BAY: 'BAY-02',
        STOCKER: 'STK-02',
      }),
    );
    expect(onCompleted).not.toHaveBeenCalled();
    expect(screen.dialog.value?.message).toBe('start failure');
  });

  it('converts a thrown START request into a visible failure', async () => {
    const api = makeApi({ start: vi.fn().mockRejectedValue('start transport error') });
    const { screen, onCompleted } = makeScreen(api);
    screen.setMachineInput('EQP-01');
    screen.recipe.value = 'RCP-01';
    await screen.start();
    await screen.confirmRecipe(true);
    expect(screen.dialog.value?.message).toBe('Request failed.');
    expect(onCompleted).not.toHaveBeenCalled();
    expect(screen.loading.value).toBe(false);
  });

  it('passes cached comment metadata and invokes cancel', async () => {
    const { screen, onOpenComment, onCancel } = makeScreen();
    await loadFront(screen);
    screen.openComment('front');
    screen.cancel();
    expect(onOpenComment).toHaveBeenCalledWith({
      LOTID: 'LOT-FRONT',
      OPERATION: 'OP-A',
      SUBOPERATION: '010',
      PROCESSSTEP: 'STEP-A',
      OPERSEQUENCE: '003',
    });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('restores the parent screen values and enabled state from its navigation snapshot', async () => {
    const { screen } = makeScreen();
    await loadFront(screen);
    screen.setRearInput('LOT-REAR');
    screen.selectedBay.value = 'BAY-01';
    screen.selectedStocker.value = 'STK-01';

    const snapshot = screen.dumpSessionState();
    const { screen: resumed } = makeScreen();
    resumed.restoreSessionState(snapshot);

    expect(resumed.machineInput.value).toBe('WET-EQP-01');
    expect(resumed.frontInput.value).toBe('LOT-FRONT');
    expect(resumed.rearInput.value).toBe('LOT-REAR');
    expect(resumed.frontLot.value.product).toBe('PRODUCT-A (JOB-A)');
    expect(resumed.recipe.value).toBe('RCP-01 ');
    expect(resumed.selectedBay.value).toBe('BAY-01');
    expect(resumed.selectedStocker.value).toBe('STK-01');
    expect(resumed.rearLotEnabled.value).toBe(true);
    expect(resumed.loading.value).toBe(false);
  });
});
