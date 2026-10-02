import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkLoginUser,
  executeMoveOut,
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchLotInfo,
  fetchMoveOutFqcSampling,
  setProbeCardHistory,
  updateSkipWafer,
} from '~/features/move-out/services/move-out.service';
import { useMoveOutStore } from '~/features/move-out/stores/move-out.store';
import type { MoveOutLotInfo } from '~/features/move-out/types/move-out.types';

vi.mock('~/features/move-out/services/move-out.service', () => ({
  fetchLotInfo: vi.fn(),
  fetchAreaBayInfo: vi.fn(),
  fetchBayStockerInfo: vi.fn(),
  checkLoginUser: vi.fn(),
  executeMoveOut: vi.fn(),
  fetchMoveOutFqcSampling: vi.fn(),
  fetchSlotInfo: vi.fn(),
  updateSkipWafer: vi.fn(),
  setProbeCardHistory: vi.fn(),
}));

const baseLot: MoveOutLotInfo = {
  lotId: 'LOT-DEMO-01',
  batchId: '',
  area: 'ETCH',
  display: {
    lotNo: 'LOT-DEMO-01',
    batchId: '',
    recipe: 'RCP-01',
    machine: 'EQP-01',
    maskTag: 'MASK-01',
    product: 'PRODUCT-DEMO(JOB-A)',
    currentOperation: 'CUR(100000)',
    nextOperation: 'NEXT(200000)',
    quantity: '25',
    goodChips: '100',
    commentQty: '1',
  },
  operation: '1000',
  subOperation: '00',
  processStep: 'CUR',
  operSequence: '10',
  opType: 'MVOU',
  processType: '',
  state: 'WIP',
  status: '',
  holdStatus: '',
  remoteCheck: '',
  nwCommentQty: '0',
  pqcSkipUser: 'Y',
  checkSkipWafer: 'Y',
  checkSkipWaferMachine: '',
  checkSkipWaferRecipe: '',
  checkSkipWaferQty: '',
  checkSkipMachineQty: '',
  checkSkipReasonList: '[]',
  createCategory: '',
  lastEventComment: '',
  productQuantity: '3',
  owner: '',
  checkEtch: '',
  checkInterlock: '',
  lampComment: '',
  aramComment: '',
  machineState: '',
  machineCode: '',
  holdCodeOut: '',
  holdCommentOut: '',
  etcMsg: '',
  pcmCheck: '',
  thicknessCheck: '',
  mvinWaferCheck: '',
  btaWarning: '',
  childBatchId: '',
  bibuhaDown: 'N',
  chamberList: '[]',
  checkGateInspMsg: '',
  automotiveFlag: '',
  photoOperType: '',
  nextBay: 'BAY-A',
  nextStocker: 'STK-A',
};

