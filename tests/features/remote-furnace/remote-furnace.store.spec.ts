import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { mockRemoteFurnaceLotInfo } from 'src/features/remote-furnace/mocks/remote-furnace.mock';
import {
  remoteFurnaceService,
  setRemoteFurnaceMockMode,
} from 'src/features/remote-furnace/services/remote-furnace.service';
import { useRemoteFurnaceStore } from 'src/features/remote-furnace/stores/remote-furnace.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useRemoteFurnaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setRemoteFurnaceMockMode(true);

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  // ─── Initial State ────────────────────────────────────────────────────────

  describe('initScreen', () => {
    it('enters NONLOT mode when no lotId provided', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();

      expect(store.dummyMode).toBe('NONLOT');
      expect(store.startButtonLabel).toBe('NO BATCH');
      expect(store.restartButtonLabel).toBe('온도설정');
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(true);
      expect(store.isLotNoDisabled).toBe(true);
    });

    it('enters LOT mode and fetches lot info when lotId provided', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');

      expect(store.lotId).toBe('WIP00001');
      expect(store.dummyMode).toBe('F');
      expect(store.batchId).not.toBe('');
      expect(store.recipe).not.toBe('');
    });

    it('sets isRecipeChanged and isStandardMachineChanged when changed values are returned', async () => {
      const store = useRemoteFurnaceStore();
      vi.spyOn(remoteFurnaceService, 'fetchLotInfo').mockResolvedValueOnce({
        ok: true,
        data: {
          ...mockRemoteFurnaceLotInfo('WIP00001'),
          recipe: 'OLD_RECIPE',
          changeRecipe: 'NEW_RECIPE',
          eqpGroup: 'FN01',
          changeEqpGroup: 'FN02',
        },
      });

      await store.initScreen('WIP00001');

      expect(store.recipe).toBe('OLD_RECIPE');
      expect(store.isRecipeChanged).toBe(true);
      expect(store.standardMachine).toBe('FN02');
      expect(store.isStandardMachineChanged).toBe(true);
    });

    it('resets previous state before loading a new lot', async () => {
      const store = useRemoteFurnaceStore();
      // Load first lot to dirty state
      await store.initScreen('WIP00001');
      expect(store.lotId).toBe('WIP00001');

      // Init again with no lot – all state should be clean
      await store.initScreen();
      expect(store.lotId).toBe('');
      expect(store.batchId).toBe('');
      expect(store.batchLots).toHaveLength(0);
    });
  });

  // ─── Computed: portStatusKind ─────────────────────────────────────────────

  describe('portStatusKind', () => {
    it.each([
      ['INIT', 'init'],
      ['RUN', 'run'],
      ['PENDING', 'pending'],
      ['READY', 'ready'],
      ['RESERVED', 'reserved'],
      ['COMPLETE', 'complete'],
      ['IDLE', 'idle'],
      ['OTHER', 'unknown'],
      ['', 'unknown'],
    ] as const)('maps portState "%s" → kind "%s"', (raw, expected) => {
      const store = useRemoteFurnaceStore();
      store.portState = raw;
      expect(store.portStatusKind).toBe(expected);
    });

    it('is case-insensitive for portState', () => {
      const store = useRemoteFurnaceStore();
      store.portState = 'ready';
      expect(store.portStatusKind).toBe('ready');
    });
  });

  // ─── Computed: button labels ──────────────────────────────────────────────

  describe('button labels', () => {
    it('shows START / RESTART labels in normal lot mode', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');

      expect(store.startButtonLabel).toBe('START');
      expect(store.restartButtonLabel).toBe('RESTART');
    });

    it('shows NO BATCH / 온도설정 labels in NONLOT mode', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();

      expect(store.startButtonLabel).toBe('NO BATCH');
      expect(store.restartButtonLabel).toBe('온도설정');
    });
  });

  // ─── Dialog Helpers ───────────────────────────────────────────────────────

  describe('alert dialog', () => {
    it('opens alert with title and message', () => {
      const store = useRemoteFurnaceStore();
      expect(store.alertDialog.open).toBe(false);

      store.showAlert('Test Title', 'Test Message');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('Test Title');
      expect(store.alertDialog.message).toBe('Test Message');
    });

    it('closes alert via closeAlert()', () => {
      const store = useRemoteFurnaceStore();
      store.showAlert('T', 'M');
      store.closeAlert();
      expect(store.alertDialog.open).toBe(false);
    });
  });

  describe('confirm dialog', () => {
    it('opens confirm with callbacks', () => {
      const store = useRemoteFurnaceStore();
      const onConfirm = () => undefined;
      const onCancel = () => undefined;

      store.showConfirm({
        title: 'Confirm',
        message: 'Are you sure?',
        confirmText: '예',
        cancelText: '아니오',
        onConfirm,
        onCancel,
      });

      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.title).toBe('Confirm');
      expect(store.confirmDialog.confirmText).toBe('예');
      expect(store.confirmDialog.onConfirm).toBe(onConfirm);
    });

    it('closes confirm via closeConfirm()', () => {
      const store = useRemoteFurnaceStore();
      store.showConfirm({ title: 'T', message: 'M' });
      store.closeConfirm();
      expect(store.confirmDialog.open).toBe(false);
    });
  });

  // ─── setSelectedLot ───────────────────────────────────────────────────────

  describe('setSelectedLot', () => {
    it('updates selectedLot and commentLotContext for cross-screen data passing', () => {
      const store = useRemoteFurnaceStore();
      const item = {
        lotId: 'TEST_LOT_01',
        commentQty: 2,
        status: 'WAIT',
        processStep: 'DIFF_STEP_01',
        product: 'TEST_PROD',
        quantity: 25,
        operation: '3100',
        subOperation: 'A',
        lotState: 'WIP',
        unreadCommentQty: 1,
        operSequence: '0010',
      };

      store.setSelectedLot(item);

      expect(store.selectedLot).toEqual(item);
      expect(store.commentLotContext).toEqual(item);
    });
  });

  // ─── triggerStartAction ───────────────────────────────────────────────────

  describe('triggerStartAction', () => {
    it('returns false and alerts when processingMachine is empty', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();

      const result = await store.triggerStartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('진행장비를 입력하세요.');
    });

    it('returns false and alerts when selectedRecipe is empty', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();
      store.processingMachine = 'FN01';
      store.closeAlert();

      const result = await store.triggerStartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.message).toBe('진행 Rcp를 선택하세요.');
    });

    it('opens recipeDialog with action=START when validation passes in NONLOT mode', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen(); // NONLOT mode
      store.processingMachine = 'FN01';
      store.selectedRecipe = 'FURNACE_NONLOT_IDLE';

      const result = await store.triggerStartAction();
      expect(result).toBe(true);
      expect(store.recipeDialog.open).toBe(true);
      expect(store.recipeDialog.action).toBe('START');
    });

    it('returns false and alerts when checkLotComment returns an error', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');
      store.processingMachine = 'FN01';
      store.selectedRecipe = 'FURNACE_DIFF_1000';

      vi.spyOn(remoteFurnaceService, 'checkLotComment').mockResolvedValueOnce({
        ok: false,
        message: 'Comment service failed',
      });

      const result = await store.triggerStartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('Comment service failed');
    });

    it('returns false and alerts when unread comments exist', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');
      store.processingMachine = 'FN01';
      store.selectedRecipe = 'FURNACE_DIFF_1000';

      vi.spyOn(remoteFurnaceService, 'checkLotComment').mockResolvedValueOnce({
        ok: true,
        data: 2,
      });

      const result = await store.triggerStartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toContain('읽지 않은 작업성 COMMENT가 [2]가 있습니다.');
    });
  });

  // ─── triggerRestartAction ─────────────────────────────────────────────────

  describe('triggerRestartAction', () => {
    it('returns false and alerts when processingMachine is empty', () => {
      const store = useRemoteFurnaceStore();
      const result = store.triggerRestartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.message).toBe('진행장비를 입력하세요.');
    });

    it('returns false and alerts when selectedRecipe is empty', () => {
      const store = useRemoteFurnaceStore();
      store.processingMachine = 'FN01';
      const result = store.triggerRestartAction();
      expect(result).toBe(false);
      expect(store.alertDialog.message).toBe('진행 Rcp를 선택하세요.');
    });

    it('opens recipeDialog with action=RESTART when both fields are set', () => {
      const store = useRemoteFurnaceStore();
      store.processingMachine = 'FN01';
      store.selectedRecipe = 'FURNACE_DIFF_1000';

      const result = store.triggerRestartAction();
      expect(result).toBe(true);
      expect(store.recipeDialog.open).toBe(true);
      expect(store.recipeDialog.action).toBe('RESTART');
      expect(store.recipeDialog.recipeList).toBe('FURNACE_DIFF_1000');
    });
  });

  // ─── evaluatePortButtonState ──────────────────────────────────────────────

  describe('evaluatePortButtonState', () => {
    it('disables START and RESTART for RUN port state', () => {
      const store = useRemoteFurnaceStore();
      store.evaluatePortButtonState('RUN', '', '');
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(true);
    });

    it('disables START and RESTART for RESERVED port state', () => {
      const store = useRemoteFurnaceStore();
      store.evaluatePortButtonState('RESERVED', '', '');
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(true);
    });

    it('alerts when port state is empty (cannot fetch)', () => {
      const store = useRemoteFurnaceStore();
      store.evaluatePortButtonState('', '', '');
      expect(store.alertDialog.open).toBe(true);
      expect(store.isClearPortDisabled).toBe(true);
      expect(store.isStartBtnDisabled).toBe(true);
    });

    it('enables START and RESTART in NONLOT mode with PENDING port', () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'NONLOT';
      store.evaluatePortButtonState('PENDING', '', '');
      expect(store.isStartBtnDisabled).toBe(false);
      expect(store.isRestartBtnDisabled).toBe(false);
    });

    it('in normal mode with PENDING port: START disabled, RESTART depends on batch match', () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'F';
      store.batchId = 'BAT-FN-202610';

      // Batch matches portLot → RESTART enabled
      store.evaluatePortButtonState('PENDING', 'BAT-FN-202610', '');
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(false);

      // Batch does not match → RESTART disabled
      store.evaluatePortButtonState('PENDING', 'OTHER-BATCH', '');
      expect(store.isRestartBtnDisabled).toBe(true);
    });

    it('in INIT state: START disabled, RESTART enabled only in NONLOT mode', () => {
      const store = useRemoteFurnaceStore();

      store.dummyMode = 'F';
      store.evaluatePortButtonState('INIT', '', '');
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(true);

      store.dummyMode = 'NONLOT';
      store.evaluatePortButtonState('INIT', '', '');
      expect(store.isRestartBtnDisabled).toBe(false);
    });

    it('in READY state: START enabled, RESTART disabled in normal lot mode', () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'F';
      store.evaluatePortButtonState('READY', '', '');
      expect(store.isStartBtnDisabled).toBe(false);
      expect(store.isRestartBtnDisabled).toBe(true);
    });

    it('enables CLEAR PORT button for all states except empty', () => {
      const store = useRemoteFurnaceStore();
      store.evaluatePortButtonState('READY', '', '');
      expect(store.isClearPortDisabled).toBe(false);

      store.evaluatePortButtonState('', '', '');
      expect(store.isClearPortDisabled).toBe(true);
    });
  });

  // ─── checkInterlock ───────────────────────────────────────────────────────

  describe('checkInterlock', () => {
    it('skips interlock check in dummy mode (T)', async () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'T';
      // If it ran, it would update isInterlocked; since it skips, stays false
      await store.checkInterlock();
      expect(store.isInterlocked).toBe(false);
    });

    it('skips interlock check in NONLOT mode', async () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'NONLOT';
      await store.checkInterlock();
      expect(store.isInterlocked).toBe(false);
    });

    it('skips interlock check in restart mode', async () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'F';
      store.restartMode = 'T';
      await store.checkInterlock();
      expect(store.isInterlocked).toBe(false);
    });

    it('runs interlock check in normal mode and sets isInterlocked from mock (intlk=N)', async () => {
      const store = useRemoteFurnaceStore();
      store.dummyMode = 'F';
      store.restartMode = 'F';
      store.batchLots = [
        {
          lotId: 'WIP00001',
          commentQty: 0,
          status: 'WAIT',
          processStep: '',
          product: '',
          quantity: 25,
          operation: '3100',
          subOperation: '010',
          lotState: 'WIP',
          unreadCommentQty: 0,
          operSequence: '0010',
        },
      ];

      await store.checkInterlock();
      // Mock returns intlk='N', so isInterlocked should remain false
      expect(store.isInterlocked).toBe(false);
    });
  });

  // ─── requestClearPort ────────────────────────────────────────────────────

  describe('requestClearPort', () => {
    it('alerts when no port is selected', () => {
      const store = useRemoteFurnaceStore();
      store.selectedPort = '';
      store.requestClearPort();
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('진행 Port를 먼저 선택하세요.');
    });

    it('opens confirm dialog when a port is selected', () => {
      const store = useRemoteFurnaceStore();
      store.selectedPort = 'PORT1';
      store.requestClearPort();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toContain('PORT1');
    });
  });

  // ─── resetState ──────────────────────────────────────────────────────────

  describe('resetState', () => {
    it('restores all state to defaults', async () => {
      const store = useRemoteFurnaceStore();

      // Dirty up state
      await store.initScreen('WIP00001');
      store.processingMachine = 'FN01';
      store.selectedRecipe = 'FURNACE_DIFF_1000';
      store.portState = 'READY';
      store.batchLots = [
        {
          lotId: 'X',
          commentQty: 1,
          status: 'WAIT',
          processStep: '',
          product: '',
          quantity: 10,
          operation: '',
          subOperation: '',
          lotState: 'WIP',
          unreadCommentQty: 0,
          operSequence: '',
        },
      ];

      store.resetState();

      expect(store.lotId).toBe('');
      expect(store.batchId).toBe('');
      expect(store.recipe).toBe('');
      expect(store.selectedRecipe).toBe('');
      expect(store.recipeOptions).toHaveLength(0);
      expect(store.processingMachine).toBe('');
      expect(store.portState).toBe('');
      expect(store.batchLots).toHaveLength(0);
      expect(store.selectedLot).toBeNull();
      expect(store.dummyMode).toBe('F');
      expect(store.restartMode).toBe('F');
      expect(store.isLoading).toBe(false);
      expect(store.isInterlocked).toBe(false);
      expect(store.isClearPortDisabled).toBe(true);
      expect(store.isStartBtnDisabled).toBe(true);
      expect(store.isRestartBtnDisabled).toBe(true);
    });
  });

  // ─── handleProcessingMachineInput ────────────────────────────────────────

  describe('handleProcessingMachineInput', () => {
    it('populates portOptions and selectedPort from mock eqp info', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');

      await store.handleProcessingMachineInput('FN01');

      // Mock eqp info returns 'PORT1,PORT2,PORT3,PORT4'
      expect(store.portOptions).toEqual(['PORT1', 'PORT2', 'PORT3', 'PORT4']);
      expect(store.selectedPort).toBe('PORT1');
    });

    it('sets superEqpId from fetched eqp data', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();
      await store.handleProcessingMachineInput('FN01');

      expect(store.superEqpId).toBe('FN01');
    });

    it('accepts raw machine ID directly without requiring barcode format', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();
      await store.handleProcessingMachineInput('FN01');

      expect(store.processingMachine).toBe('FN01');
      expect(store.superEqpId).toBe('FN01');
    });

    it('validates machine against standardMachine using validateEquipment in production mode', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen('WIP00001');
      store.dummyMode = 'F';
      store.standardMachine = 'FN02-01~05';

      // FN01-01 does not match FN02-01~05
      await store.handleProcessingMachineInput('FN01-01');

      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toContain('장비가 기준장비에 존재하지 않습니다.');
      expect(store.processingMachine).toBe('');
    });

    it('can load machine info directly via loadMachineInfo', async () => {
      const store = useRemoteFurnaceStore();
      await store.initScreen();
      await store.loadMachineInfo('FN02');

      expect(store.processingMachine).toBe('FN02');
      expect(store.superEqpId).toBe('FN02');
    });
  });
});
