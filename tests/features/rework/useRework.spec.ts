import { ApiError } from 'src/services/api-error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { useRework } from '~/features/rework/composables/useRework';

// ---- mocks ----

const mockBack = vi.fn();
const mockRouteQuery: { LOTID?: string } = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mockRouteQuery }),
  useRouter: () => ({ back: mockBack }),
}));

// ASSUMPTION: '~/stores/device-info' is a placeholder for the project's real
// device/auth store — update this mock if the real path/shape differs.
vi.mock('~/constants/deviceinfo', () => ({
  DeviceInfo: {
    FACILITY: 'FAC1',
    OPERATOR_ID: 'OP01',
    OPERATOR_NAME: 'Operator One',
    DEVICE_NAME: 'ANDROID_000',
  },
}));

vi.mock('../../../src/features/rework/services/rework.service', () => ({
  fetchReworkInfo: vi.fn(),
  fetchAreaBayInfo: vi.fn(),
  fetchBayStockerInfo: vi.fn(),
  submitRework: vi.fn(),
}));

import {
  fetchAreaBayInfo,
  fetchBayStockerInfo,
  fetchReworkInfo,
  submitRework,
} from '../../../src/features/rework/services/rework.service';

const mockedFetchReworkInfo = vi.mocked(fetchReworkInfo);
const mockedFetchAreaBayInfo = vi.mocked(fetchAreaBayInfo);
const mockedFetchBayStockerInfo = vi.mocked(fetchBayStockerInfo);
const mockedSubmitRework = vi.mocked(submitRework);

// Lets pending microtasks (the awaited service calls inside watch callbacks)
// settle before assertions run.
const flush = async () => {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};

