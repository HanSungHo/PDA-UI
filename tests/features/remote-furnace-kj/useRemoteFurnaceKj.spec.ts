import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { createRemoteFurnaceKjMockApi } from 'src/features/remote-furnace-kj';
import { useRemoteFurnaceKj } from 'src/features/remote-furnace-kj/composables/useRemoteFurnaceKj';
import { okDialog } from 'src/services/ok-dialog.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useRemoteFurnaceKj', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useMainStore().$patch({ operatorId: 'OP-01', operatorName: 'Operator One', facility: 'FAB-A' });
  });

  it('loads supplied LOT and filtered batch rows, but keeps no-LOT mode out of LOT lookup', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });

    await flow.initialize();

    expect(flow.dummyMode.value).toBe('F');
    expect(flow.lotInfo.value?.LOTID).toBe('LOT-KJ-001');
    expect(flow.batchRows.value).toHaveLength(1);
    expect(flow.batchId.value).toBe('BATCH-KJ-01');

    const noLotApi = createRemoteFurnaceKjMockApi('no-lot');
    const noLotFlow = useRemoteFurnaceKj({ api: noLotApi });
    await noLotFlow.initialize();

    expect(noLotFlow.dummyMode.value).toBe('NONLOT');
    expect(noLotFlow.startButtonLabel.value).toBe('NO BATCH');
    expect(noLotFlow.restartButtonLabel.value).toBe('온도설정');
    expect(noLotFlow.batchRows.value).toEqual([]);
  });

  it('maps MW_TEST batch LOT identifiers from the legacy numbered response fields', async () => {
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('dummy-test'),
      initialLotId: 'LOT-DUMMY-BATCH',
    });

    await flow.initialize();

    expect(flow.dummyMode.value).toBe('T');
    expect(flow.batchRows.value.map(({ LOTID }) => LOTID)).toEqual([
      'LOT-DUMMY-01',
      'LOT-DUMMY-03',
    ]);
    expect(flow.batchRows.value.every(({ PRODUCT, STATUS }) => !PRODUCT && !STATUS)).toBe(true);
  });

  it('shows the legacy LOT notices in their original order', async () => {
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('lot-notices'),
      initialLotId: 'LOT-KJ-001',
    });

    await flow.initialize();
    const messages = [flow.dialog.value.message];
    for (let index = 0; index < 4; index += 1) {
      flow.closeDialog();
      flow.onDialogAfterClose();
      messages.push(flow.dialog.value.message);
    }

    expect(messages).toEqual([
      'UV검사 대상 Lot 입니다.',
      'LOT-FQC 은 공정이물 검사 대상 Lot 입니다.',
      'LOT-FICD 은 FICD검사 대상 Lot 입니다.',
      'LOT-ETC 정보',
      'LOT-INLINE 안내',
    ]);
  });

  it('shows PM and every cycle notice as separate dialogs in Android order', async () => {
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('equipment-notices'),
      initialLotId: 'LOT-KJ-001',
    });
    await flow.initialize();
    flow.setEquipmentInput('EQP-KJ-011');

    await flow.onEquipmentEnter();

    const dialogs = [];
    for (let index = 0; index < 3; index += 1) {
      dialogs.push({ title: flow.dialog.value.title, message: flow.dialog.value.message });
      flow.closeDialog();
      expect(flow.dialog.value.open).toBe(false);
      flow.onDialogAfterClose();
    }
    expect(dialogs).toEqual([
      { title: 'PM주기 경고', message: 'PM notice' },
      { title: '계측 주기 알림', message: 'Cycle one' },
      { title: '계측 주기 알림', message: 'Cycle two' },
    ]);
  });

  it.each([
    ['RUN', 'WIP', '', '이미 MOVE IN된 LOT입니다.'],
    ['', 'WAIT', '', 'WAIT 상태 입니다. 작업예약을 할 수 없습니다.'],
    ['', 'WIP', 'ONHOLD', 'HOLD된 LOT입니다. 작업예약을 할 수 없습니다.'],
  ])(
    'blocks LOT continuation for STATUS=%s, STATE=%s, HOLDSTATUS=%s',
    async (status, state, hold, expected) => {
      const api = createRemoteFurnaceKjMockApi();
      const lotResult = await api.fetchLotInfo({
        LOTID: 'LOT-KJ-001',
        FACILITY: 'FAB-A',
        USERID: 'OP-01',
      });
      if (!lotResult.ok) throw new Error('Expected a mock LOT response');
      const fetchLotInfo = vi.spyOn(api, 'fetchLotInfo').mockResolvedValue({
        ok: true,
        data: { ...lotResult.data, STATUS: status, STATE: state, HOLDSTATUS: hold },
      });
      const fetchBatchListByLot = vi.spyOn(api, 'fetchBatchListByLot');
      const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });

      await flow.initialize();

      expect(flow.dialog.value.message).toBe(expected);
      expect(fetchLotInfo).toHaveBeenCalledTimes(1);
      expect(fetchBatchListByLot).not.toHaveBeenCalled();
      expect(flow.startEnabled.value).toBe(false);
    },
  );

  it('restores the complete form draft after Comment List returns', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const firstPage = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await firstPage.initialize();
    firstPage.equipmentInput.value = 'EQP-KJ-011';
    await firstPage.onEquipmentEnter();
    await firstPage.selectPort('2');
    const restoredPage = useRemoteFurnaceKj({
      api,
      initialLotId: 'LOT-KJ-001',
      initialDraft: firstPage.createDraft(),
    });

    await restoredPage.initialize();

    expect(restoredPage.equipmentInput.value).toBe('KJ-01');
    expect(restoredPage.selectedRecipe.value).toBe('RCP-KJ-01');
    expect(restoredPage.selectedPort.value).toBe('2');
    expect(restoredPage.portStatus.value).toBe('IDLE');
    expect(restoredPage.startEnabled.value).toBe(false);
    expect(restoredPage.batchRows.value).toEqual(firstPage.batchRows.value);
  });

  it('uses the shared equipment barcode parser only on Enter', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();

    flow.equipmentInput.value = 'EQP-KJ-011';
    expect(flow.equipment.value).toBeUndefined();
    await flow.onEquipmentEnter();

    expect(flow.equipmentInput.value).toBe('KJ-01');
    expect(flow.equipment.value?.PROCEQPID).toBe('KJ-01');

    flow.equipmentInput.value = ' eqp-kj-011 ';
    await flow.onEquipmentEnter();
    expect(flow.equipmentInput.value).toBe('KJ-01');

    const readingError = vi.spyOn(okDialog, 'show').mockResolvedValue(1);
    try {
      flow.equipmentInput.value = 'KJ-01';
      await flow.onEquipmentEnter();
      expect(flow.equipmentInput.value).toBe('');
      expect(readingError).toHaveBeenCalledWith(
        'READING ERROR',
        '진행할 장비를 읽어주세요.',
        expect.any(String),
      );
    } finally {
      readingError.mockRestore();
    }
  });

  it('clears equipment-dependent state and shows the backend error when equipment lookup fails', async () => {
    const api = createRemoteFurnaceKjMockApi();
    vi.spyOn(api, 'fetchEquipmentInfo').mockResolvedValue({
      ok: false,
      message: 'Equipment lookup failed',
    });
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.setEquipmentInput('EQP-KJ-011');

    await flow.onEquipmentEnter();

    expect(flow.equipmentInput.value).toBe('');
    expect(flow.equipment.value).toBeUndefined();
    expect(flow.recipeOptions.value).toEqual([]);
    expect(flow.portOptions.value).toEqual([]);
    expect(flow.dialog.value.message).toBe('Equipment lookup failed');
  });

  it('clears stale actions when a follow-up equipment lookup throws', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.setEquipmentInput('EQP-KJ-011');
    await flow.onEquipmentEnter();
    expect(flow.startEnabled.value).toBe(true);

    vi.spyOn(api, 'fetchEquipmentInfo').mockRejectedValueOnce(new Error('Network failure'));
    flow.setEquipmentInput('EQP-KJ-021');
    await flow.onEquipmentEnter();

    expect(flow.equipment.value).toBeUndefined();
    expect(flow.equipmentInput.value).toBe('');
    expect(flow.recipeOptions.value).toEqual([]);
    expect(flow.selectedRecipe.value).toBe('');
    expect(flow.portOptions.value).toEqual([]);
    expect(flow.selectedPort.value).toBe('');
    expect(flow.portStatus.value).toBe('');
    expect(flow.startEnabled.value).toBe(false);
    expect(flow.restartEnabled.value).toBe(false);
    expect(flow.clearPortEnabled.value).toBe(false);
    expect(flow.dialog.value.message).toBe('Network failure');
  });

  it('rejects an equipment outside the LOT standard machine group', async () => {
    const api = createRemoteFurnaceKjMockApi();
    vi.spyOn(api, 'fetchEquipmentInfo').mockResolvedValue({
      ok: true,
      data: {
        MAINEQPID: 'OTHER-01',
        PROCEQPID: 'OTHER-01',
        EQPAREA: 'FURNACE',
        EQPTYPE: 'KJ',
        ISDOOROPEN: 'N',
        PMMESSAGE: '',
        PORTNAME: '1,2',
        CYCLE_MESSAGE: '',
        FURNACE: 'KJ',
      },
    });
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';

    await flow.onEquipmentEnter();

    expect(flow.equipment.value).toBeUndefined();
    expect(flow.equipmentInput.value).toBe('');
    expect(flow.recipeOptions.value).toEqual([]);
  });

  it('offers legacy RUN-status recovery when recipe lookup reports an unloaded machine', async () => {
    const api = createRemoteFurnaceKjMockApi('equipment-down');
    const changeEquipmentStatus = vi.spyOn(api, 'changeEquipmentStatus');
    const fetchRecipeInfo = vi.spyOn(api, 'fetchRecipeInfo');
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';

    await flow.onEquipmentEnter();
    expect(flow.dialog.value).toMatchObject({
      kind: 'confirm',
      action: 'change-equipment-status',
      message:
        '현재 장비 상태가 가동중(RUN)이 아닙니다.\n장비 상태를 가동중(RUN)으로 변경 하시겠습니까?',
    });

    const firstConfirmation = flow.confirmDialogAction();
    await flow.confirmDialogAction();
    await firstConfirmation;
    expect(changeEquipmentStatus).toHaveBeenCalledWith({
      MAINEQPID: 'KJ-01',
      FACILITY: 'FAB-A',
      STATUS: 'R  가동중',
      REASONCODE: 'RR001',
      EVENTNAME: 'PDA_MVIN_UP',
      USERID: 'OP-01',
      USERNAME: 'Operator One',
      REMARK: '',
    });
    expect(changeEquipmentStatus).toHaveBeenCalledTimes(1);
    flow.onDialogAfterClose();
    expect(flow.dialog.value.action).toBe('retry-recipe');

    await flow.confirmDialogAction();
    expect(fetchRecipeInfo).toHaveBeenCalledTimes(2);
  });

  it('enables actions only for port 1 in COMPLETE or IDLE state', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();

    await flow.selectPort('1');
    expect(flow.startEnabled.value).toBe(true);
    expect(flow.restartEnabled.value).toBe(true);
    expect(flow.clearPortEnabled.value).toBe(false);

    await flow.selectPort('2');
    expect(flow.startEnabled.value).toBe(false);
    expect(flow.restartEnabled.value).toBe(false);
    expect(flow.clearPortEnabled.value).toBe(false);
  });

  it.each(['PENDING', 'INIT', 'RUN'])(
    'renders and applies KJ port state behavior for %s',
    async (state) => {
      const api = createRemoteFurnaceKjMockApi();
      vi.spyOn(api, 'fetchKjPortStatus').mockResolvedValue({
        ok: true,
        data: {
          PORTSTATENAME: state,
          PORTLOTNAME: 'BATCH-KJ-01',
          ACKMSG: '',
          PORTSTATENAME1: state,
          PORTSTATENAME2: 'IDLE',
        },
      });
      const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
      await flow.initialize();
      flow.setEquipmentInput('EQP-KJ-011');

      await flow.onEquipmentEnter();

      expect(flow.portStatus.value).toBe(state);
      expect(flow.startEnabled.value).toBe(false);
      expect(flow.restartEnabled.value).toBe(false);
      expect(flow.clearPortEnabled.value).toBe(true);
    },
  );

  it('uses Android non-KJ PENDING, INIT, and RUN port handling without collapsing messages', async () => {
    const pending = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('port-pending-generic'),
      initialLotId: 'LOT-KJ-001',
    });
    await pending.initialize();
    pending.setEquipmentInput('EQP-KJ-011');
    await pending.onEquipmentEnter();
    expect(pending.portStatus.value).toBe('PENDING');
    expect(pending.startEnabled.value).toBe(false);
    expect(pending.restartEnabled.value).toBe(true);
    expect(pending.clearPortEnabled.value).toBe(true);

    const init = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('port-init-generic'),
      initialLotId: 'LOT-KJ-001',
    });
    await init.initialize();
    init.setEquipmentInput('EQP-KJ-011');
    await init.onEquipmentEnter();
    expect(init.portStatus.value).toBe('INIT');
    expect(init.startEnabled.value).toBe(false);
    expect(init.restartEnabled.value).toBe(false);
    expect(init.clearPortEnabled.value).toBe(true);

    const run = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('port-run-generic'),
      initialLotId: 'LOT-KJ-001',
    });
    await run.initialize();
    run.setEquipmentInput('EQP-KJ-011');
    await run.onEquipmentEnter();
    expect(run.portStatus.value).toBe('RUN');
    expect(run.startEnabled.value).toBe(false);
    expect(run.restartEnabled.value).toBe(false);
    expect(run.clearPortEnabled.value).toBe(true);
    expect(run.dialog.value.message).toBe(
      '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
    );
    run.closeDialog();
    run.onDialogAfterClose();
    expect(run.dialog.value).toMatchObject({
      title: 'PORT WORNING',
      message: 'Port acknowledgement',
    });
  });

  it('keeps reserved LOT selectors locked and Start disabled while allowing legacy Restart', async () => {
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('reserved-lot'),
      initialLotId: 'LOT-KJ-001',
    });

    await flow.initialize();

    expect(flow.isReserved.value).toBe(true);
    expect(flow.isEquipmentLocked.value).toBe(true);
    expect(flow.isRecipeLocked.value).toBe(true);
    expect(flow.isPortLocked.value).toBe(true);
    expect(flow.selectedRecipe.value).toBe('RCP-KJ-01');
    expect(flow.startEnabled.value).toBe(false);
    expect(flow.restartEnabled.value).toBe(true);
  });

  it('uses the dialog confirmation for port reset without treating other confirms as a reset', async () => {
    const api = createRemoteFurnaceKjMockApi('port-run');
    const clearPort = vi.spyOn(api, 'clearPort');
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();
    await flow.selectPort('1');

    expect(flow.clearPortEnabled.value).toBe(true);
    await flow.executeClearPort();
    expect(clearPort).not.toHaveBeenCalled();
    expect(flow.dialog.value.kind).toBe('confirm');

    await flow.confirmDialogAction();
    expect(clearPort).toHaveBeenCalledWith({ MACHINENAME: 'KJ-01', PORTNAME: '1' });
    flow.onDialogAfterClose();
    expect(flow.dialog.value.kind).toBe('success');
  });

  it('clears the scanned equipment when an ETCH recipe warning is cancelled', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const checkInterlock = vi.spyOn(api, 'checkInterlock');
    vi.spyOn(api, 'fetchRecipeInfo').mockResolvedValue({
      ok: true,
      data: {
        RECIPE: 'RCP-KJ-01',
        ETCHMESSAGE: '사전 진행 장비를 확인하세요.',
        MULTIMOVEINACTION: 'Another LOT is moving in.',
        ETCMSG: '',
      },
    });
    const clearPort = vi.spyOn(api, 'clearPort');
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();

    expect(flow.dialog.value).toMatchObject({
      kind: 'confirm',
      action: 'recipe-warning',
      message: '사전 진행 장비를 확인하세요.',
    });
    expect(checkInterlock).not.toHaveBeenCalled();
    flow.cancelDialogAction();
    expect(flow.equipmentInput.value).toBe('');
    expect(flow.selectedRecipe.value).toBe('');
    expect(clearPort).not.toHaveBeenCalled();
    expect(checkInterlock).not.toHaveBeenCalled();
  });

  it('continues to the MULTIMOVE warning and interlock only after ETCH confirmation', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const checkInterlock = vi.spyOn(api, 'checkInterlock');
    vi.spyOn(api, 'fetchRecipeInfo').mockResolvedValue({
      ok: true,
      data: {
        RECIPE: 'RCP-KJ-01',
        ETCHMESSAGE: 'Confirm the preceding ETCH machine.',
        MULTIMOVEINACTION: 'Another LOT is moving in.',
        ETCMSG: '',
      },
    });
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();

    expect(flow.dialog.value).toMatchObject({ action: 'recipe-warning', kind: 'confirm' });
    expect(checkInterlock).not.toHaveBeenCalled();

    await flow.confirmDialogAction();
    flow.onDialogAfterClose();
    expect(flow.dialog.value).toMatchObject({
      action: 'recipe-multimove-warning',
      kind: 'alert',
      message: 'Another LOT is moving in.',
    });
    expect(checkInterlock).not.toHaveBeenCalled();

    await flow.confirmDialogAction();
    flow.onDialogAfterClose();
    expect(checkInterlock).toHaveBeenCalledTimes(1);
  });

  it('passes the selected batch row legacy context to Comment List', async () => {
    const onOpenComments = vi.fn();
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi(),
      initialLotId: 'LOT-KJ-001',
      onOpenComments,
    });
    await flow.initialize();

    flow.selectMoveIn(flow.batchRows.value[0]);

    expect(onOpenComments).toHaveBeenCalledWith({
      lotId: 'LOT-KJ-001',
      operation: 'FURNACE',
      subOperation: 'KJ',
      processStep: 'REMOTE FURNACE KJ',
      operSequence: '0042',
    });
  });

  it('does not open Comment List when the legacy C column has no comments', async () => {
    const onOpenComments = vi.fn();
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi(),
      initialLotId: 'LOT-KJ-001',
      onOpenComments,
    });
    await flow.initialize();

    flow.selectMoveIn({ ...flow.batchRows.value[0], COMMENTQTY: '0', NWCOMMENTQTY: '1' });

    expect(onOpenComments).not.toHaveBeenCalled();
  });

  it('blocks Start when a batch LOT has unread work comments', async () => {
    const api = createRemoteFurnaceKjMockApi('unread-comments');
    const onSuccess = vi.fn();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001', onSuccess });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();
    await flow.selectPort('1');

    expect(flow.dialog.value.message).toContain('작업성 COMMENT가 있습니다.');
    flow.closeDialog();
    flow.onDialogAfterClose();

    await flow.executeStart();

    expect(flow.dialog.value.message).toContain('읽은후 진행하세요.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('sends a Start command only after recipe confirmation and signals success with the LOT', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const startKjRemote = vi.spyOn(api, 'startKjRemote');
    const onSuccess = vi.fn();
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001', onSuccess });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();
    await flow.selectPort('1');

    await flow.executeStart();
    expect(startKjRemote).not.toHaveBeenCalled();
    expect(flow.recipeConfirmationOpen.value).toBe(true);

    await flow.confirmRecipeAction();

    expect(startKjRemote).toHaveBeenCalledWith(
      expect.objectContaining({ CMDTYPE: 'S', LOTNAME: 'LOT-KJ-001', EVENTUSER: 'OP-01' }),
    );
    expect(onSuccess).toHaveBeenCalledWith('LOT-KJ-001');
  });

  it('keeps Restart separate from Start validation and sends the legacy R command', async () => {
    const api = createRemoteFurnaceKjMockApi();
    const fetchLotInfo = vi.spyOn(api, 'fetchLotInfo');
    const startKjRemote = vi.spyOn(api, 'startKjRemote');
    const flow = useRemoteFurnaceKj({ api, initialLotId: 'LOT-KJ-001' });
    await flow.initialize();
    flow.setEquipmentInput('EQP-KJ-011');
    await flow.onEquipmentEnter();
    const lotLookupCount = fetchLotInfo.mock.calls.length;

    await flow.executeReStart();
    expect(flow.recipeConfirmationOpen.value).toBe(true);
    await flow.confirmRecipeAction();

    expect(fetchLotInfo).toHaveBeenCalledTimes(lotLookupCount);
    expect(startKjRemote).toHaveBeenCalledWith(
      expect.objectContaining({ CMDTYPE: 'R', LOTNAME: 'LOT-KJ-001' }),
    );
  });

  it('does not call success callback when the command fails or the page is cancelled', async () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    const flow = useRemoteFurnaceKj({
      api: createRemoteFurnaceKjMockApi('start-error'),
      initialLotId: 'LOT-KJ-001',
      onSuccess,
      onCancel,
    });
    await flow.initialize();
    flow.equipmentInput.value = 'EQP-KJ-011';
    await flow.onEquipmentEnter();
    await flow.selectPort('1');
    await flow.executeStart();
    await flow.confirmRecipeAction();
    expect(flow.dialog.value.open).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    flow.cancelPage();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
