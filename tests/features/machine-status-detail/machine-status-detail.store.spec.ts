import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { machineStatusDetailService } from 'src/features/machine-status-detail/services/machine-status-detail.service';
import {
  extractItemList,
  useMachineStatusDetailStore,
} from 'src/features/machine-status-detail/stores/machine-status-detail.store';
import { useMainStore } from 'src/features/main/stores/main.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useMachineStatusDetailStore', () => {
  let store: ReturnType<typeof useMachineStatusDetailStore>;
  let mainStore: ReturnType<typeof useMainStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMachineStatusDetailStore();
    mainStore = useMainStore();
    mainStore.facility = 'FAB1';
    mainStore.operatorId = 'OP100';
    mainStore.operatorName = '김철수';
    DeviceInfo.OPERATOR_ID = 'OP100';
    DeviceInfo.OPERATOR_NAME = '김철수';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractItemList helper', () => {
    it('handles array, single ITEM object, ITEM array, and empty inputs', () => {
      expect(extractItemList(null)).toEqual([]);
      expect(extractItemList(undefined)).toEqual([]);
      expect(extractItemList([{ a: 1 }])).toEqual([{ a: 1 }]);
      expect(extractItemList({ ITEM: { a: 2 } })).toEqual([{ a: 2 }]);
      expect(extractItemList({ ITEM: [{ a: 3 }, { a: 4 }] })).toEqual([{ a: 3 }, { a: 4 }]);
      expect(extractItemList({})).toEqual([]);
    });
  });

  describe('setEQPInfo', () => {
    it('shows error alert when eqpId is empty', async () => {
      const ok = await store.setEQPInfo('');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('EQP ID를 입력하세요');
      expect(store.focusTarget).toBe('eqp');
    });

    it('populates equipment info, spinners, and auto-selects matching downCode on first load', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpStatus').mockResolvedValueOnce({
        ok: true,
        data: {
          FACILITY: 'FAB1',
          MAINSTATUS: 'RUN',
          SUBSTATUS: 'NORMAL',
          FINALWORKTIME: '2026-10-26 09:30:00',
          FDCDOWN: 'OK',
          EQPSTATUSCODE: 'R',
          EQPSTATUSDESC: '가동중',
          DOWNCODE: 'RN001',
          DOWNDESC: '정상가동',
          STATUSITEMS: {
            ITEM: [
              { EQPSTATUSCODE: 'R', EQPSTATUSDESC: '가동중' },
              { EQPSTATUSCODE: 'C', EQPSTATUSDESC: '비부하(LOAD DOWN)' },
            ],
          },
        },
      });

      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCODEITEMS: {
            ITEM: [
              { EQPDOWNCODE: 'RN001', EQPDOWNDESC: '정상가동' },
              { EQPDOWNCODE: 'RN002', EQPDOWNDESC: '조건가동' },
            ],
          },
        },
      });

      vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCOMMENTITEMS: {
            ITEM: { DOWNCOMMENT: '자동 선택 코멘트' },
          },
        },
      });

      const ok = await store.setEQPInfo('mc01');
      expect(ok).toBe(true);
      expect(store.eqpId).toBe('MC01');
      expect(store.facility).toBe('FAB1');
      expect(store.mainStatus).toBe('RUN');
      expect(store.subStatus).toBe('NORMAL');
      expect(store.finalWorkTime).toBe('2026-10-26 09:30:00');
      expect(store.fdcState).toBe('OK');
      expect(store.operator).toBe('김철수(OP100)');
      expect(store.oriEQPStatus).toBe('R  가동중');
      expect(store.oriDownCode).toBe('RN001');
      expect(store.mainState).toBe('RUN');

      expect(store.statusOptions).toEqual([
        { value: 'R', label: 'R  가동중' },
        { value: 'C', label: 'C  비부하(LOAD DOWN)' },
      ]);
      expect(store.selectedEqpState).toBe('');
      expect(store.selectedDownCode).toBe('RN001');
      expect(store.first).toBe(false);
      expect(store.hasCommentAdapter).toBe(true);
      expect(store.comment).toBe('자동 선택 코멘트');
    });

    it('shows error alert when eqpStatus API fails', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpStatus').mockResolvedValueOnce({
        ok: false,
        message: '장비 조회 에러',
      });

      const ok = await store.setEQPInfo('MC99');
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('장비 조회 에러');
      expect(store.focusTarget).toBe('eqp');

      store.closeAlert();
      expect(store.alertDialog.open).toBe(false);
    });

    it('handles unexpected exception in setEQPInfo', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpStatus').mockRejectedValueOnce(
        new Error('Crash in eqpStatus'),
      );

      const ok = await store.setEQPInfo('MC99');
      expect(ok).toBe(false);
      expect(store.alertDialog.message).toBe('Crash in eqpStatus');
    });

    it('handles eqpDownCode failure and exception in setDownCodeSpinner', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValueOnce({
        ok: false,
        message: 'DownCode 에러',
      });
      const ok1 = await store.setDownCodeSpinner('R  가동중', null);
      expect(ok1).toBe(false);
      expect(store.alertDialog.message).toBe('DownCode 에러');
      store.closeAlert();

      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockRejectedValueOnce(
        new Error('DownCode exception'),
      );
      const ok2 = await store.setDownCodeSpinner('R', null);
      expect(ok2).toBe(false);
      expect(store.alertDialog.message).toBe('DownCode exception');
    });

    it('handles eqpDownComment failure and exception in setCommentSpinner', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockResolvedValueOnce({
        ok: false,
        message: 'Comment 에러',
      });
      expect(await store.setCommentSpinner('RN001')).toBe(false);

      vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockRejectedValueOnce(
        new Error('Comment exception'),
      );
      expect(await store.setCommentSpinner('RN001')).toBe(false);
    });
  });

  describe('selectEqpState and selectDownCode', () => {
    beforeEach(() => {
      store.eqpId = 'MC01';
      store.first = false;
      store.statusOptions = [
        { value: 'R', label: 'R  가동중' },
        { value: 'C', label: 'C  비부하(LOAD DOWN)' },
        { value: 'D', label: 'D  고장정지(BM)' },
        { value: 'P', label: 'P  예방정비(PM)' },
      ];
    });

    it('auto-selects first downCode when status is C and !first', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCODEITEMS: {
            ITEM: [
              { EQPDOWNCODE: 'CA001', EQPDOWNDESC: 'LOT 대기' },
              { EQPDOWNCODE: 'CA002', EQPDOWNDESC: '작업자 부재' },
            ],
          },
        },
      });

      const commentSpy = vi
        .spyOn(machineStatusDetailService, 'eqpDownComment')
        .mockResolvedValueOnce({
          ok: true,
          data: {
            DOWNCOMMENTITEMS: {
              ITEM: [{ DOWNCOMMENT: 'C1' }, { DOWNCOMMENT: 'C2' }],
            },
          },
        });

      await store.selectEqpState('C');

      expect(store.selectedEqpState).toBe('C');
      expect(store.selectedDownCode).toBe('CA001');
      expect(commentSpy).toHaveBeenCalledWith('FAB1', 'CA001');
      expect(store.commentOptions).toEqual(['C1', 'C2']);
      expect(store.comment).toBe('');
    });

    it('auto-selects downCode when status is P with a single item and !first', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCODEITEMS: {
            ITEM: [{ EQPDOWNCODE: 'PM001', EQPDOWNDESC: '정기 PM' }],
          },
        },
      });

      vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCOMMENTITEMS: {
            ITEM: [{ DOWNCOMMENT: '정기 PM 진행' }],
          },
        },
      });

      await store.selectEqpState('P');

      expect(store.selectedDownCode).toBe('PM001');
      expect(store.comment).toBe('정기 PM 진행');
    });

    it('leaves selectedDownCode empty when status is D with multiple items and !first', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownCode').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCODEITEMS: {
            ITEM: [
              { EQPDOWNCODE: 'BM001', EQPDOWNDESC: '장비 고장' },
              { EQPDOWNCODE: 'BM002', EQPDOWNDESC: 'PART 교체' },
            ],
          },
        },
      });

      await store.selectEqpState('D');
      expect(store.selectedDownCode).toBe('');
    });

    it('loads comments when selectDownCode is called', async () => {
      vi.spyOn(machineStatusDetailService, 'eqpDownComment').mockResolvedValueOnce({
        ok: true,
        data: {
          DOWNCOMMENTITEMS: {
            ITEM: [{ DOWNCOMMENT: '부품 교체 완료' }],
          },
        },
      });

      await store.selectDownCode('BM002');
      expect(store.selectedDownCode).toBe('BM002');
      expect(store.comment).toBe('부품 교체 완료');
    });
  });

  describe('handleChamberChecked', () => {
    it('resets chamberMachine when unchecked', async () => {
      store.chamberMachine = 'CH1,CH2';
      await store.handleChamberChecked(false);
      expect(store.isChamberChecked).toBe(false);
      expect(store.chamberMachine).toBe('');
    });

    it('shows alert when mainState is empty on check', async () => {
      store.mainState = '';
      store.eqpId = 'MC01';
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {},
      });

      await store.handleChamberChecked(true);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_ERROR);
      expect(store.alertDialog.message).toBe('조회된 장비 정보가 없습니다');
    });

    it('unchecks and shows OkDialog when RMAG is returned', async () => {
      store.mainState = 'RUN';
      store.eqpId = 'MC01';
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {
          RMAG: 'MAIN 장비가 진행중입니다.',
          CMAG: '',
          CHANGEFLAG: 'N',
          CHAMBER: 'CH1',
        },
      });

      await store.handleChamberChecked(true);
      expect(store.isChamberChecked).toBe(false);
      expect(store.chamberMachine).toBe('');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_OK);
      expect(store.alertDialog.message).toBe('MAIN 장비가 진행중입니다.');
    });

    it('shows confirm dialog when CMAG is returned with CHANGEFLAG == Y, and handles confirm/cancel', async () => {
      store.mainState = 'RUN';
      store.eqpId = 'MC01';
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {
          RMAG: '',
          CMAG: 'Chamber 장비도 변경하시겠습니까?',
          CHANGEFLAG: 'Y',
          CHAMBER: 'CH1,CH2',
        },
      });

      await store.handleChamberChecked(true);
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_OK);
      expect(store.confirmDialog.message).toBe('Chamber 장비도 변경하시겠습니까?');
      expect(store.chamberMachine).toBe('CH1,CH2');

      // Cancel unchecks chamber and clears chamberMachine
      await store.cancelConfirm();
      expect(store.isChamberChecked).toBe(false);
      expect(store.chamberMachine).toBe('');

      // Re-trigger and accept confirm keeps chamberMachine
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {
          RMAG: '',
          CMAG: 'Chamber 장비도 변경하시겠습니까?',
          CHANGEFLAG: 'Y',
          CHAMBER: 'CH1,CH2',
        },
      });
      await store.handleChamberChecked(true);
      await store.acceptConfirm();
      expect(store.isChamberChecked).toBe(true);
      expect(store.chamberMachine).toBe('CH1,CH2');
    });

    it('handles checkChamber API failure and exception when mainState is present', async () => {
      store.mainState = 'RUN';
      store.eqpId = 'MC01';

      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: false,
        message: 'Chamber API 실패',
      });
      expect(await store.handleChamberChecked(true)).toBe(false);
      expect(store.alertDialog.message).toBe('Chamber API 실패');
      store.closeAlert();

      vi.spyOn(machineStatusDetailService, 'checkChamber').mockRejectedValueOnce(
        new Error('Chamber Crash'),
      );
      expect(await store.handleChamberChecked(true)).toBe(false);
      expect(store.alertDialog.message).toBe('Chamber Crash');
    });

    it('unchecks and shows alert when CMAG is returned with CHANGEFLAG != Y', async () => {
      store.mainState = 'RUN';
      store.eqpId = 'MC01';
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {
          RMAG: '',
          CMAG: 'Chamber 변경 불가 상태입니다.',
          CHANGEFLAG: 'N',
          CHAMBER: 'CH1',
        },
      });

      await store.handleChamberChecked(true);
      expect(store.isChamberChecked).toBe(false);
      expect(store.chamberMachine).toBe('');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('Chamber 변경 불가 상태입니다.');
    });
  });

  describe('changeData and execute', () => {
    beforeEach(() => {
      store.eqpId = 'MC01';
      store.oriEQPStatus = 'R  가동중';
      store.oriDownCode = 'RN001';
      store.finalWorkTime = '2026-10-26 09:00:00';
      store.statusOptions = [
        { value: 'R', label: 'R  가동중' },
        { value: 'C', label: 'C  비부하(LOAD DOWN)' },
      ];
      store.downCodeOptions = [
        { value: 'RN001', label: 'RN001  정상가동' },
        { value: 'CA001', label: 'CA001  LOT 대기' },
      ];
    });

    it('validates missing selectedEqpState', async () => {
      store.selectedEqpState = '';
      const ok = await store.changeData();
      expect(ok).toBe(false);
      expect(store.alertDialog.message).toBe('장비상태를 선택하세요');
    });

    it('validates missing selectedDownCode', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = '';
      const ok = await store.changeData();
      expect(ok).toBe(false);
      expect(store.alertDialog.message).toBe('DOWNCODE를 선택하세요');
    });

    it('validates empty comment when hasCommentAdapter is true', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';
      store.hasCommentAdapter = true;
      store.comment = '';

      const ok = await store.changeData();
      expect(ok).toBe(false);
      expect(store.alertDialog.message).toBe('COMMENT를 입력하세요');
    });

    it('blocks when NONLOTCHECK is Y and NONLOTRESULT is N', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';
      store.hasCommentAdapter = true;
      store.comment = '대기 전환';

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: {
          NONLOTCHECK: 'Y',
          NONLOTRESULT: 'N',
          NONLOTMESSGE: '비작업 LOT 진행 불가',
          NONLOTHMESSGE: '비작업 경고',
        },
      });

      const ok = await store.changeData();
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('비작업 경고');
      expect(store.alertDialog.message).toBe('비작업 LOT 진행 불가');
    });

    it('shows NONLOT confirm dialog when NONLOTCHECK is Y and NONLOTRESULT is Y, then proceeds on confirm', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';
      store.hasCommentAdapter = true;
      store.comment = '대기 전환';

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: {
          NONLOTCHECK: 'Y',
          NONLOTRESULT: 'Y',
          NONLOTMESSGE: '비작업 LOT을 계속 진행하시겠습니까?',
          NONLOTHMESSGE: '비작업 확인',
        },
      });

      const ok = await store.changeData();
      expect(ok).toBe(true);
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.title).toBe('비작업 확인');

      // Confirm NONLOT dialog -> opens status change confirm dialog
      await store.acceptConfirm();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.title).toBe(COMMON_FIELD.TXTDIALOGTITLE_OK);
      expect(store.confirmDialog.message).toBe(
        '상태: \nR  가동중 → C  비부하(LOAD DOWN)\nDownCode: \nRN001 → CA001\n로 변경하시겠습니까?   ',
      );
    });

    it('shows error when status and downCode have not changed', async () => {
      store.selectedEqpState = 'R';
      store.selectedDownCode = 'RN001';
      store.oriEQPStatus = 'R  가동중';
      store.oriDownCode = 'RN001  정상가동';
      store.hasCommentAdapter = false;

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: {
          NONLOTCHECK: 'N',
        },
      });

      const ok = await store.changeData();
      expect(ok).toBe(false);
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('변경된 내역이 없습니다');
    });

    it('opens confirm even when code is identical because legacy Android compares code with label', async () => {
      store.selectedEqpState = 'R';
      store.selectedDownCode = 'RN001';
      store.oriEQPStatus = 'R  가동중';
      store.oriDownCode = 'RN001';
      store.hasCommentAdapter = false;

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: {
          NONLOTCHECK: 'N',
        },
      });

      const ok = await store.changeData();
      expect(ok).toBe(true);
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.confirmText).toBe(COMMON_FIELD.BTNYESSTR);
      expect(store.confirmDialog.cancelText).toBe(COMMON_FIELD.BTNNOSTR);
    });

    it('blocks execute when operatorId is unauthenticated (OPERATOR_ID)', async () => {
      mainStore.operatorId = 'OPERATOR_ID';
      DeviceInfo.OPERATOR_ID = 'OPERATOR_ID';

      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';
      store.hasCommentAdapter = false;

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: { NONLOTCHECK: 'N' },
      });

      await store.changeData();
      expect(store.confirmDialog.open).toBe(true);

      await store.acceptConfirm();
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('로그인정보가 확인되지 않습니다.');
    });

    it('executes status change and shows VAILOADING dialog when VAILOADING is non-empty', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';
      store.comment = ' 대기 ';
      store.chamberMachine = 'CH1';

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: true,
        data: { NONLOTCHECK: 'N' },
      });

      const changeSpy = vi
        .spyOn(machineStatusDetailService, 'changeEqpStatus')
        .mockResolvedValueOnce({
          ok: true,
          data: {
            VAILOADING: 'PM_CH1',
          },
        });

      await store.changeData();
      await store.acceptConfirm();

      expect(changeSpy).toHaveBeenCalledWith({
        eqpId: 'MC01',
        facility: 'FAB1',
        eqpStatusCode: 'C  비부하(LOAD DOWN)',
        eqpDownCode: 'CA001',
        comment: ' 대기 ',
        operatorId: 'OP100',
        operatorName: '김철수',
        changeChamber: 'CH1',
      });
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('정기 정검 도달');
      expect(store.alertDialog.message).toBe('[PM_CH1] VIA Loading W/F 진행 필요!');
      expect(store.isCompleted).toBe(true);
    });

    it('handles checkNonLot and execute failures and exceptions', async () => {
      store.selectedEqpState = 'C';
      store.selectedDownCode = 'CA001';

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockResolvedValueOnce({
        ok: false,
        message: 'NONLOT 에러',
      });
      expect(await store.changeData()).toBe(false);
      expect(store.alertDialog.message).toBe('NONLOT 에러');
      store.closeAlert();

      vi.spyOn(machineStatusDetailService, 'checkNonLot').mockRejectedValueOnce(
        new Error('NONLOT 예외'),
      );
      expect(await store.changeData()).toBe(false);
      expect(store.alertDialog.message).toBe('NONLOT 예외');
      store.closeAlert();

      vi.spyOn(machineStatusDetailService, 'changeEqpStatus').mockResolvedValueOnce({
        ok: false,
        message: '변경 실패',
      });
      expect(await store.execute()).toBe(false);
      expect(store.alertDialog.message).toBe('변경 실패');
      store.closeAlert();

      vi.spyOn(machineStatusDetailService, 'changeEqpStatus').mockRejectedValueOnce(
        new Error('변경 예외'),
      );
      expect(await store.execute()).toBe(false);
      expect(store.alertDialog.message).toBe('변경 예외');
    });
  });

  describe('resetState', () => {
    it('resets all form state, internal flags, first flag, and dialog queue', () => {
      store.eqpId = 'MC01';
      store.first = false;
      store.facility = 'FAB1';
      store.mainStatus = 'RUN';
      store.isCompleted = true;
      store.isLoading = true;
      store.alertDialog.open = true;
      store.dialogQueue.push({ type: 'alert', title: 'Q', message: 'M' });

      store.resetState();

      expect(store.eqpId).toBe('');
      expect(store.first).toBe(true);
      expect(store.facility).toBe('');
      expect(store.mainStatus).toBe('');
      expect(store.isCompleted).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.alertDialog.open).toBe(false);
      expect(store.dialogQueue.length).toBe(0);
    });
  });

  describe('dialog queue', () => {
    it('queues subsequent alerts and displays them in FIFO order on closeAlert', () => {
      store.showAlert('Title 1', 'Message 1');
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('Title 1');
      expect(store.alertDialog.message).toBe('Message 1');

      store.showAlert('Title 2', 'Message 2');
      expect(store.alertDialog.title).toBe('Title 1');
      expect(store.dialogQueue.length).toBe(1);

      store.closeAlert();
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.title).toBe('Title 2');
      expect(store.alertDialog.message).toBe('Message 2');

      store.closeAlert();
      expect(store.alertDialog.open).toBe(false);
    });

    it('queues confirm after alert and transitions smoothly', () => {
      store.showAlert('Alert Title', 'Alert Message');
      store.showConfirm({
        title: 'Confirm Title',
        message: 'Confirm Message',
        confirmText: COMMON_FIELD.BTNYESSTR,
        cancelText: COMMON_FIELD.BTNNOSTR,
      });

      expect(store.alertDialog.open).toBe(true);
      expect(store.confirmDialog.open).toBe(false);

      store.closeAlert();
      expect(store.alertDialog.open).toBe(false);
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.title).toBe('Confirm Title');
      expect(store.confirmDialog.confirmText).toBe(COMMON_FIELD.BTNYESSTR);
    });

    it('queues checkChamber dialog after empty mainState alert without losing any dialog', async () => {
      store.mainState = '';
      store.eqpId = 'MC01';
      vi.spyOn(machineStatusDetailService, 'checkChamber').mockResolvedValueOnce({
        ok: true,
        data: {
          RMAG: 'MAIN 점검중',
          CMAG: 'Chamber 변경?',
          CHANGEFLAG: 'Y',
          CHAMBER: 'CH1',
        },
      });

      await store.handleChamberChecked(true);

      // Alert 1: '조회된 장비 정보가 없습니다' is open first
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('조회된 장비 정보가 없습니다');
      expect(store.dialogQueue.length).toBe(2);

      // Dismiss Alert 1 -> RMAG is dequeued and displayed
      store.closeAlert();
      expect(store.alertDialog.open).toBe(true);
      expect(store.alertDialog.message).toBe('MAIN 점검중');

      // Dismiss RMAG -> CMAG confirm is dequeued and displayed
      store.closeAlert();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toBe('Chamber 변경?');
      expect(store.confirmDialog.confirmText).toBe(COMMON_FIELD.POSITIVEBTNSTR);
      expect(store.confirmDialog.cancelText).toBe(COMMON_FIELD.NEGATIVEBTNSTR);
    });
  });
});
