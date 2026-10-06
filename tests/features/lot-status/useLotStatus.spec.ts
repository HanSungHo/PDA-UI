import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchLotStatus: vi.fn(),
  fetchSlotParticle: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}));
vi.mock('src/features/lot-status/services/lot-status.service', () => ({
  fetchLotStatus: mocks.fetchLotStatus,
  fetchSlotParticle: mocks.fetchSlotParticle,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push, back: mocks.back }) }));

import { mapLotStatus, useLotStatus } from 'src/features/lot-status/composables/useLotStatus';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useWaferSelectStore } from 'src/features/move-out/stores/wafer-select.store';
import { okDialog } from 'src/services/ok-dialog.service';

const lot = {
  JOBCODE: 'JOB-A',
  PRODUCT: 'PRODUCT-A',
  FACILITY: 'FAB-A',
  PROCESSSTEP: 'ETCH',
  OPERATION: '100',
  SUBOPERATION: '00',
  NEXTPROCESSSTEP: 'CLEAN',
  NEXTOPERATION: '110',
  NEXTSUBOPERATION: '01',
  HOLDCODE: 'ONHOLD',
  STATUS: 'RUN',
  HOLD_COMMENT: 'SPC OUT HOLD',
  WAFERLIST: 'W01,W02',
  REWORKINFO: 'Y',
  REWORKCOUNT: '2',
  REWORKCODE: 'RW',
  AREA: 'A1',
  QUANTITY: '25',
  DUEDATE: '2026-10-05',
  BAY: 'B1',
  OWNER: 'OP',
  STOCKER: 'STK',
  CATEGORY: 'PROD',
  CURRENTEQPID: 'EQP-A',
};

