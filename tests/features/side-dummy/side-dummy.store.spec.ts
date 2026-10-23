import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { sideDummyService } from 'src/features/side-dummy/services/side-dummy.service';
import { useSideDummyStore } from 'src/features/side-dummy/stores/side-dummy.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useSideDummyStore', () => {
  let store: ReturnType<typeof useSideDummyStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSideDummyStore();

    const mainStore = useMainStore();
    mainStore.operatorName = 'TEST_OP';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default states', () => {
    expect(store.eqpId).toBe('');
    expect(store.lotId).toBe('');
    expect(store.operId).toBe('');
    expect(store.operDesc).toBe('');
    expect(store.inDate).toBe('');
    expect(store.inUser).toBe('');
    expect(store.isLotDisabled).toBe(true);
    expect(store.isLotSearchEnabled).toBe(false);
    expect(store.isBtnInEnabled).toBe(false);
    expect(store.isBtnOutEnabled).toBe(false);
    expect(store.isLoading).toBe(false);
    expect(store.alertDialog.open).toBe(false);
  });

  describe('clear methods', () => {
    it('clearEQPSearchInfo resets display fields', () => {
      store.lotId = 'LOT-1';
      store.operId = '100';
      store.operDesc = 'DESC';
      store.inDate = '2026-10-22';
      store.inUser = 'USER';

      store.clearEQPSearchInfo();

      expect(store.lotId).toBe('');
      expect(store.operId).toBe('');
      expect(store.operDesc).toBe('');
      expect(store.inDate).toBe('');
      expect(store.inUser).toBe('');
    });

    it('clearLotSearchInfo resets temporary operation fields', () => {
      store.searchOperId = '100';
      store.searchOperDesc = 'DESC';

      store.clearLotSearchInfo();

      expect(store.searchOperId).toBe('');
      expect(store.searchOperDesc).toBe('');
    });

    it('clearInfo resets all info and locks buttons', () => {
      store.lotId = 'LOT-1';
      store.isLotDisabled = false;
      store.isBtnInEnabled = true;
      store.isBtnOutEnabled = true;

      store.clearInfo();

      expect(store.lotId).toBe('');
      expect(store.isLotDisabled).toBe(true);
      expect(store.isBtnInEnabled).toBe(false);
      expect(store.isBtnOutEnabled).toBe(false);
    });
  });

  describe('alert dialog controls', () => {
    it('shows and closes alert dialog', () => {
      store.showAlert('TEST TITLE', 'TEST MESSAGE');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('TEST TITLE');
      expect(store.alertDialog.message).toBe('TEST MESSAGE');

      store.closeAlert();
      expect(store.alertDialog.open).toBe(false);
      expect(store.alertDialog.title).toBe('');
      expect(store.alertDialog.message).toBe('');
    });
  });

  describe('getEqpInfo', () => {
    it('shows error if equipment id is empty', async () => {
      const ok = await store.getEqpInfo('');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('ERROR');
      expect(store.alertDialog.message).toBe('장비명을 입력하여 주세요.');
      expect(store.focusTarget).toBe('eqp');
    });

    it('unlocks lot input when equipment has no dummy loaded (LOTNAME empty)', async () => {
      vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
        ok: true,
        data: {
          LOTNAME: '',
          PROCESSOPERATIONNAME: '1000',
          PODESC: 'PHOTO OPERATION',
          IN_TIME: '2026-10-22 10:00:00',
          IN_USER: 'USER01',
        },
      });

      const ok = await store.getEqpInfo('EQP-01');
      expect(ok).toBe(true);
      expect(store.eqpId).toBe('EQP-01');
      expect(store.operId).toBe('1000');
      expect(store.operDesc).toBe('PHOTO OPERATION');
      expect(store.inDate).toBe('2026-10-22 10:00:00');
      expect(store.inUser).toBe('USER01');
      expect(store.isLotDisabled).toBe(false);
      expect(store.isLotSearchEnabled).toBe(true);
      expect(store.isBtnOutEnabled).toBe(false);
      expect(store.focusTarget).toBe('lot');
    });

    it('enables OUT button when equipment has dummy loaded (LOTNAME present)', async () => {
      vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
        ok: true,
        data: {
          LOTNAME: 'DUMMY-LOT-99',
          PROCESSOPERATIONNAME: '2000',
          PODESC: 'ETCH OPERATION',
          IN_TIME: '2026-10-22 09:00:00',
          IN_USER: 'USER02',
        },
      });

      const ok = await store.getEqpInfo('EQP-02');
      expect(ok).toBe(true);
      expect(store.lotId).toBe('DUMMY-LOT-99');
      expect(store.isBtnOutEnabled).toBe(true);
      expect(store.isBtnInEnabled).toBe(false);
    });

    it('shows alert popup when API returns error', async () => {
      vi.spyOn(sideDummyService, 'selectEqp').mockResolvedValueOnce({
        ok: false,
        message: '장비 조회에 실패했습니다.',
      });

      const ok = await store.getEqpInfo('EQP-BAD');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('장비 조회에 실패했습니다.');
      expect(store.focusTarget).toBe('eqp');
    });

    it('handles unexpected exceptions in getEqpInfo', async () => {
      vi.spyOn(sideDummyService, 'selectEqp').mockRejectedValueOnce(new Error('Crash in service'));

      const ok = await store.getEqpInfo('EQP-CRASH');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('Crash in service');
      expect(store.focusTarget).toBe('eqp');
    });
  });

  describe('getLotInfo', () => {
    it('shows error if lot id is empty', async () => {
      store.eqpId = 'EQP-01';
      const ok = await store.getLotInfo('');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('ERROR');
      expect(store.alertDialog.message).toBe('LOT을 입력하여 주세요.');
      expect(store.focusTarget).toBe('lot');
    });

    it('updates operation info and enables IN button upon success', async () => {
      store.eqpId = 'EQP-01';
      vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
        ok: true,
        data: {
          PROCESSOPERATIONNAME: '3000',
          PODESC: 'DIFF OPERATION',
        },
      });

      const ok = await store.getLotInfo('LOT-VALID');
      expect(ok).toBe(true);
      expect(store.lotId).toBe('LOT-VALID');
      expect(store.operId).toBe('3000');
      expect(store.operDesc).toBe('DIFF OPERATION');
      expect(store.searchOperId).toBe('3000');
      expect(store.searchOperDesc).toBe('DIFF OPERATION');
      expect(store.isBtnInEnabled).toBe(true);
    });

    it('shows alert popup when lot lookup API fails', async () => {
      store.eqpId = 'EQP-01';
      vi.spyOn(sideDummyService, 'selectLot').mockResolvedValueOnce({
        ok: false,
        message: '해당 LOT을 찾을 수 없습니다.',
      });

      const ok = await store.getLotInfo('LOT-INVALID');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('해당 LOT을 찾을 수 없습니다.');
      expect(store.focusTarget).toBe('lot');
    });

    it('handles unexpected exceptions in getLotInfo', async () => {
      store.eqpId = 'EQP-01';
      vi.spyOn(sideDummyService, 'selectLot').mockRejectedValueOnce(new Error('Network error'));

      const ok = await store.getLotInfo('LOT-ERR');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('Network error');
      expect(store.focusTarget).toBe('lot');
    });
  });

  describe('executeInOut', () => {
    it('validates empty equipment id', async () => {
      store.eqpId = '';
      store.lotId = 'LOT-01';
      const ok = await store.executeInOut('IN');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('장비명을 입력하여 주세요.');
      expect(store.focusTarget).toBe('eqp');
    });

    it('validates empty lot id', async () => {
      store.eqpId = 'EQP-01';
      store.lotId = '';
      const ok = await store.executeInOut('IN');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('LOT을 입력하여 주세요.');
      expect(store.focusTarget).toBe('lot');
    });

    it('successfully processes IN transaction', async () => {
      store.eqpId = 'EQP-01';
      store.lotId = 'LOT-01';
      store.searchOperId = '1000';
      store.searchOperDesc = 'DESC';
      store.isBtnInEnabled = true;

      vi.spyOn(sideDummyService, 'insertInOut').mockResolvedValueOnce({
        ok: true,
        data: {
          RET: 'IN 처리 정상 완료',
        },
      });

      const ok = await store.executeInOut('IN');
      expect(ok).toBe(true);
      expect(store.eqpId).toBe('');
      expect(store.isBtnInEnabled).toBe(false);
      expect(store.isBtnOutEnabled).toBe(false);
      expect(store.focusTarget).toBe('eqp');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_OK);
      expect(store.alertDialog.message).toBe('IN 처리 정상 완료');
    });

    it('successfully processes OUT transaction', async () => {
      store.eqpId = 'EQP-01';
      store.lotId = 'LOT-01';
      store.searchOperId = '2000';
      store.searchOperDesc = 'DESC';
      store.isBtnOutEnabled = true;

      vi.spyOn(sideDummyService, 'insertInOut').mockResolvedValueOnce({
        ok: true,
        data: {
          RET: 'OUT 처리 정상 완료',
        },
      });

      const ok = await store.executeInOut('OUT');
      expect(ok).toBe(true);
      expect(store.isLotDisabled).toBe(false);
      expect(store.focusTarget).toBe('lot');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_OK);
      expect(store.alertDialog.message).toBe('OUT 처리 정상 완료');
    });

    it('handles insert failure', async () => {
      store.eqpId = 'EQP-01';
      store.lotId = 'LOT-01';

      vi.spyOn(sideDummyService, 'insertInOut').mockResolvedValueOnce({
        ok: false,
        message: '작업 실패하였습니다.',
      });

      const ok = await store.executeInOut('IN');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('작업 실패하였습니다.');
    });

    it('handles exception in executeInOut', async () => {
      store.eqpId = 'EQP-01';
      store.lotId = 'LOT-01';

      vi.spyOn(sideDummyService, 'insertInOut').mockRejectedValueOnce(new Error('Fatal error'));

      const ok = await store.executeInOut('OUT');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('Fatal error');
    });
  });
});
