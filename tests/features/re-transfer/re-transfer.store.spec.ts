import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { reTransferService } from 'src/features/re-transfer/services/re-transfer.service';
import { useReTransferStore } from 'src/features/re-transfer/stores/re-transfer.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: vi.fn(),
  },
}));

describe('useReTransferStore', () => {
  let store: ReturnType<typeof useReTransferStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useReTransferStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearInfo and resetState', () => {
    it('clears all dependent dropdowns and state in clearInfo', () => {
      store.currentStk = 'STK01';
      store.fabs = ['FAB4'];
      store.selectedFab = 'FAB4';
      store.bays = ['BAY01'];
      store.selectedBay = 'BAY01';
      store.stockers = ['STK01'];
      store.selectedStocker = 'STK01';
      store.ports = ['OUT'];
      store.selectedPort = 'OUT';
      store.pdas = ['지정안함'];
      store.selectedPda = '지정안함';

      store.clearInfo();

      expect(store.currentStk).toBe('');
      expect(store.fabs).toEqual([]);
      expect(store.selectedFab).toBeNull();
      expect(store.bays).toEqual([]);
      expect(store.selectedBay).toBeNull();
      expect(store.stockers).toEqual([]);
      expect(store.selectedStocker).toBeNull();
      expect(store.ports).toEqual([]);
      expect(store.selectedPort).toBeNull();
      expect(store.pdas).toEqual([]);
      expect(store.selectedPda).toBeNull();
    });

    it('resets full singleton state including lotId and focusTarget in resetState', () => {
      store.lotId = 'LOT123';
      store.currentStk = 'STK01';
      store.focusTarget = 'lot';

      store.resetState();

      expect(store.lotId).toBe('');
      expect(store.currentStk).toBe('');
      expect(store.focusTarget).toBeNull();
    });
  });

  describe('showAlert delegation', () => {
    it('delegates alerts directly to okDialog.show with standard parameters', () => {
      store.showAlert('ERROR_TITLE', 'Test error message');
      expect(okDialog.show).toHaveBeenCalledWith(
        'ERROR_TITLE',
        'Test error message',
        COMMON_FIELD.BTNOKSTR,
      );
    });
  });

  describe('fetchCarryInfo', () => {
    it('calls CommonUtil.hideKeyboard and shows error if lotId is empty', async () => {
      const hideKeyboardSpy = vi.spyOn(CommonUtil, 'hideKeyboard');
      const res = await store.fetchCarryInfo('');
      expect(res).toBe(false);
      expect(hideKeyboardSpy).toHaveBeenCalled();
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'LOT NO를 입력해주세요',
        COMMON_FIELD.BTNOKSTR,
      );
      expect(store.focusTarget).toBe('lot');
    });

    it('shows error if service call fails and sets focusTarget = lot only after dialog resolves', async () => {
      vi.spyOn(reTransferService, 'getCarryInfo').mockResolvedValueOnce({
        ok: false,
        message: 'Invalid Lot',
      });

      let resolveDialog!: (val: number) => void;
      vi.mocked(okDialog.show).mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            resolveDialog = resolve;
          }),
      );

      const promise = store.fetchCarryInfo('LOT999');
      await Promise.resolve();
      await Promise.resolve();

      // While dialog is open, isLoading is already false and focusTarget is not yet set
      expect(store.isLoading).toBe(false);
      expect(store.focusTarget).toBeNull();
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'Invalid Lot',
        COMMON_FIELD.BTNOKSTR,
      );

      resolveDialog(1);
      const res = await promise;
      expect(res).toBe(false);
      expect(store.focusTarget).toBe('lot');
    });

    it('successfully loads carry info, auto-selects OUT port, and auto-selects FAB4 without fetching bay', async () => {
      vi.spyOn(reTransferService, 'getCarryInfo').mockResolvedValueOnce({
        ok: true,
        data: {
          currentStk: 'STK01',
          fabs: ['FAB4', 'FAB5'],
          ports: ['OUT  출고 1', 'IN  입고 1'],
          outPortIndex: 0,
        },
      });

      const getFabBayInfoSpy = vi.spyOn(reTransferService, 'getFabBayInfo');

      const res = await store.fetchCarryInfo('LOT001');
      expect(res).toBe(true);
      expect(store.currentStk).toBe('STK01');
      expect(store.fabs).toEqual(['FAB4', 'FAB5']);
      expect(store.ports).toEqual(['OUT  출고 1', 'IN  입고 1']);
      expect(store.selectedPort).toBe('OUT  출고 1');
      expect(store.selectedFab).toBe('FAB4');
      // Parity with Android initFabCheck: auto-selecting FAB4 does NOT auto-fetch BAY
      expect(getFabBayInfoSpy).not.toHaveBeenCalled();
      expect(store.bays).toEqual([]);
      expect(store.focusTarget).toBe('lot');
    });
  });

  describe('selectFab', () => {
    it('shows error if fab is empty', async () => {
      await store.selectFab('');
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '다음 FAB을 선택해주세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('shows error if getFabBayInfo service fails', async () => {
      vi.spyOn(reTransferService, 'getFabBayInfo').mockResolvedValueOnce({
        ok: false,
        message: 'FAB error',
      });

      await store.selectFab('FAB4');
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'FAB error',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('updates bays on success', async () => {
      vi.spyOn(reTransferService, 'getFabBayInfo').mockResolvedValueOnce({
        ok: true,
        data: { bays: ['BAY01', 'BAY02'] },
      });

      await store.selectFab('FAB4');
      expect(store.bays).toEqual(['BAY01', 'BAY02']);
    });
  });

  describe('selectBay', () => {
    it('shows error if fab is not selected', async () => {
      store.selectedFab = null;
      await store.selectBay('BAY01');
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '다음 FAB을 선택해주세요',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('shows error if bay is empty', async () => {
      store.selectedFab = 'FAB4';
      await store.selectBay('');
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '다음 BAY를 선택해주세요',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('shows error if stocker service fails while still updating PDA list', async () => {
      store.selectedFab = 'FAB4';
      vi.spyOn(reTransferService, 'getBayStockerInfo').mockResolvedValueOnce({
        ok: false,
        message: 'Stocker error',
      });
      vi.spyOn(reTransferService, 'getPdaList').mockResolvedValueOnce({
        ok: true,
        data: { pdas: ['지정안함', 'PDA01  홍길동(12345)'] },
      });

      await store.selectBay('BAY01');
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'Stocker error',
        COMMON_FIELD.BTNOKSTR,
      );
      expect(store.pdas).toEqual(['지정안함', 'PDA01  홍길동(12345)']);
      expect(store.selectedPda).toBe('지정안함');
    });

    it('awaits BAYSTOCKERINFO error dialog before showing PDALIST error dialog when both fail', async () => {
      store.selectedFab = 'FAB4';
      vi.spyOn(reTransferService, 'getBayStockerInfo').mockResolvedValueOnce({
        ok: false,
        message: 'Stocker error 1',
      });
      vi.spyOn(reTransferService, 'getPdaList').mockResolvedValueOnce({
        ok: false,
        message: 'PDA error 2',
      });

      let resolveFirst!: (val: number) => void;
      let resolveSecond!: (val: number) => void;
      vi.mocked(okDialog.show)
        .mockImplementationOnce(
          () =>
            new Promise<number>((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<number>((resolve) => {
              resolveSecond = resolve;
            }),
        );

      const promise = store.selectBay('BAY01');
      await Promise.resolve();
      await Promise.resolve();

      // First dialog is shown, second dialog has NOT been called yet
      expect(okDialog.show).toHaveBeenCalledTimes(1);
      expect(okDialog.show).toHaveBeenNthCalledWith(
        1,
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'Stocker error 1',
        COMMON_FIELD.BTNOKSTR,
      );

      // User confirms first dialog -> second dialog is now shown
      resolveFirst(1);
      await Promise.resolve();
      await Promise.resolve();

      expect(okDialog.show).toHaveBeenCalledTimes(2);
      expect(okDialog.show).toHaveBeenNthCalledWith(
        2,
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'PDA error 2',
        COMMON_FIELD.BTNOKSTR,
      );

      resolveSecond(1);
      await promise;
    });

    it('updates stockers, pdas and auto-selects 지정안함 (InitSpinnerAdapter position 1 = index 0)', async () => {
      store.selectedFab = 'FAB4';
      vi.spyOn(reTransferService, 'getBayStockerInfo').mockResolvedValueOnce({
        ok: true,
        data: { stockers: ['STK01', 'STK02'] },
      });
      vi.spyOn(reTransferService, 'getPdaList').mockResolvedValueOnce({
        ok: true,
        data: { pdas: ['지정안함', 'PDA01  홍길동(12345)'] },
      });

      await store.selectBay('BAY01');
      expect(store.stockers).toEqual(['STK01', 'STK02']);
      expect(store.pdas).toEqual(['지정안함', 'PDA01  홍길동(12345)']);
      expect(store.selectedPda).toBe('지정안함');
    });
  });

  describe('executeCarry validation and execution', () => {
    it('validates LOT NO', async () => {
      store.lotId = '';
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'LOT NO를 입력하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates CURRENTSTK', async () => {
      store.lotId = 'LOT001';
      store.currentStk = '';
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'LOT이 STOCKER내에 없습니다.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates selectedFab', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = null;
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '반송할 FAB을 선택하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates selectedBay', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = 'FAB4';
      store.selectedBay = null;
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '반송할 BAY를 선택하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates selectedStocker', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = 'FAB4';
      store.selectedBay = 'BAY01';
      store.selectedStocker = null;
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '반송할 STOCKER를 선택하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates selectedPort', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = 'FAB4';
      store.selectedBay = 'BAY01';
      store.selectedStocker = 'STK01';
      store.selectedPort = null;
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '출고할 PORT를 선택하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('validates selectedPda', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = 'FAB4';
      store.selectedBay = 'BAY01';
      store.selectedStocker = 'STK01';
      store.selectedPort = 'OUT';
      store.selectedPda = null;
      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '반송여부를 알려줄 PDA를 선택하세요.',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('converts 지정안함 to empty string for currentStk and handles API failure', async () => {
      store.lotId = 'LOT001';
      store.currentStk = '지정안함';
      store.selectedFab = 'FAB4';
      store.selectedBay = 'BAY01';
      store.selectedStocker = 'STK01';
      store.selectedPort = 'OUT';
      store.selectedPda = 'PDA01';

      const carrySpy = vi.spyOn(reTransferService, 'executeCarry').mockResolvedValueOnce({
        ok: false,
        message: 'Carry failed',
      });

      const res = await store.executeCarry();
      expect(res).toBe(false);
      expect(carrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStk: '',
        }),
      );
      expect(okDialog.show).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'Carry failed',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('executes carry successfully and re-fetches carry info', async () => {
      store.lotId = 'LOT001';
      store.currentStk = 'STK01';
      store.selectedFab = 'FAB4';
      store.selectedBay = 'BAY01';
      store.selectedStocker = 'STK01';
      store.selectedPort = 'OUT';
      store.selectedPda = 'PDA01';

      vi.spyOn(reTransferService, 'executeCarry').mockResolvedValueOnce({
        ok: true,
      });

      const getCarryInfoSpy = vi.spyOn(reTransferService, 'getCarryInfo').mockResolvedValueOnce({
        ok: true,
        data: {
          currentStk: 'STK01',
          fabs: ['FAB4'],
          ports: ['OUT'],
        },
      });

      const res = await store.executeCarry();
      expect(res).toBe(true);
      expect(getCarryInfoSpy).toHaveBeenCalledWith('LOT001', expect.any(String));
    });
  });
});