describe('useMoveOutStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchLotInfo).mockResolvedValue({ ...baseLot });
  });

  it('loads LOTINFO and initializes form state', async () => {
    const store = useMoveOutStore();

    await store.loadLotInfo('LOT-DEMO-01');

    expect(fetchLotInfo).toHaveBeenCalledWith({
      lotId: 'LOT-DEMO-01',
      facility: 'FACILITY',
      operatorId: 'OPERATOR_ID',
    });
    expect(store.lot?.display.recipe).toBe('RCP-01');
    expect(store.form.comment).toBe('');
    expect(store.form.maskLogo).toBe('');
    expect(store.form.selectedBay).toBe('BAY-A');
    expect(store.form.selectedStocker).toBe('STK-A');
    expect(store.okEnabled).toBe(true);
    expect(store.whButtonText).toBe('W/H');
  });

  it('applies hard interlocks that disable OK', async () => {
    vi.mocked(fetchLotInfo).mockResolvedValueOnce({
      ...baseLot,
      remoteCheck: 'Y',
    });
    const store = useMoveOutStore();

    await store.loadLotInfo('LOT-DEMO-01');

    expect(store.okEnabled).toBe(false);
    expect(store.messages).toContainEqual({
      kind: 'error',
      title: '에  러',
      message: '매뉴얼 Move Out이 불가한 장치입니다. 자동화 진행 이력을 확인 하세요.',
    });
  });

  it('loads bay and stocker options for transfer', async () => {
    vi.mocked(fetchAreaBayInfo).mockResolvedValueOnce([{ label: 'BAY-A', value: 'BAY-A' }]);
    vi.mocked(fetchBayStockerInfo).mockResolvedValueOnce([{ label: 'STK-A', value: 'STK-A' }]);
    const store = useMoveOutStore();

    await store.enableTransfer(true);
    await store.loadStockers('BAY-A');

    expect(store.form.carry).toBe(true);
    expect(store.bayOptions).toEqual([{ label: 'BAY-A', value: 'BAY-A' }]);
    expect(store.stockerOptions).toEqual([{ label: 'STK-A', value: 'STK-A' }]);
  });

  it('maps wafer select result to W/H comment', async () => {
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    store.applyWaferSelectResult({
      sequence: '',
      selectedWaferList: 'LOT-DEMO-01.1,LOT-DEMO-01.2',
      selectedMachine: 'EQP-A',
    });

    expect(store.form.comment).toBe('; W/H:#1,2');
  });

  it('applies input scope result to comment and mask logo like MoveOutActivity result extras', async () => {
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    store.form.comment = 'existing comment';
    store.form.maskLogo = 'OLD_LOGO';
    store.applyInputScopeResult({
      lotId: 'LOT-DEMO-01',
      waferList: '01,03',
      logo: 'NEW_LOGO',
    });

    expect(store.form.comment).toBe('; W/H:#01,03');
    expect(store.form.maskLogo).toBe('NEW_LOGO');
  });

  it('does not overwrite move out fields when input scope result extras are empty', async () => {
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    store.form.comment = 'existing comment';
    store.form.maskLogo = 'OLD_LOGO';
    store.applyInputScopeResult({
      lotId: 'LOT-DEMO-01',
      waferList: '',
      logo: '',
    });

    expect(store.form.comment).toBe('existing comment');
    expect(store.form.maskLogo).toBe('OLD_LOGO');
  });

  it('stores and consumes pending input scope result once', () => {
    const store = useMoveOutStore();

    store.setPendingInputScopeResult({
      lotId: 'LOT-DEMO-01',
      waferList: '02',
      logo: 'LOGO-A',
    });

    expect(store.consumePendingInputScopeResult()).toEqual({
      lotId: 'LOT-DEMO-01',
      waferList: '02',
      logo: 'LOGO-A',
    });
    expect(store.consumePendingInputScopeResult()).toBeUndefined();
  });

  it('maps SLOT wafer select result and disables OK for Etch mismatch', async () => {
    vi.mocked(fetchLotInfo).mockResolvedValueOnce({
      ...baseLot,
      createCategory: 'SLOT',
      checkEtch: 'Y',
    });
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    store.slotQuantity = '3';
    store.slotCheckEtch = 'Y';
    store.applyWaferSelectResult({
      sequence: '',
      selectedWaferList: '',
      selectedMachine: 'W1,W2',
    });

    expect(store.form.comment).toBe('W1,W2');
    expect(store.okEnabled).toBe(false);
    expect(store.messages.at(-1)?.message).toBe(
      'Etch Dummy/Test Lot은 모든 W/F Handling 이후에  Move Out이 가능 합니다. ',
    );
  });

  it('updates skip wafer and enables OK when update flag is Y', async () => {
    vi.mocked(updateSkipWafer).mockResolvedValueOnce({ updateFlag: 'Y' });
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');
    store.okEnabled = false;

    await store.updateSkipWaferResult({ skipWafer: '5', reason: 'REWORK', minusString: '' });

    expect(updateSkipWafer).toHaveBeenCalledWith({
      lotId: 'LOT-DEMO-01',
      machineName: '',
      recipeName: '',
      skipWafer: '5',
      operatorId: 'OPERATOR_ID',
      skipReason: 'REWORK',
      minusString: '',
    });
    expect(store.okEnabled).toBe(true);
  });

  it('shows an error dialog when skip wafer update fails', async () => {
    vi.mocked(updateSkipWafer).mockRejectedValueOnce(new Error('skip wafer fail'));
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');
    store.okEnabled = false;

    await expect(
      store.updateSkipWaferResult({ skipWafer: '5', reason: 'REWORK', minusString: '' }),
    ).resolves.toBeUndefined();

    expect(store.okEnabled).toBe(false);
    expect(store.messages.at(-1)).toEqual({
      kind: 'error',
      title: '에  러',
      message: 'skip wafer fail',
    });
  });

  it('executes single-lot move out after login check', async () => {
    vi.mocked(checkLoginUser).mockResolvedValueOnce({ areaCheck: 'Y' });
    vi.mocked(executeMoveOut).mockResolvedValueOnce({ tanpi: '', sampleResult: '' });
    vi.mocked(fetchMoveOutFqcSampling).mockResolvedValueOnce({
      cycleComment: '',
      recipeComment: '',
      deleteCode: '',
      updateCode: '',
    });
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    await expect(store.executeOk()).resolves.toEqual({ branch: 'single' });

    expect(executeMoveOut).toHaveBeenCalled();
    expect(fetchMoveOutFqcSampling).toHaveBeenCalled();
    expect(setProbeCardHistory).not.toHaveBeenCalled();
  });

  it('requires confirmation before moving out when next process skip is checked', async () => {
    vi.mocked(checkLoginUser).mockResolvedValue({ areaCheck: 'Y' });
    vi.mocked(executeMoveOut).mockResolvedValue({ tanpi: '', sampleResult: '' });
    vi.mocked(fetchMoveOutFqcSampling).mockResolvedValue({
      cycleComment: '',
      recipeComment: '',
      deleteCode: '',
      updateCode: '',
    });
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');
    store.form.nextProcessSkip = true;

    await expect(store.executeOk()).resolves.toEqual({
      branch: 'skip-confirm',
      nextOperation: 'NEXT(200000)',
    });
    expect(executeMoveOut).not.toHaveBeenCalled();

    await expect(store.executeOk({ skipConfirmed: true })).resolves.toEqual({ branch: 'single' });
    expect(executeMoveOut).toHaveBeenCalledTimes(1);
    expect(executeMoveOut).toHaveBeenCalledWith(
      expect.objectContaining({
        isSkip: 'Y',
        lotId: 'LOT-DEMO-01',
      }),
    );
  });

  it('returns batch branch instead of MOVEOUT when batch id exists', async () => {
    vi.mocked(fetchLotInfo).mockResolvedValueOnce({ ...baseLot, batchId: 'BAT-ID' });
    vi.mocked(checkLoginUser).mockResolvedValueOnce({ areaCheck: 'Y' });
    const store = useMoveOutStore();
    await store.loadLotInfo('LOT-DEMO-01');

    await expect(store.executeOk()).resolves.toEqual({ branch: 'batch' });
    expect(executeMoveOut).not.toHaveBeenCalled();
  });
});
