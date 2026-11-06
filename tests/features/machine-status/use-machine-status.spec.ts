import { createPinia, setActivePinia } from 'pinia';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMachineStatus } from 'src/features/machine-status/composables/use-machine-status';
import { machineStatusService } from 'src/features/machine-status/services/machine-status.service';
import { useMachineStatusStore } from 'src/features/machine-status/stores/machine-status.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  options: { history: { state: { back: '/main' as string | null } } },
}));
const mainStoreMock = vi.hoisted(() => ({
  area: 'PHOTO',
  facility: 'GUMI',
  isSettingReady: true,
  mobileServerName: 'L4-DEVICE',
  initMain: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}));

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => mainStoreMock,
}));

vi.mock('src/features/machine-status/services/machine-status.service', () => ({
  machineStatusService: {
    areaBayInfo: vi.fn(),
    bayEqpInfo: vi.fn(),
  },
}));

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('src/utils/barcode-style', () => ({
  barcodeStyleEqpId: vi.fn(),
}));

const areaBayInfo = vi.mocked(machineStatusService.areaBayInfo);
const bayEqpInfo = vi.mocked(machineStatusService.bayEqpInfo);
const showDialog = vi.mocked(okDialog.show);
const parseBarcode = vi.mocked(barcodeStyleEqpId);

