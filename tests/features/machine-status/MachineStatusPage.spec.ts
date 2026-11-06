import { mount } from '@vue/test-utils';
import { ROUTE } from 'src/constants/routes';
import MachineStatusPage from 'src/features/machine-status/pages/MachineStatusPage.vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { mockOkDialog, mockUseMachineStatus, routeLeaveGuardHolder } = vi.hoisted(() => ({
  mockOkDialog: {
    isOpen: { value: false },
    title: { value: '' },
    message: { value: '' },
    confirmLabel: { value: 'OK' },
    confirm: vi.fn(),
  },
  mockUseMachineStatus: vi.fn(),
  routeLeaveGuardHolder: {
    guard: null as ((to: { name?: string }) => void) | null,
  },
}));

vi.mock('src/features/machine-status/composables/use-machine-status', () => ({
  useMachineStatus: mockUseMachineStatus,
}));

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: mockOkDialog,
}));

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (cb: (to: { name?: string }) => void) => {
    routeLeaveGuardHolder.guard = cb;
  },
}));

describe('MachineStatusPage', () => {
  const mockState = {
    bayOptions: ref([{ label: 'BAY1', value: 'BAY1' }]),
    selectedBay: ref<string | null>('BAY1'),
    eqpId: ref('EQP01'),
    rows: ref<Array<Record<string, unknown>>>([]),
    isLoading: ref(false),
    hasLoadedBays: ref(false),
    eqpInputRef: ref(null),

    loadBays: vi.fn(),
    handleBayChange: vi.fn(),
    loadEqpList: vi.fn(),
    handleRowSelect: vi.fn(),
    handleRowDoubleClick: vi.fn(),
    handleEqpEnter: vi.fn(),
    handleDetailClick: vi.fn(),
    handleClose: vi.fn(),
    consumeDetailResult: vi.fn(),
    resetState: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMachineStatus.mockImplementation(() => mockState);

    mockOkDialog.isOpen.value = false;
    mockOkDialog.title.value = '';
    mockOkDialog.message.value = '';
    mockOkDialog.confirmLabel.value = 'OK';

    mockState.rows.value = [];
    mockState.hasLoadedBays.value = false;
    mockState.consumeDetailResult.mockReturnValue(false);
  });

  const createWrapper = () =>
    mount(MachineStatusPage, {
      global: {
        stubs: {
          BaseScreen: {
            template: '<div><slot /><slot name="footer" /></div>',
          },
          BaseButton: true,
          BaseDropdownList: true,
          BaseInput: true,
          BaseEmptyState: true,
          BaseRevoGrid: true,
          OkDialog: true,
        },
      },
    });

  it('loads bays on mounted when not loaded yet', () => {
    createWrapper();

    expect(mockState.loadBays).toHaveBeenCalledTimes(1);
  });

  it('loads eqp list when returning from detail screen', () => {
    mockState.hasLoadedBays.value = true;
    mockState.consumeDetailResult.mockReturnValue(true);

    createWrapper();

    expect(mockState.loadEqpList).toHaveBeenCalledTimes(1);
  });

  it('does not load eqp list when consumeDetailResult returns false', () => {
    mockState.hasLoadedBays.value = true;
    mockState.consumeDetailResult.mockReturnValue(false);

    createWrapper();

    expect(mockState.loadEqpList).not.toHaveBeenCalled();
  });

  it('renders empty state when rows is empty', () => {
    mockState.rows.value = [];

    const wrapper = createWrapper();

    expect(wrapper.findComponent({ name: 'BaseEmptyState' }).exists()).toBeTruthy();
  });

  it('renders grid when rows exists', () => {
    mockState.rows.value = [
      {
        EQPID: 'EQP01',
        EQPSTATUS: 'RUN',
      },
    ];

    const wrapper = createWrapper();

    expect(wrapper.findComponent({ name: 'BaseRevoGrid' }).exists()).toBeTruthy();
  });

  it('calls handleRowSelect when row-select emitted', async () => {
    mockState.rows.value = [{ EQPID: 'EQP01' }];

    const wrapper = createWrapper();
    const grid = wrapper.findComponent({ name: 'BaseRevoGrid' });

    await grid.vm.$emit('row-select', 'EQP01', {
      EQPID: 'EQP01',
    });

    expect(mockState.handleRowSelect).toHaveBeenCalledWith({
      EQPID: 'EQP01',
    });
  });

  it('calls handleRowDoubleClick when cell-double-click emitted', async () => {
    mockState.rows.value = [{ EQPID: 'EQP01' }];

    const wrapper = createWrapper();
    const grid = wrapper.findComponent({ name: 'BaseRevoGrid' });

    await grid.vm.$emit('cell-double-click', {
      row: {
        EQPID: 'EQP01',
      },
    });

    expect(mockState.handleRowDoubleClick).toHaveBeenCalledWith({
      EQPID: 'EQP01',
    });
  });

  it('resets state when leaving to another screen', () => {
    createWrapper();

    routeLeaveGuardHolder.guard?.({
      name: 'other-page',
    });

    expect(mockState.resetState).toHaveBeenCalledTimes(1);
  });

  it('does not reset state when navigating to machine status detail', () => {
    createWrapper();

    routeLeaveGuardHolder.guard?.({
      name: ROUTE.machineStatusDetail,
    });

    expect(mockState.resetState).not.toHaveBeenCalled();
  });
});
