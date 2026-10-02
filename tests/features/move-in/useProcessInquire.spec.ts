import { mount } from '@vue/test-utils';
import { useProcessInquire } from 'src/features/move-in/composables/useProcessInquire';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

const { route, mockRouter, mockService, confirm } = vi.hoisted(() => ({
  route: {
    query: {
      LOTID: 'LOT-001',
      OPERATION: 'OP-20',
      ISSKIP: 'N',
      REWORKSKIP: 'N',
    },
  },
  mockRouter: { back: vi.fn() },
  mockService: {
    getMeasureInfo: vi.fn(),
    getSlotInfo: vi.fn(),
    checkDiCycle: vi.fn(),
    submitMeasureSet: vi.fn(),
    moveIn: vi.fn(),
  },
  confirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => mockRouter,
}));

vi.mock('src/features/move-in/services/mock-process-inquire.service', () => ({
  __esModule: true,
  default: mockService,
  createDemoMeasureInfo: () => ({ measureItems: [] }),
}));

vi.mock('src/features/move-in/composables/useConfirmModal', () => ({
  useConfirmModal: () => ({
    alert: vi.fn().mockResolvedValue(undefined),
    confirm,
  }),
}));

function mountProcessInquire(options: Parameters<typeof useProcessInquire>[0] = {}) {
  let state!: ReturnType<typeof useProcessInquire>;
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useProcessInquire(options);
        return () => null;
      },
    }),
  );

  return { state, wrapper };
}

describe('useProcessInquire result handoff', () => {
  afterEach(() => {
    vi.clearAllMocks();
    route.query = {
      LOTID: 'LOT-001',
      OPERATION: 'OP-20',
      ISSKIP: 'N',
      REWORKSKIP: 'N',
    };
  });

  it('returns measurement context to the parent through the typed completion callback', async () => {
    mockService.submitMeasureSet.mockResolvedValue({
      status: 200,
      data: {
        RECIPE: 'RCP-01',
        EQPGROUP: 'PHOTO-GROUP',
        CHANGEEQPGROUP: 'PHOTO-GROUP-2',
        PROCESSSTEP: 'VI',
        COMMENTQTY: '4',
        NRWCOMMENTQTY: '2',
      },
    });
    const onComplete = vi.fn();
    const { state, wrapper } = mountProcessInquire({ onComplete });
    state.initializeFromPreviousScreen();
    state.rows.value = [
      { id: '1', processName: 'Dimension', subOperation: 'S1', status: 'Y', description: 'DI' },
    ];
    state.form.quantity = '25';

    try {
      await state.submitCurrentMeasure();

      expect(mockService.submitMeasureSet).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-001', operation: 'OP-20', subOperation: 'S1' }),
      );
      expect(onComplete).toHaveBeenCalledWith({
        CURRENTSTEP: 'VI(OP-20S1)',
        RECIPE: 'RCP-01',
        EQPGROUP: 'PHOTO-GROUP',
        CHANGEEQPGROUP: 'PHOTO-GROUP-2',
        PROCESSSTEP: 'VI',
        COMMENTQTY: '4',
        NRWCOMMENTQTY: '2',
        SUBOPERATION: 'S1',
      });
      expect(mockRouter.back).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('enables the legacy skip checkbox only when the parent allows skip', () => {
    const { state, wrapper } = mountProcessInquire();

    try {
      state.initializeFromPreviousScreen();
      expect(state.isCurrentOperationSkipEnabled.value).toBe(false);

      route.query.ISSKIP = 'Y';
      state.initializeFromPreviousScreen();
      expect(state.isCurrentOperationSkipEnabled.value).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('returns FINISH when the skip move-in flow reaches all completed rows', async () => {
    const onComplete = vi.fn();
    const { state, wrapper } = mountProcessInquire({ onComplete });
    state.rows.value = [
      { id: '1', processName: 'Dimension', subOperation: 'S1', status: 'C', description: 'DI' },
    ];

    try {
      await state.runMoveInProcess();

      expect(onComplete).toHaveBeenCalledWith({ FINISH: 'Y' });
      expect(mockRouter.back).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('builds wafer selection payloads with the legacy slot list and loaded wafer list', async () => {
    const { state, wrapper } = mountProcessInquire();
    state.form.lotNo = 'LOT-002';
    mockService.getSlotInfo.mockResolvedValue({ data: { waferList: '01,02,03' } });

    try {
      await state.loadSlotInfo();

      expect(state.getWaferSelectPayload('currentSlot')).toEqual({
        lotId: 'LOT-002',
        existingWaferList: state.slotList,
        fixedCount: 25,
        target: 'currentSlot',
      });
      expect(state.getWaferSelectPayload('semWf')).toEqual({
        lotId: 'LOT-002',
        existingWaferList: '01,02,03',
        fixedCount: 3,
        target: 'semWf',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('selects one measure row at a time and keeps completed rows fixed', () => {
    const { state, wrapper } = mountProcessInquire();
    state.rows.value = [
      { id: '1', processName: 'Dimension', subOperation: 'S1', status: 'N', description: 'DI' },
      { id: '2', processName: 'Overlay', subOperation: 'S2', status: 'C', description: 'OV' },
    ];

    try {
      state.toggleMeasureRow(state.rows.value[0]);
      expect(state.selectedRows.value.map((row) => row.id)).toEqual(['1']);
      expect(state.currentSubOperation.value).toBe('S1');

      state.toggleMeasureRow(state.rows.value[1]);
      expect(state.rows.value[1].status).toBe('C');

      state.toggleMeasureRow(state.rows.value[0]);
      expect(state.selectedRows.value).toEqual([]);
      expect(state.currentSubOperation.value).toBe('');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the history result contract when no parent callback is supplied', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const { state, wrapper } = mountProcessInquire();

    try {
      state.finishWithResult({ FINISH: 'Y' });

      expect(replaceState).toHaveBeenCalledWith(
        expect.objectContaining({ processInquireResult: { FINISH: 'Y' } }),
        '',
      );
      expect(mockRouter.back).toHaveBeenCalledOnce();
    } finally {
      replaceState.mockRestore();
      wrapper.unmount();
    }
  });
});