describe('useMachineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mainStoreMock.area = 'PHOTO';
    mainStoreMock.facility = 'GUMI';
    mainStoreMock.isSettingReady = true;
    mainStoreMock.mobileServerName = 'L4-DEVICE';
    mainStoreMock.initMain.mockReset();
    routerMock.options.history.state.back = '/main';
  });

  describe('ITEM list parsing', () => {
    it('accepts a single BAY row sent as an object', async () => {
      areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: { ITEM: { BAY: 'P01' } } } });
      const vm = useMachineStatus();

      await vm.loadBays();

      expect(vm.bayOptions.value).toEqual([{ value: 'P01', label: 'P01' }]);
    });

    it('accepts a single equipment row sent as an object', async () => {
      bayEqpInfo.mockResolvedValueOnce({
        ok: true,
        data: {
          EQPITEMS: {
            ITEM: { EQPID: 'EQP-1', EQPSTATUS: 'RUN', EQPDESCRIPTION: '', EQPTYPE: 'PUMP' },
          },
        },
      });
      const vm = useMachineStatus();
      vm.handleBayChange('P01');

      await vm.loadEqpList();

      expect(vm.rows.value.map((row) => row.EQPID)).toEqual(['EQP-1']);
    });

    it('shows the error dialog when the equipment request throws', async () => {
      bayEqpInfo.mockRejectedValueOnce(new Error('boom'));
      const vm = useMachineStatus();
      vm.handleBayChange('P01');

      await vm.loadEqpList();

      expect(showDialog).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'boom',
        COMMON_FIELD.BTNOKSTR,
      );
      expect(vm.isLoading.value).toBe(false);
    });
  });

  describe('loadBays', () => {
    it('loads BAY options for the main store AREA and FACILITY', async () => {
      areaBayInfo.mockResolvedValueOnce({
        ok: true,
        data: { BAYS: { ITEM: [{ BAY: 'P01' }, { BAY: 'P02' }] } },
      });
      const vm = useMachineStatus();

      await vm.loadBays();

      expect(areaBayInfo).toHaveBeenCalledWith('PHOTO', 'GUMI');
      expect(vm.bayOptions.value).toEqual([
        { value: 'P01', label: 'P01' },
        { value: 'P02', label: 'P02' },
      ]);
      expect(vm.isLoading.value).toBe(false);
    });

    it('initializes persisted main settings before loading BAY options on a direct route entry', async () => {
      mainStoreMock.isSettingReady = false;
      mainStoreMock.mobileServerName = '';
      mainStoreMock.initMain.mockImplementation(async () => {
        mainStoreMock.area = 'ETCH';
        mainStoreMock.facility = 'GUMI';
        mainStoreMock.isSettingReady = true;
        mainStoreMock.mobileServerName = 'L4-DEVICE';
      });
      areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: { ITEM: [{ BAY: 'E01' }] } } });
      const vm = useMachineStatus();

      await vm.loadBays();

      expect(mainStoreMock.initMain).toHaveBeenCalledOnce();
      expect(areaBayInfo).toHaveBeenCalledWith('ETCH', 'GUMI');
      expect(vm.bayOptions.value).toEqual([{ value: 'E01', label: 'E01' }]);
    });

    it('clears equipment input and grid before reloading', async () => {
      areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: { ITEM: [] } } });
      const vm = useMachineStatus();
      vm.eqpId.value = 'EQP-OLD';
      vm.rows.value = [{ EQPID: 'EQP-OLD' } as never];

      await vm.loadBays();

      expect(vm.eqpId.value).toBe('');
      expect(vm.rows.value).toEqual([]);
    });

    it('shows the error dialog and empties BAY options on business failure', async () => {
      areaBayInfo.mockResolvedValueOnce({ ok: false, message: 'BAY DATA Empty!' });
      const vm = useMachineStatus();

      await vm.loadBays();

      expect(vm.bayOptions.value).toEqual([]);
      expect(showDialog).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'BAY DATA Empty!',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('treats a missing BAYS payload as an empty list', async () => {
      areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: undefined as never } });
      const vm = useMachineStatus();

      await vm.loadBays();

      expect(vm.bayOptions.value).toEqual([]);
    });
  });

  it('retains parent state across route re-entry and consumes RESULT_OK once', async () => {
    areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: { ITEM: [{ BAY: 'P01' }] } } });
    const vm = useMachineStatus();

    await vm.loadBays();
    vm.selectedBay.value = 'P01';
    vm.eqpId.value = 'EQP-PUMP-01';
    vm.rows.value = [{ EQPID: 'EQP-PUMP-01' } as never];

    const returnedVm = useMachineStatus();

    expect(returnedVm.selectedBay.value).toBe('P01');
    expect(returnedVm.eqpId.value).toBe('EQP-PUMP-01');
    expect(returnedVm.rows.value).toEqual([{ EQPID: 'EQP-PUMP-01' }]);

    const store = useMachineStatusStore();
    store.markDetailResultOk();
    expect(returnedVm.consumeDetailResult()).toBe(true);
    expect(returnedVm.consumeDetailResult()).toBe(false);
  });

  describe('handleBayChange', () => {
    it('stores the selected BAY and clears it for empty values', () => {
      const vm = useMachineStatus();

      vm.handleBayChange('P01');
      expect(vm.selectedBay.value).toBe('P01');

      vm.handleBayChange(null);
      expect(vm.selectedBay.value).toBeNull();
    });
  });

  describe('loadEqpList', () => {
    it('does nothing when no BAY is selected', async () => {
      const vm = useMachineStatus();

      await vm.loadEqpList();

      expect(bayEqpInfo).not.toHaveBeenCalled();
    });

    it('loads equipment rows for the selected BAY', async () => {
      bayEqpInfo.mockResolvedValueOnce({
        ok: true,
        data: {
          EQPITEMS: {
            ITEM: [
              {
                EQPID: 'EQP-PUMP-01',
                EQPSTATUS: 'RUN',
                EQPDESCRIPTION: '정상가동',
                EQPTYPE: 'PUMP',
              },
            ],
          },
        },
      });
      const vm = useMachineStatus();
      vm.handleBayChange('P01');

      await vm.loadEqpList();

      expect(bayEqpInfo).toHaveBeenCalledWith('P01', 'GUMI');
      expect(vm.rows.value).toHaveLength(1);
      expect(vm.rows.value[0]?.EQPID).toBe('EQP-PUMP-01');
    });

    it('shows the error dialog and keeps the grid empty on business failure', async () => {
      bayEqpInfo.mockResolvedValueOnce({ ok: false, message: 'EQP DATA Empty!' });
      const vm = useMachineStatus();
      vm.handleBayChange('BAY-FAIL');

      await vm.loadEqpList();

      expect(vm.rows.value).toEqual([]);
      expect(showDialog).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        'EQP DATA Empty!',
        COMMON_FIELD.BTNOKSTR,
      );
    });

    it('returns an empty grid when the BAY has no equipment', async () => {
      bayEqpInfo.mockResolvedValueOnce({ ok: true, data: { EQPITEMS: { ITEM: [] } } });
      const vm = useMachineStatus();
      vm.handleBayChange('E01');

      await vm.loadEqpList();

      expect(vm.rows.value).toEqual([]);
      expect(showDialog).not.toHaveBeenCalled();
    });
  });

  describe('row interaction', () => {
    it('fills the equipment input when a row is selected', () => {
      const vm = useMachineStatus();

      vm.handleRowSelect({ EQPID: 'EQP-PUMP-02' });

      expect(vm.eqpId.value).toBe('EQP-PUMP-02');
    });

    it('opens detail with the row EQPID on double click', () => {
      const vm = useMachineStatus();

      vm.handleRowDoubleClick({ EQPID: 'EQP-PUMP-02' });

      expect(routerMock.push).toHaveBeenCalledWith({
        name: ROUTE.machineStatusDetail,
        query: { EQPID: 'EQP-PUMP-02' },
      });
    });
  });

  describe('handleEqpEnter (barcode)', () => {
    it('clears the input and the grid, and does not navigate, when the barcode is invalid', () => {
      parseBarcode.mockReturnValueOnce({ isValid: false, parsedId: '' } as never);
      const vm = useMachineStatus();
      vm.eqpId.value = 'BAD';
      vm.rows.value = [{ EQPID: 'EQP-1', EQPSTATUS: 'RUN', EQPDESCRIPTION: '', EQPTYPE: 'PUMP' }];

      vm.handleEqpEnter();

      expect(vm.eqpId.value).toBe('');
      expect(vm.rows.value).toEqual([]);
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('opens detail with the parsed EQPID when the barcode is valid', () => {
      parseBarcode.mockReturnValueOnce({ isValid: true, parsedId: 'EQP-PUMP-01' } as never);
      const vm = useMachineStatus();
      vm.eqpId.value = 'EQP-PUMP-011';

      vm.handleEqpEnter();

      expect(routerMock.push).toHaveBeenCalledWith({
        name: ROUTE.machineStatusDetail,
        query: { EQPID: 'EQP-PUMP-01' },
      });
    });

    it('writes the parsed EQPID back into the input when the barcode is valid', () => {
      parseBarcode.mockReturnValueOnce({ isValid: true, parsedId: 'PUMP-01' } as never);
      const vm = useMachineStatus();
      vm.eqpId.value = 'EQP-PUMP-01#';

      vm.handleEqpEnter();

      expect(vm.eqpId.value).toBe('PUMP-01');
    });
  });

  describe('handleDetailClick (상세상태)', () => {
    it('shows the input-required dialog and does not navigate when empty', () => {
      const vm = useMachineStatus();

      vm.handleDetailClick();

      expect(showDialog).toHaveBeenCalledWith(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '장비를 입력해주세요',
        COMMON_FIELD.BTNOKSTR,
      );
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('treats whitespace-only input as empty', () => {
      const vm = useMachineStatus();
      vm.eqpId.value = '   ';

      vm.handleDetailClick();

      expect(showDialog).toHaveBeenCalledTimes(1);
      expect(routerMock.push).not.toHaveBeenCalled();
    });

    it('opens detail with the raw input value when present', () => {
      const vm = useMachineStatus();
      vm.eqpId.value = 'EQP-RAW-01';

      vm.handleDetailClick();

      expect(routerMock.push).toHaveBeenCalledWith({
        name: ROUTE.machineStatusDetail,
        query: { EQPID: 'EQP-RAW-01' },
      });
    });
  });

  it('navigates back when closed', () => {
    const vm = useMachineStatus();

    vm.handleClose();

    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('falls back to the main screen when closed without history', () => {
    routerMock.options.history.state.back = null;
    const vm = useMachineStatus();

    vm.handleClose();

    expect(routerMock.back).not.toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenCalledWith(`/${ROUTE.main}`);
  });

  it('focuses and selects the equipment input after an invalid barcode Enter', async () => {
    parseBarcode.mockReturnValueOnce({ isValid: false, parsedId: '' } as never);
    const vm = useMachineStatus();
    const input = { focus: vi.fn(), select: vi.fn() };
    vm.eqpInputRef.value = input;

    vm.handleEqpEnter();
    await nextTick();

    expect(input.focus).toHaveBeenCalled();
    expect(input.select).toHaveBeenCalled();
  });

  it('focuses and selects the equipment input after the BAY list loads', async () => {
    areaBayInfo.mockResolvedValueOnce({ ok: true, data: { BAYS: { ITEM: [{ BAY: 'P01' }] } } });
    const vm = useMachineStatus();
    const input = { focus: vi.fn(), select: vi.fn() };
    vm.eqpInputRef.value = input;

    await vm.loadBays();
    await nextTick();

    expect(input.focus).toHaveBeenCalled();
    expect(input.select).toHaveBeenCalled();
  });
});