describe('Lot Status legacy flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useMainStore().facility = 'FAB-A';
    vi.clearAllMocks();
    vi.spyOn(okDialog, 'show').mockResolvedValue(1);
    mocks.fetchLotStatus.mockResolvedValue(lot);
    mocks.fetchSlotParticle.mockResolvedValue([
      { SLOT: '01', VALUE: '12' },
      { SLOT: '02', VALUE: '8' },
    ]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('maps all displayed fields and gives ONHOLD precedence over RUN', () => {
    expect(mapLotStatus(lot)).toMatchObject({
      txtJobResult: 'JOB-A',
      txtStatusResult: 'HOLD',
      txtProductName: 'PRODUCT-A',
      txtCurrentOperation: 'ETCH(10000)',
      tOperation: 'CLEAN(11001)',
      txtRework: 'Y',
      txtReworkCount: '2',
      txtRwCd: 'RW',
      txtHold: 'Y',
      txtHoldCd: 'ONHOLD',
      txtArea: 'A1',
      txtQuantity: '25',
      txtDueData: '2026-10-05',
      txtBay: 'B1',
      txtOwner: 'OP',
      txtStk: 'STK',
      txtLotKinds: 'PROD',
      txtMachine: 'EQP-A',
      txtFacility: 'FAB-A',
    });
    expect(mapLotStatus({ STATUS: 'WAIT' }).txtStatusResult).toBe('WAIT');
    expect(mapLotStatus({ STATUS: 'RUN' }).txtStatusResult).toBe('RUN');
    expect(mapLotStatus({ STATUS: 'DOWN' }).txtStatusResult).toBe('DOWN');
    expect(mapLotStatus({}).txtStatusResult).toBe('');
    expect(mapLotStatus({ DUEDATE: '2026-1-5' }).txtDueData).toBe('2026-01-05');
    expect(mapLotStatus({ DUEDATE: 'unknown' }).txtDueData).toBe('');
    expect(mapLotStatus({ DUEDATE: '' }).txtDueData).toBe('');
    expect(
      mapLotStatus({ JOBCODE: 7, PRODUCT: true, AREA: null, PROCESSSTEP: {}, STATUS: [] }),
    ).toMatchObject({
      txtJobResult: '7',
      txtProductName: 'true',
      txtArea: '',
      txtStatusResult: '',
    });
  });

  it('searches, stores HOLD and wafer data, then opens read only wafer selection', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('lot-a');
    await screen.searchData();
    expect(mocks.fetchLotStatus).toHaveBeenCalledWith('LOT-A', 'FAB-A');
    expect(screen.hasResult.value).toBe(true);
    expect(screen.g_operation.value).toBe('100-00');
    screen.showWafer();
    expect(useWaferSelectStore().input).toMatchObject({
      lotId: 'LOT-A',
      editable: false,
      existingWaferList: 'W01,W02',
    });
    expect(mocks.push).toHaveBeenCalledWith('/wafer-select');
  });

  it('does not start an initial request while creating the composable', () => {
    useLotStatus();
    expect(mocks.fetchLotStatus).not.toHaveBeenCalled();
  });

  it('classifies RUN, WAIT, HOLD, other, and empty statuses for display', () => {
    const screen = useLotStatus();
    expect(screen.statusKind.value).toBe('');
    screen.fields.txtStatusResult = 'RUN';
    expect(screen.statusKind.value).toBe('run');
    screen.fields.txtStatusResult = 'WAIT';
    expect(screen.statusKind.value).toBe('wait');
    screen.fields.txtStatusResult = 'HOLD';
    expect(screen.statusKind.value).toBe('hold');
    screen.fields.txtStatusResult = 'DOWN';
    expect(screen.statusKind.value).toBe('other');
  });

  it('skips a concurrent request and focuses and selects LOT input after a search', async () => {
    const input = document.createElement('input');
    input.id = 'lot-status-lot';
    const select = vi.fn();
    input.select = select;
    document.body.append(input);
    input.focus();

    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();
    expect(document.activeElement).toBe(input);
    expect(select).toHaveBeenCalledOnce();

    screen.loading.value = true;
    await screen.searchData();
    expect(mocks.fetchLotStatus).toHaveBeenCalledOnce();
  });

  it('loads slot particles only for SPC OUT HOLD', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();
    screen.showHoldCd();
    await vi.waitFor(() =>
      expect(mocks.fetchSlotParticle).toHaveBeenCalledWith('FAB-A', 'LOT-A', '100-00'),
    );
    expect(okDialog.show).toHaveBeenCalledWith(
      'HOLD Comment정보',
      'SPC OUT HOLD\nSLOT:01  VALUE:12\nSLOT:02  VALUE:8',
      '확인',
    );
    mocks.fetchLotStatus.mockResolvedValue({ ...lot, HOLD_COMMENT: 'ordinary comment' });
    await screen.searchData();
    screen.showHoldCd();
    expect(okDialog.show).toHaveBeenCalledWith('HOLD Comment정보', 'ordinary comment', '확인');
    expect(mocks.fetchSlotParticle).toHaveBeenCalledTimes(1);
  });

  it('shows the legacy fallback when particle request fails with a non-Error value', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();
    mocks.fetchSlotParticle.mockRejectedValueOnce('offline');
    screen.showHoldCd();
    await vi.waitFor(() =>
      expect(okDialog.show).toHaveBeenCalledWith(
        '에  러',
        'SPC OUT HOLD\nSLOTPARTICLE failed.',
        '확인',
      ),
    );
  });

  it('shows the server message when particle request fails with an Error', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();
    mocks.fetchSlotParticle.mockRejectedValueOnce(new Error('SLOTPARTICLE unavailable'));
    screen.showHoldCd();
    await vi.waitFor(() =>
      expect(okDialog.show).toHaveBeenCalledWith(
        '에  러',
        'SPC OUT HOLD\nSLOTPARTICLE unavailable',
        '확인',
      ),
    );
  });

  it('ignores repeated button taps for one second across all four actions', async () => {
    mocks.fetchLotStatus.mockResolvedValue({ ...lot, HOLD_COMMENT: 'ordinary comment' });
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();

    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(2000);
      screen.onSingleClick('hold');
      now.mockReturnValue(2500);
      screen.onSingleClick('wafer');
      expect(okDialog.show).toHaveBeenCalledWith('HOLD Comment정보', 'ordinary comment', '확인');
      expect(mocks.push).not.toHaveBeenCalled();

      now.mockReturnValue(3001);
      screen.onSingleClick('wafer');
      expect(mocks.push).toHaveBeenCalledOnce();
    } finally {
      now.mockRestore();
    }
  });

  it('clears old data before a failed or empty search', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    await screen.searchData();
    mocks.fetchLotStatus.mockRejectedValueOnce(new Error('Not found'));
    await screen.searchData();
    expect(screen.fields.txtJobResult).toBe('');
    expect(screen.hasResult.value).toBe(false);
    expect(okDialog.show).toHaveBeenCalledWith('에  러', 'Not found', '확인');
    screen.updateLotNo('');
    await screen.searchData();
    expect(okDialog.show).toHaveBeenCalledWith('에  러', 'LOT ID을 입력하세요', '확인');
    mocks.fetchLotStatus.mockRejectedValueOnce('offline');
    screen.updateLotNo('LOT-B');
    await screen.searchData();
    expect(okDialog.show).toHaveBeenCalledWith('에  러', 'LOTINFO failed.', '확인');
  });

  it('does nothing for an empty HOLD comment and blocks WAFER without a result', () => {
    const screen = useLotStatus();
    screen.showHoldCd();
    expect(okDialog.show).not.toHaveBeenCalled();
    screen.showWafer();
    expect(okDialog.show).toHaveBeenCalledWith('에  러', '조회된 정보가 없습니다.', '확인');
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('dispatches search and close through the shared button handler', async () => {
    const screen = useLotStatus();
    screen.updateLotNo('LOT-A');
    const now = vi.spyOn(Date, 'now').mockReturnValue(2000);
    try {
      screen.onSingleClick('search');
      await vi.waitFor(() => expect(mocks.fetchLotStatus).toHaveBeenCalledOnce());
      now.mockReturnValue(3001);
      screen.onSingleClick('close');
      expect(mocks.back).toHaveBeenCalledOnce();
    } finally {
      now.mockRestore();
    }
  });

  it('parses scanner input on Enter and clears results for an invalid barcode', async () => {
    const screen = useLotStatus();
    screen.updateLotNo(' $LOT-AX');
    screen.handleLotEnter();
    await vi.waitFor(() => expect(mocks.fetchLotStatus).toHaveBeenCalledWith('LOT-A', 'FAB-A'));
    expect(screen.editLotNo.value).toBe('LOT-A');
    screen.updateLotNo('INVALID');
    screen.handleLotEnter();
    expect(screen.hasResult.value).toBe(false);
    expect(screen.editLotNo.value).toBe('');
    expect(mocks.fetchLotStatus).toHaveBeenCalledTimes(1);
  });
});