const wipReworkInfo = {
  eqpId: 'EQP-01',
  product: 'PRD-0001',
  operation: 'OP10',
  subOperation: '00',
  processStep: 'STEP-A',
  state: 'WIP',
  status: 'RUN',
  holdStatus: 'NONE',
  qty: '25',
  reworkCodes: [{ value: 'RW01', label: 'RW01  Particle rework' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  delete mockRouteQuery.LOTID;
});

describe('useRework', () => {
  describe('init', () => {
    it('does nothing when LOTID is missing from the query', async () => {
      const rework = useRework();
      await rework.init();

      expect(mockedFetchReworkInfo).not.toHaveBeenCalled();
      expect(rework.lotNo.value).toBe('');
    });

    it('does nothing when LOTID is an empty string', async () => {
      mockRouteQuery.LOTID = '';
      const rework = useRework();
      await rework.init();

      expect(mockedFetchReworkInfo).not.toHaveBeenCalled();
    });

    it('loads data when LOTID is present', async () => {
      mockRouteQuery.LOTID = 'LOT0001';
      mockedFetchReworkInfo.mockResolvedValueOnce(wipReworkInfo);

      const rework = useRework();
      await rework.init();

      expect(rework.lotNo.value).toBe('LOT0001');
      expect(mockedFetchReworkInfo).toHaveBeenCalledWith({ lotId: 'LOT0001', facility: 'FAC1' });
      expect(rework.eqpId.value).toBe('EQP-01');
      expect(rework.product.value).toBe('PRD-0001');
      expect(rework.currentOperation.value).toBe('STEP-A(OP1000)');
      expect(rework.qty.value).toBe('25');
      expect(rework.operator.value).toBe('Operator One(OP01)');
      expect(rework.reworkCodeList.value).toEqual(wipReworkInfo.reworkCodes);
      expect(rework.isCarryEnabled.value).toBe(true);
      expect(rework.isOkEnabled.value).toBe(true);
      expect(rework.messageModalOpen.value).toBe(false);
    });
  });

  describe('setData branches (via init)', () => {
    it('shows an error and keeps carry/OK disabled when STATE is not WIP', async () => {
      mockRouteQuery.LOTID = 'LOT0002';
      mockedFetchReworkInfo.mockResolvedValueOnce({ ...wipReworkInfo, state: 'HOLD' });

      const rework = useRework();
      await rework.init();

      expect(rework.messageModalOpen.value).toBe(true);
      expect(rework.messageModal.message).toBe('HOLD 입니다. REWORK할 수 없습니다.');
      expect(rework.isCarryEnabled.value).toBe(false);
      expect(rework.isOkEnabled.value).toBe(false);
      // hidden rule: display fields still populated even though blocked
      expect(rework.product.value).toBe('PRD-0001');
    });

    it('shows an error and keeps carry/OK disabled when HOLDSTATUS is ONHOLD', async () => {
      mockRouteQuery.LOTID = 'LOT0002';
      mockedFetchReworkInfo.mockResolvedValueOnce({ ...wipReworkInfo, holdStatus: 'ONHOLD' });

      const rework = useRework();
      await rework.init();

      expect(rework.messageModal.message).toBe('HOLD된 LOT입니다. REWORK할 수 없습니다.');
      expect(rework.isCarryEnabled.value).toBe(false);
      expect(rework.isOkEnabled.value).toBe(false);
    });

    it('shows the ApiError message when fetchReworkInfo rejects with ApiError', async () => {
      mockRouteQuery.LOTID = 'LOT0001';
      mockedFetchReworkInfo.mockRejectedValueOnce(
        new ApiError('해당 LOT 정보를 찾을 수 없습니다.', {
          code: 'REWORK_LOT_NOT_FOUND',
          status: 404,
        }),
      );

      const rework = useRework();
      await rework.init();

      expect(rework.messageModalOpen.value).toBe(true);
      expect(rework.messageModal.message).toBe('해당 LOT 정보를 찾을 수 없습니다.');
      expect(rework.eqpId.value).toBe(''); // clearInfo() ran, nothing was set
    });

    it('shows a generic message when fetchReworkInfo rejects with a non-ApiError', async () => {
      mockRouteQuery.LOTID = 'LOT0001';
      mockedFetchReworkInfo.mockRejectedValueOnce(new Error('network down'));

      const rework = useRework();
      await rework.init();

      expect(rework.messageModal.message).toBe('알 수 없는 오류가 발생했습니다.');
    });
  });

  describe('carry checkbox toggling', () => {
    it('enables bay/stk and loads the bay list when checked', async () => {
      mockedFetchAreaBayInfo.mockResolvedValueOnce({
        bays: [{ value: 'BAY-A', label: 'BAY-A' }],
      });

      const rework = useRework();
      rework.isCarryChecked.value = true;
      await flush();

      expect(rework.isBayStkEnabled.value).toBe(true);
      expect(mockedFetchAreaBayInfo).toHaveBeenCalledWith({ facility: 'FAC1' });
      expect(rework.bayList.value).toEqual([{ value: 'BAY-A', label: 'BAY-A' }]);
    });

    it('shows an error when fetchAreaBayInfo rejects', async () => {
      mockedFetchAreaBayInfo.mockRejectedValueOnce(
        new ApiError('BAY 목록을 불러오지 못했습니다.', { code: 'BAY_INFO_FAILED', status: 500 }),
      );

      const rework = useRework();
      rework.isCarryChecked.value = true;
      await flush();

      expect(rework.messageModal.message).toBe('BAY 목록을 불러오지 못했습니다.');
    });

    it('disables and clears bay/stk state when unchecked', async () => {
      mockedFetchAreaBayInfo.mockResolvedValueOnce({
        bays: [{ value: 'BAY-A', label: 'BAY-A' }],
      });

      const rework = useRework();
      rework.isCarryChecked.value = true;
      await flush();
      rework.selectedBay.value = 'BAY-A';
      await flush();

      rework.isCarryChecked.value = false;
      await flush();

      expect(rework.isBayStkEnabled.value).toBe(false);
      expect(rework.bayList.value).toEqual([]);
      expect(rework.stkList.value).toEqual([]);
      expect(rework.selectedBay.value).toBeUndefined();
      expect(rework.selectedStk.value).toBeUndefined();
    });
  });

  describe('bay selection cascades to the STK list', () => {
    it('does not fetch the STK list on the first BAY selection', async () => {
      const rework = useRework();
      rework.selectedBay.value = 'BAY-A';
      await flush();

      expect(mockedFetchBayStockerInfo).not.toHaveBeenCalled();
    });

    it('fetches the STK list from the second BAY selection onward', async () => {
      mockedFetchBayStockerInfo.mockResolvedValueOnce({
        stockers: [{ value: 'STK-01', label: 'STK-01' }],
      });

      const rework = useRework();
      rework.selectedBay.value = 'BAY-A';
      await flush();
      rework.selectedBay.value = 'BAY-B';
      await flush();

      expect(mockedFetchBayStockerInfo).toHaveBeenCalledWith({ bay: 'BAY-B', facility: 'FAC1' });
      expect(rework.stkList.value).toEqual([{ value: 'STK-01', label: 'STK-01' }]);
    });

    it('shows an error when fetchBayStockerInfo rejects', async () => {
      mockedFetchBayStockerInfo.mockRejectedValueOnce(
        new ApiError('선택한 BAY의 STOCKER 목록을 찾을 수 없습니다.', {
          code: 'STOCKER_NOT_FOUND',
          status: 404,
        }),
      );

      const rework = useRework();
      rework.selectedBay.value = 'BAY-A';
      await flush();
      rework.selectedBay.value = 'BAY-B';
      await flush();

      expect(rework.messageModal.message).toBe('선택한 BAY의 STOCKER 목록을 찾을 수 없습니다.');
    });

    it('shows "BAY를 선택하세요." if the STK cascade fires with no BAY selected', async () => {
      const rework = useRework();
      rework.selectedBay.value = 'BAY-A'; // 1st change: counted, not fetched
      await flush();
      rework.selectedBay.value = undefined; // 2nd change: counted, triggers setSTKList()
      await flush();

      expect(rework.messageModal.message).toBe('BAY를 선택하세요.');
      expect(mockedFetchBayStockerInfo).not.toHaveBeenCalled();
    });
  });

  describe('isReworkCodeSelected', () => {
    it('reflects whether a rework code is selected', () => {
      const rework = useRework();
      expect(rework.isReworkCodeSelected.value).toBe(false);

      rework.selectedReworkCode.value = 'RW01';
      expect(rework.isReworkCodeSelected.value).toBe(true);
    });
  });

  describe('executeRework', () => {
    it('shows an error when no rework code is selected', async () => {
      const rework = useRework();
      await rework.executeRework();

      expect(rework.messageModal.message).toBe('REWORK코드를 선택하세요.');
      expect(mockedSubmitRework).not.toHaveBeenCalled();
    });

    it('shows an error when carry is checked but no BAY is selected', async () => {
      mockedFetchAreaBayInfo.mockResolvedValueOnce({ bays: [{ value: 'BAY-A', label: 'BAY-A' }] });

      const rework = useRework();
      rework.selectedReworkCode.value = 'RW01';
      rework.isCarryChecked.value = true;
      await flush();

      await rework.executeRework();

      expect(rework.messageModal.message).toBe('BAY를 선택하세요.');
      expect(mockedSubmitRework).not.toHaveBeenCalled();
    });

    it('shows an error when carry is checked but no STK is selected', async () => {
      mockedFetchAreaBayInfo.mockResolvedValueOnce({ bays: [{ value: 'BAY-A', label: 'BAY-A' }] });

      const rework = useRework();
      rework.selectedReworkCode.value = 'RW01';
      rework.isCarryChecked.value = true;
      await flush();
      rework.selectedBay.value = 'BAY-A';
      await flush();

      await rework.executeRework();

      expect(rework.messageModal.message).toBe('STOCKER를 선택하세요.');
      expect(mockedSubmitRework).not.toHaveBeenCalled();
    });

    it('submits with isCarry="N" and empty bay/stocker, then navigates back', async () => {
      mockRouteQuery.LOTID = 'LOT0001';
      mockedFetchReworkInfo.mockResolvedValueOnce(wipReworkInfo);
      mockedSubmitRework.mockResolvedValueOnce(undefined);

      const rework = useRework();
      await rework.init();
      rework.selectedReworkCode.value = 'RW01';
      rework.comment.value = 'note';

      await rework.executeRework();

      expect(mockedSubmitRework).toHaveBeenCalledWith({
        lotId: 'LOT0001',
        facility: 'FAC1',
        eqpId: 'EQP-01',
        reworkCode: 'RW01',
        comment: 'note',
        operatorId: 'OP01',
        operation: 'OP10',
        subOperation: '00',
        isCarry: 'N',
        bay: '',
        stocker: '',
        qty: '25',
      });
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(rework.isBusy.value).toBe(false);
    });

    it('submits with isCarry="Y" and the selected bay/stocker', async () => {
      mockedFetchAreaBayInfo.mockResolvedValueOnce({ bays: [{ value: 'BAY-A', label: 'BAY-A' }] });
      mockedSubmitRework.mockResolvedValueOnce(undefined);

      const rework = useRework();
      rework.selectedReworkCode.value = 'RW01';
      rework.isCarryChecked.value = true;
      await flush();
      // Selected directly rather than via the STK cascade — that cascade
      // (skip-first-selection) is already covered in its own describe block.
      rework.selectedBay.value = 'BAY-A';
      rework.selectedStk.value = 'STK-01';
      await flush();

      await rework.executeRework();

      const call = mockedSubmitRework.mock.calls[0]?.[0];
      expect(call?.isCarry).toBe('Y');
      expect(call?.bay).toBe('BAY-A');
      expect(call?.stocker).toBe('STK-01');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('shows the ApiError message when submitRework rejects', async () => {
      mockedSubmitRework.mockRejectedValueOnce(
        new ApiError('서버 오류가 발생했습니다.', { code: 'REWORK_FAILED', status: 500 }),
      );

      const rework = useRework();
      rework.selectedReworkCode.value = 'RW01';

      await rework.executeRework();

      expect(rework.messageModal.message).toBe('서버 오류가 발생했습니다.');
      expect(mockBack).not.toHaveBeenCalled();
      expect(rework.isBusy.value).toBe(false);
    });

    it('guards against double submit while isBusy is true', async () => {
      const rework = useRework();
      rework.selectedReworkCode.value = 'RW01';
      rework.isBusy.value = true;

      await rework.executeRework();

      expect(mockedSubmitRework).not.toHaveBeenCalled();
    });
  });

  describe('onCommentEnter', () => {
    it('blurs the event target', () => {
      const rework = useRework();
      const blur = vi.fn();
      const target = { blur } as unknown as HTMLElement;

      rework.onCommentEnter({ target } as unknown as KeyboardEvent);

      expect(blur).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleCancel', () => {
    it('navigates back with no result', async () => {
      const rework = useRework();
      await rework.handleCancel();

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeMessageModal', () => {
    it('closes the modal', async () => {
      const rework = useRework();
      rework.messageModalOpen.value = true;

      rework.closeMessageModal();

      expect(rework.messageModalOpen.value).toBe(false);
    });
  });
});
