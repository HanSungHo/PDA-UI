import { createPinia, setActivePinia } from 'pinia';
import { remoteAegisService } from 'src/features/remote-aegis/services/remote-aegis.service';
import { useRemoteAegisStore } from 'src/features/remote-aegis/stores/remote-aegis.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/features/remote-aegis/services/remote-aegis.service', () => ({
  remoteAegisService: {
    fetchRemoteEqpInfo: vi.fn(),
    fetchMachinePortStatus: vi.fn(),
    executeMachinePortClear: vi.fn(),
    executeAegisModeChange: vi.fn(),
    fetchAegisLotInfo: vi.fn(),
    fetchCommentList: vi.fn(),
    fetchSlotInfo: vi.fn(),
    executeAegisRemoteStart: vi.fn(),
  },
}));

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn(),
    close: vi.fn(),
    isOpen: { value: false },
    title: { value: '' },
    message: { value: '' },
    confirmLabel: { value: '확인' },
  },
}));

describe('remote-aegis.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state and computed properties', () => {
    it('initializes with default values', () => {
      const store = useRemoteAegisStore();
      expect(store.isStartEnabled).toBe(false);
      expect(store.isClearPortEnabled).toBe(true);
      expect(store.isLoading).toBe(false);
      expect(store.machineInput).toBe('');
      expect(store.lotIdInput).toBe('');
      expect(store.portOptions).toEqual([]);
      expect(store.selectedPort).toBe('');
      expect(store.portState).toBe('');
      expect(store.portStatusKind).toBe('none');
      expect(store.noticeText).toBe('');
    });

    it('maps portStatusKind correctly for various port states', () => {
      const store = useRemoteAegisStore();
      store.portState = 'READY';
      expect(store.portStatusKind).toBe('ready');

      store.portState = 'RUN';
      expect(store.portStatusKind).toBe('run');

      store.portState = 'PENDING';
      expect(store.portStatusKind).toBe('pending');

      store.portState = 'INIT';
      expect(store.portStatusKind).toBe('init');

      store.portState = 'RESERVED';
      expect(store.portStatusKind).toBe('reserved');

      store.portState = 'COMPLETE';
      expect(store.portStatusKind).toBe('complete');

      store.portState = 'IDLE';
      expect(store.portStatusKind).toBe('idle');

      store.portState = 'UNKNOWN';
      expect(store.portStatusKind).toBe('none');
    });

    it('joins noticeItems into noticeText with newlines', () => {
      const store = useRemoteAegisStore();
      store.noticeItems = ['Line 1', 'Line 2'];
      expect(store.noticeText).toBe('Line 1\nLine 2');
    });
  });

  describe('initScreen', () => {
    it('sets machineInput and calls setEqpInfo when initialEqpId is valid', async () => {
      const store = useRemoteAegisStore();
      vi.mocked(remoteAegisService.fetchRemoteEqpInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          pCount: 'Y',
          portName: 'P1,P2',
          pmMessage: '',
          mainEqpId: 'AEGIS01',
        },
      });
      vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          portStateName: 'READY',
          ackMsg: '',
        },
      });

      await store.initScreen('AEGIS01');
      expect(store.machineInput).toBe('AEGIS01');
      expect(store.selectedPort).toBe('P1');
      expect(store.portState).toBe('READY');
      expect(store.isStartEnabled).toBe(true);
    });

    it('ignores initialEqpId when it is NULL or empty', async () => {
      const store = useRemoteAegisStore();
      await store.initScreen('NULL');
      expect(store.machineInput).toBe('');
      expect(remoteAegisService.fetchRemoteEqpInfo).not.toHaveBeenCalled();
    });
  });

  describe('setEqpInfo', () => {
    it('shows alert when machineInput is empty', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = '';
      await store.setEqpInfo();

      expect(okDialog.show).toHaveBeenCalledWith('에  러', '장비명을 입력하여 주세요.', '확인');
      expect(remoteAegisService.fetchRemoteEqpInfo).not.toHaveBeenCalled();
    });

    it('shows PM warning and stops if pCount is N', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      vi.mocked(remoteAegisService.fetchRemoteEqpInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          pCount: 'N',
          portName: 'P1',
          pmMessage: 'PM 주기 도래',
          mainEqpId: 'AEGIS01',
        },
      });

      await store.setEqpInfo();
      expect(okDialog.show).toHaveBeenCalledWith('PM주기 경고', 'PM 주기 도래', '확인');
      expect(okDialog.show).toHaveBeenCalledWith(
        'ERRMSG',
        '진행중인 LOT이 있어 진행이 불가합니다.',
        '확인',
      );
      expect(store.portOptions).toEqual([]);
    });

    it('populates portOptions, selects first port, and calls setPortState when valid', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      vi.mocked(remoteAegisService.fetchRemoteEqpInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          pCount: 'Y',
          portName: 'PORT1,PORT2',
          pmMessage: '',
          mainEqpId: 'AEGIS01',
        },
      });
      vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          portStateName: 'READY',
          ackMsg: '',
        },
      });

      await store.setEqpInfo();
      expect(store.portOptions).toEqual(['PORT1', 'PORT2']);
      expect(store.selectedPort).toBe('PORT1');
      expect(store.portState).toBe('READY');
      expect(store.isStartEnabled).toBe(true);
      expect(store.isClearPortEnabled).toBe(true);
    });
  });

  describe('setPortState branching', () => {
    it('handles RUN/PENDING/RESERVED by alerting and disabling start', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.selectedPort = 'P1';
      vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          portStateName: 'RUN',
          ackMsg: 'RUN ACK',
        },
      });

      await store.setPortState();
      expect(store.portState).toBe('RUN');
      expect(store.isStartEnabled).toBe(false);
      expect(store.isClearPortEnabled).toBe(true);
      expect(okDialog.show).toHaveBeenCalledWith(
        '장비 MASSAGE',
        '해당 PORT가 진행중입니다.\n장비 및 진행할 LOT을 다시 확인 바랍니다.',
        '확인',
      );
      expect(okDialog.show).toHaveBeenCalledWith('PORT WORNING', 'RUN ACK', '확인');
    });

    it('handles empty portState by alerting and disabling both buttons', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.selectedPort = 'P1';
      vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: {
          portStateName: '',
          ackMsg: '',
        },
      });

      await store.setPortState();
      expect(store.isStartEnabled).toBe(false);
      expect(store.isClearPortEnabled).toBe(false);
      expect(okDialog.show).toHaveBeenCalledWith(
        '장비 MASSAGE',
        'PORT 정보를 가져올 수 없습니다.\n잠시후 다시 확인 바랍니다.',
        '확인',
      );
    });
  });

  describe('executeClearPort', () => {
    it('shows alert when selectedPort is empty', async () => {
      const store = useRemoteAegisStore();
      store.selectedPort = '';
      await store.executeClearPort();
      expect(okDialog.show).toHaveBeenCalledWith('에  러', '진행 Port를 먼저 선택하세요.', '확인');
    });

    it('confirms and calls executeMachinePortClear when confirmed', async () => {
      const store = useRemoteAegisStore();
      store.mainEqpId = 'AEGIS01';
      store.selectedPort = 'P1';

      vi.mocked(remoteAegisService.executeMachinePortClear).mockResolvedValueOnce({
        ok: true,
        message: '',
      });
      vi.mocked(remoteAegisService.fetchMachinePortStatus).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: { portStateName: 'IDLE', ackMsg: '' },
      });

      const clearPromise = store.executeClearPort();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toContain(
        'PORT [P1]을(를) 초기화 하고 [IDLE]상태로 바꾸시겠습니까?',
      );

      store.resolveConfirm(true);
      await clearPromise;

      expect(remoteAegisService.executeMachinePortClear).toHaveBeenCalledWith('AEGIS01', 'P1');
      expect(okDialog.show).toHaveBeenCalledWith(
        'PORT 초기화',
        '해당 PORT 초기화 명령을 전송하였습니다.',
        '확인',
      );
      expect(store.portState).toBe('IDLE');
    });

    it('does not call executeMachinePortClear when user cancels confirmation', async () => {
      const store = useRemoteAegisStore();
      store.mainEqpId = 'AEGIS01';
      store.selectedPort = 'P1';

      const clearPromise = store.executeClearPort();
      store.resolveConfirm(false);
      await clearPromise;

      expect(remoteAegisService.executeMachinePortClear).not.toHaveBeenCalled();
    });
  });

  describe('modeChangeLocal & modeChangeRemote', () => {
    it('executes modeChangeLocal upon user confirmation', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      vi.mocked(remoteAegisService.executeAegisModeChange).mockResolvedValueOnce({
        ok: true,
        message: '',
      });

      const promise = store.modeChangeLocal();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toBe('장비를 LOCAL 모드로 바꾸시겠습니까?');

      store.resolveConfirm(true);
      await promise;

      expect(remoteAegisService.executeAegisModeChange).toHaveBeenCalledWith(
        'AEGIS01',
        'LOCAL',
        expect.any(String),
        expect.any(String),
      );
      expect(okDialog.show).toHaveBeenCalledWith(
        '모드 전환',
        '모드 전환 명령을 전송하였습니다.',
        '확인',
      );
    });

    it('cancels modeChangeLocal when user cancels', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';

      const promise = store.modeChangeLocal();
      store.resolveConfirm(false);
      await promise;

      expect(remoteAegisService.executeAegisModeChange).not.toHaveBeenCalled();
    });

    it('executes modeChangeRemote upon user confirmation and handles cancel', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      vi.mocked(remoteAegisService.executeAegisModeChange).mockResolvedValueOnce({
        ok: true,
        message: '',
      });

      const promise = store.modeChangeRemote();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toBe('장비를 REMOTE 모드로 바꾸시겠습니까?');

      store.resolveConfirm(true);
      await promise;

      expect(remoteAegisService.executeAegisModeChange).toHaveBeenCalledWith(
        'AEGIS01',
        'REMOTE',
        expect.any(String),
        expect.any(String),
      );
      expect(okDialog.show).toHaveBeenCalledWith(
        '모드 전환',
        '모드 전환 명령을 전송하였습니다.',
        '확인',
      );

      // Test cancel
      const cancelPromise = store.modeChangeRemote();
      store.resolveConfirm(false);
      await cancelPromise;
    });
  });

  describe('setLotInfo', () => {
    it('alerts LOTID를 입력하여 주세요 if machineInput is empty (1:1 legacy check)', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = '';
      store.lotIdInput = 'LOT01';

      await store.setLotInfo();
      expect(okDialog.show).toHaveBeenCalledWith('에  러', 'LOTID를 입력하여 주세요.', '확인');
    });

    it('cancels and clears fields when RUN confirm is rejected', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [
          {
            lotHoldState: 'NotOnHold',
            lotProcessState: 'RUN',
            jobCode: 'J1',
            productQuantity: '25',
            operDesc: 'PARTICLE TEST',
            operCode: 'OP1-SUB1',
            productSpecName: 'SPEC1',
            recipe: 'RCP1',
            machineName: 'EQP1',
            fab: 'FAB2',
            engineerName: 'E1',
            ownerCode: 'O1',
            safeLaunchLot: 'N',
            inlineSampleMessage: '',
          },
        ],
      });

      const promise = store.setLotInfo();
      await Promise.resolve();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toContain('현재 RUN 중인 LOT 입니다.');

      store.resolveConfirm(false);
      await promise;

      expect(store.lotIdInput).toBe('');
      expect(store.recipeInput).toBe('');
      expect(store.prodMachineInput).toBe('');
      expect(store.focusTarget).toBe('lot');
    });

    it('cancels and clears fields when OnHold confirm is rejected', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [
          {
            lotHoldState: 'OnHold',
            lotProcessState: 'WAIT',
            jobCode: 'J1',
            productQuantity: '25',
            operDesc: 'PARTICLE TEST',
            operCode: 'OP1-SUB1',
            productSpecName: 'SPEC1',
            recipe: 'RCP1',
            machineName: 'EQP1',
            fab: 'FAB2',
            engineerName: 'E1',
            ownerCode: 'O1',
            safeLaunchLot: 'N',
            inlineSampleMessage: '',
          },
        ],
      });

      const promise = store.setLotInfo();
      await Promise.resolve();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toContain('현재 HOLD 중인 LOT입니다.');

      store.resolveConfirm(false);
      await promise;

      expect(store.lotIdInput).toBe('');
      expect(store.recipeInput).toBe('');
      expect(store.prodMachineInput).toBe('');
      expect(store.focusTarget).toBe('lot');
    });

    it('handles API error and empty items in setLotInfo', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: false,
        message: '조회 실패',
      });
      await store.setLotInfo();
      expect(okDialog.show).toHaveBeenCalledWith('에  러', '조회 실패', '확인');

      // Empty items returns silently without invented alert
      vi.mocked(okDialog.show).mockClear();
      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [],
      });
      await store.setLotInfo();
      expect(okDialog.show).not.toHaveBeenCalled();
    });

    it('alerts when process step is not PARTICLE or PQC', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [
          {
            lotHoldState: 'NotOnHold',
            lotProcessState: 'WAIT',
            jobCode: 'J1',
            productQuantity: '25',
            operDesc: 'ETCH NORMAL',
            operCode: 'OP1-SUB1',
            productSpecName: 'SPEC1',
            recipe: 'RCP1',
            machineName: 'EQP1',
            fab: 'FAB2',
            engineerName: 'E1',
            ownerCode: 'O1',
            safeLaunchLot: 'N',
            inlineSampleMessage: '',
          },
        ],
      });

      await store.setLotInfo();
      expect(okDialog.show).toHaveBeenCalledWith(
        '에  러',
        'LOT이 PARTICLE/PQC 공정이 아닙니다.',
        '확인',
      );
    });

    it('populates fields, sets isStartEnabled, and checks unchecked MOVEIN EEN', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchAegisLotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [
          {
            lotHoldState: 'NotOnHold',
            lotProcessState: 'WAIT',
            jobCode: 'J1',
            productQuantity: '25',
            operDesc: 'PARTICLE TEST',
            operCode: 'OP1-SUB1',
            productSpecName: 'SPEC1',
            recipe: 'RCP1',
            machineName: 'EQP1',
            fab: 'FAB2',
            engineerName: 'E1',
            ownerCode: 'O1',
            safeLaunchLot: 'Y',
            inlineSampleMessage: 'SAMPLE MSG',
          },
        ],
      });
      vi.mocked(remoteAegisService.fetchCommentList).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [{ isCheck: 'N', trackType: 'MOVEIN' }],
      });

      const onNavComment = vi.fn();
      const promise = store.setLotInfo(onNavComment);
      await Promise.resolve();
      expect(store.prodMachineInput).toBe('EQP1');
      expect(store.recipeInput).toBe('RCP1');
      expect(store.isStartEnabled).toBe(true);
      expect(store.noticeItems).toContain('Automotive Safe Launch 대상 Lot!');
      expect(store.noticeItems).toContain('SAMPLE MSG');

      // Check confirm dialog for MOVE IN EEN
      await Promise.resolve();
      expect(store.confirmDialog.open).toBe(true);
      expect(store.confirmDialog.message).toContain('미확인 MOVE IN EEN이 1건 있습니다.');

      store.resolveConfirm(true);
      await promise;
      expect(onNavComment).toHaveBeenCalled();
    });
  });

  describe('executeSelectWafer', () => {
    it('calls fetchSlotInfo and returns wafer selection payload', async () => {
      const store = useRemoteAegisStore();
      store.lotIdInput = 'LOT01';
      store.wfProduct = 'PROD1';
      store.wfOwnercode = 'OWN1';
      store.wfOpercode = 'OP1';

      vi.mocked(remoteAegisService.fetchSlotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: { waferList: '01,02,03' },
      });

      const payload = await store.executeSelectWafer();
      expect(payload).toEqual({
        lotId: 'LOT01',
        enableWaferList: '01,02,03',
        fixedCount: 3,
        category: 'ETC',
        factory: 'FABCJ4',
        product: 'PROD1',
        ownerCode: 'OWN1',
        operCode: 'OP1',
      });
    });

    it('handles API failure and empty waferList in executeSelectWafer (1:1 legacy)', async () => {
      const store = useRemoteAegisStore();
      store.lotIdInput = 'LOT01';
      vi.mocked(remoteAegisService.fetchSlotInfo).mockResolvedValueOnce({
        ok: false,
        message: '슬롯 조회 실패',
      });
      const res1 = await store.executeSelectWafer();
      expect(res1).toBeNull();
      expect(okDialog.show).toHaveBeenCalledWith('에  러', '슬롯 조회 실패', '확인');

      vi.mocked(okDialog.show).mockClear();
      vi.mocked(remoteAegisService.fetchSlotInfo).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: { waferList: '' },
      });
      const res2 = await store.executeSelectWafer();
      expect(res2).toBeNull();
      expect(okDialog.show).not.toHaveBeenCalled();
    });
  });

  describe('executeStart', () => {
    it('aborts start when unchecked MOVEIN EEN comments exist', async () => {
      const store = useRemoteAegisStore();
      store.lotIdInput = 'LOT01';
      vi.mocked(remoteAegisService.fetchCommentList).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [{ isCheck: 'N', trackType: 'MOVEIN' }],
      });

      const promise = store.executeStart();
      await Promise.resolve();
      expect(store.confirmDialog.open).toBe(true);
      store.resolveConfirm(false);
      await promise;

      expect(remoteAegisService.executeAegisRemoteStart).not.toHaveBeenCalled();
    });

    it('aborts start and alerts error when COMMENTLIST has parseError (Android parity)', async () => {
      const store = useRemoteAegisStore();
      store.lotIdInput = 'LOT01';
      vi.mocked(remoteAegisService.fetchCommentList).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [],
        parseError: true,
      });

      await store.executeStart();
      expect(remoteAegisService.executeAegisRemoteStart).not.toHaveBeenCalled();
      expect(okDialog.show).toHaveBeenCalledWith(
        '에  러',
        'COMMENT 정보를 가져올 수 없습니다.',
        '확인',
      );
    });

    it('sends AEGISREMOTESTART, updates port state to PENDING and clears lotIdInput on success', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.recipeInput = 'RCP1';
      store.selectedPort = 'P1';
      store.lotIdInput = 'LOT01';
      store.prodMachineInput = 'EQP1';
      store.selectedWaferList = '01,02';

      vi.mocked(remoteAegisService.fetchCommentList).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [],
      });
      vi.mocked(remoteAegisService.executeAegisRemoteStart).mockResolvedValueOnce({
        ok: true,
        message: '',
      });

      await store.executeStart();
      expect(remoteAegisService.executeAegisRemoteStart).toHaveBeenCalledWith({
        machineName: 'AEGIS01',
        recipe: 'RCP1',
        portName: 'P1',
        runNo: 'LOT01',
        prodEqp: 'EQP1',
        slot: '01,02',
        userId: expect.any(String),
        userName: expect.any(String),
      });
      expect(okDialog.show).toHaveBeenCalledWith(
        '전송 성공',
        '성공적으로 START 명령을 전송하였습니다.',
        '확인',
      );
      expect(store.portState).toBe('PENDING');
      expect(store.portStatusKind).toBe('pending');
      expect(store.lotIdInput).toBe('');
    });

    it('alerts error when AEGISREMOTESTART fails', async () => {
      const store = useRemoteAegisStore();
      store.machineInput = 'AEGIS01';
      store.recipeInput = 'RCP1';
      store.selectedPort = 'P1';
      store.lotIdInput = 'LOT01';

      vi.mocked(remoteAegisService.fetchCommentList).mockResolvedValueOnce({
        ok: true,
        message: '',
        data: [],
      });
      vi.mocked(remoteAegisService.executeAegisRemoteStart).mockResolvedValueOnce({
        ok: false,
        message: '시작 명령 실패',
      });

      await store.executeStart();
      expect(okDialog.show).toHaveBeenCalledWith('에  러', '시작 명령 실패', '확인');
    });
  });
});
