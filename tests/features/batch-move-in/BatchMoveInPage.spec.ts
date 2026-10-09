import { flushPromises, mount } from '@vue/test-utils';
import {
  ClosePopup,
  QBtn,
  QCard,
  QCardActions,
  QCardSection,
  QIcon,
  QInput,
  QItem,
  QItemSection,
  QList,
  QMenu,
  QSpinnerDots,
  QToolbar,
  QToolbarTitle,
} from 'quasar';
import { BaseRevoGrid } from 'src/components/base/revo-grid';
import type { BatchMoveInListResponse } from 'src/features/batch-move-in/types/batch-move-in.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { fetchBatchMoveInList, executeBatchMoveIn } = vi.hoisted(() => ({
  fetchBatchMoveInList: vi.fn(),
  executeBatchMoveIn: vi.fn(),
}));

vi.mock('src/features/batch-move-in/services/batch-move-in.service', () => ({
  fetchBatchMoveInList,
  executeBatchMoveIn,
}));

const { default: BatchMoveInPage } =
  await import('src/features/batch-move-in/pages/BatchMoveInPage.vue');

const responseWithComments: BatchMoveInListResponse = {
  context: {
    batchId: 'BATCH-UNIT-01',
    lotId: 'LOT-UNIT-001',
    eqpId: 'EQP-01',
    recipe: 'RCP-01',
    isSkip: 'N',
    facility: 'KFAB',
  },
  unreadWorkCommentQty: 1,
  items: [
    {
      lotId: 'LOT-READY-001',
      commentQty: 2,
      status: 'READY',
      processStep: 'PROC-01',
      product: 'PROD-A',
      quantity: '25',
      errorMessage: '',
      operation: 'OP',
      subOperation: '10',
      lotState: 'Null',
      nwCommentQty: 1,
      operSequence: '001',
    },
    {
      lotId: 'LOT-WAIT-002',
      commentQty: 0,
      status: 'WAIT',
      processStep: 'PROC-01',
      product: 'PROD-A',
      quantity: '25',
      errorMessage: '',
      operation: 'OP',
      subOperation: '10',
      lotState: 'WIP',
      nwCommentQty: 0,
      operSequence: '002',
    },
    {
      lotId: 'LOT-HIDDEN-003',
      commentQty: 0,
      status: 'WAIT',
      processStep: 'PROC-X',
      product: 'PROD-X',
      quantity: '1',
      errorMessage: '',
      operation: 'OP',
      subOperation: '90',
      lotState: 'WIP',
      nwCommentQty: 0,
      operSequence: '009',
      processName: 'MW_TEST',
    },
  ],
};

const autoMoveResponse: BatchMoveInListResponse = {
  ...responseWithComments,
  unreadWorkCommentQty: 0,
  items: [
    {
      ...responseWithComments.items[1],
      lotId: 'LOT-WAIT-010',
      commentQty: 0,
      status: 'WAIT',
      lotState: 'WIP',
    },
  ],
};

const emptyResponse: BatchMoveInListResponse = {
  ...responseWithComments,
  unreadWorkCommentQty: 0,
  items: [
    {
      ...responseWithComments.items[2],
      processName: 'MW_TEST',
    },
  ],
};

const autoFailResponse: BatchMoveInListResponse = {
  ...responseWithComments,
  unreadWorkCommentQty: 0,
  items: [
    {
      ...responseWithComments.items[1],
      lotId: 'LOT-FAIL-010',
      commentQty: 0,
      status: 'WAIT',
      lotState: 'WIP',
    },
  ],
};

const autoInvalidStatusResponse: BatchMoveInListResponse = {
  ...responseWithComments,
  unreadWorkCommentQty: 0,
  items: [
    {
      ...responseWithComments.items[1],
      lotId: 'LOT-RUN-010',
      commentQty: 0,
      status: 'RUN',
      lotState: 'WIP',
    },
  ],
};

function mountPage() {
  return mount(BatchMoveInPage, {
    attachTo: document.body,
    global: {
      directives: { ClosePopup },
      components: {
        QBtn,
        QCard,
        QCardActions,
        QCardSection,
        QIcon,
        QInput,
        QItem,
        QItemSection,
        QList,
        QMenu,
        QSpinnerDots,
        QToolbar,
        QToolbarTitle,
      },
      stubs: {
        QDialog: defineComponent({
          props: { modelValue: Boolean },
          setup(props, { slots }) {
            return () =>
              props.modelValue ? h('div', { class: 'q-dialog' }, slots.default?.()) : null;
          },
        }),
      },
    },
  });
}

function gridRows(wrapper: ReturnType<typeof mountPage>) {
  return wrapper.getComponent(BaseRevoGrid).props('rows') as Array<{
    lotId: string;
    status: string;
    errorMessage: string;
  }>;
}

async function selectLot(wrapper: ReturnType<typeof mountPage>, lotId: string) {
  const row = gridRows(wrapper).find((item) => item.lotId === lotId);
  if (!row) throw new Error(`Lot ${lotId} is missing from the grid`);

  wrapper
    .getComponent(BaseRevoGrid)
    .get('[data-testid="base-revo-grid"]')
    .element.dispatchEvent(
      new CustomEvent('beforecellfocus', {
        detail: { model: row, type: 'rgRow', prop: 'lotId' },
      }),
    );
  await wrapper.vm.$nextTick();
}

describe('BatchMoveInPage', () => {
  beforeEach(() => {
    fetchBatchMoveInList.mockImplementation(() =>
      Promise.resolve(structuredClone(responseWithComments)),
    );
    executeBatchMoveIn.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    fetchBatchMoveInList.mockReset();
    executeBatchMoveIn.mockReset();
    sessionStorage.clear();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'Android');
  });

  it('renders batch context, filters MW_TEST rows, and blocks auto move in when unread work comments exist', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(fetchBatchMoveInList).toHaveBeenCalledTimes(1);
      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(wrapper.get('h1').text()).toBe('BATCH MVIN');
      expect(wrapper.text()).toContain('장비');
      expect(
        wrapper
          .getComponent(BaseRevoGrid)
          .props('columns')
          .map((column) => column.name),
      ).toEqual(['LOTNO', 'C', '상태', '공정명', '제품명', '수량', '에러메시지']);
      expect(wrapper.text()).toContain('개별 MOVE IN');
      expect(wrapper.text()).toContain('COMMENT 읽기');
      expect(wrapper.text()).toContain('확인');
      expect(wrapper.text()).toContain('취소');
      expect(
        (wrapper.find('.batch-move-in-readonly-field input').element as HTMLInputElement).value,
      ).toBe('EQP-01');
      expect(
        (wrapper.findAll('.batch-move-in-readonly-field input')[1].element as HTMLInputElement)
          .value,
      ).toBe('RCP-01');
      expect(gridRows(wrapper).map((row) => row.lotId)).toEqual(['LOT-READY-001', 'LOT-WAIT-002']);
      expect(wrapper.text()).toContain('Info');
      expect(wrapper.text()).toContain('Work Comment exists.');
      expect(wrapper.text()).toContain('Please read it before proceeding.');
    } finally {
      wrapper.unmount();
    }
  });

  it('leaves equipment and recipe blank when Android context has no values', async () => {
    fetchBatchMoveInList.mockResolvedValueOnce({
      ...structuredClone(responseWithComments),
      context: { ...responseWithComments.context, eqpId: '', recipe: '' },
    });
    const wrapper = mountPage();

    try {
      await flushPromises();
      const fields = wrapper.findAll('.batch-move-in-readonly-field input');
      expect(fields.map((field) => (field.element as HTMLInputElement).value)).toEqual(['', '']);
    } finally {
      wrapper.unmount();
    }
  });

  it('selects rows and enables action buttons from status/comment rules', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');

      await selectLot(wrapper, 'LOT-READY-001');

      expect(wrapper.getComponent(BaseRevoGrid).props('selectedRowKey')).toBe('LOT-READY-001');
      expect(wrapper.get('.batch-move-in-action-button').attributes('disabled')).toBeUndefined();
      expect(
        wrapper.findAll('.batch-move-in-action-button')[1].attributes('disabled'),
      ).toBeUndefined();

      await selectLot(wrapper, 'LOT-WAIT-002');

      expect(
        wrapper.findAll('.batch-move-in-action-button')[1].attributes('disabled'),
      ).toBeDefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('validates individual move in using the legacy lot state/status gate', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(wrapper, 'LOT-READY-001');
      await wrapper.get('.batch-move-in-action-button').trigger('click');

      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('[LOT-READY-001] is in [Null] State');
      expect(wrapper.text()).toContain('MOVE IN is not allowed.');
    } finally {
      wrapper.unmount();
    }
  });

  it('moves in a selected WAIT lot and requires all valid lots to be RUN before OK succeeds', async () => {
    const finishWithResult = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { finishWithResult },
    });
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(wrapper, 'LOT-WAIT-002');
      await wrapper.get('.batch-move-in-action-button').trigger('click');
      await wrapper.get('.batch-move-in-dialog-primary').trigger('click');
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-WAIT-002', eqpId: 'EQP-01', recipe: 'RCP-01' }),
      );
      expect(gridRows(wrapper)[1].status).toBe('RUN');

      await wrapper.get('.batch-move-in-ok').trigger('click');

      expect(finishWithResult).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('[LOT-READY-001] is [READY] Status.');
    } finally {
      wrapper.unmount();
    }
  });

  it('auto moves in all WAIT lots when there are no unread work comments', async () => {
    const finishWithResult = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { finishWithResult },
    });
    fetchBatchMoveInList.mockResolvedValue(structuredClone(autoMoveResponse));

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalledTimes(1);
      expect(executeBatchMoveIn).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-WAIT-010' }),
      );
      expect(finishWithResult).toHaveBeenCalledWith('OK');
    } finally {
      wrapper.unmount();
    }
  });

  it('handles empty and failed batch list load states', async () => {
    fetchBatchMoveInList.mockResolvedValueOnce(structuredClone(emptyResponse));
    const emptyWrapper = mountPage();

    try {
      await flushPromises();

      expect(emptyWrapper.text()).toContain('There is no Lot to MOVE IN.');
      expect(executeBatchMoveIn).not.toHaveBeenCalled();
    } finally {
      emptyWrapper.unmount();
    }

    fetchBatchMoveInList.mockRejectedValueOnce(new Error('network down'));
    const failedWrapper = mountPage();

    try {
      await flushPromises();

      expect(failedWrapper.text()).toContain('Unable to load batch move in list.');
    } finally {
      failedWrapper.unmount();
    }
  });

  it('shows auto move in validation and failure popups', async () => {
    fetchBatchMoveInList.mockResolvedValueOnce(structuredClone(autoInvalidStatusResponse));
    const invalidWrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(invalidWrapper.text()).toContain('[LOT-RUN-010] is not WAIT Status');
    } finally {
      invalidWrapper.unmount();
    }

    executeBatchMoveIn.mockResolvedValueOnce({ ok: false, message: 'server fail' });
    fetchBatchMoveInList.mockResolvedValueOnce(structuredClone(autoFailResponse));
    const failWrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-FAIL-010' }),
      );
      expect(failWrapper.text()).toContain('1 Lot(s) failed MOVE IN.');
      expect(gridRows(failWrapper)[0].status).toBe('FAIL');
      expect(gridRows(failWrapper)[0].errorMessage).toBe('server fail');
    } finally {
      failWrapper.unmount();
    }
  });

  it('cancels individual move in confirmation and shows individual move in failure', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(wrapper, 'LOT-WAIT-002');
      await wrapper.get('.batch-move-in-action-button').trigger('click');

      expect(wrapper.text()).toContain('[LOT-WAIT-002] LOT will be individually MOVED IN.');

      await wrapper.find('.batch-move-in-dialog-secondary').trigger('click');

      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(wrapper.find('.batch-move-in-dialog').exists()).toBe(false);

      executeBatchMoveIn.mockResolvedValueOnce({ ok: false, message: 'individual fail' });
      await wrapper.get('.batch-move-in-action-button').trigger('click');
      await wrapper.get('.batch-move-in-dialog-primary').trigger('click');
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalled();
      expect(wrapper.text()).toContain('individual fail');
      expect(gridRows(wrapper)[1].status).toBe('FAIL');
    } finally {
      wrapper.unmount();
    }
  });

  it('opens comment list through the Android bridge with selected row payload', async () => {
    const openCommentList = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { openCommentList },
    });
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(wrapper, 'LOT-READY-001');
      await wrapper.findAll('.batch-move-in-action-button')[1].trigger('click');

      expect(openCommentList).toHaveBeenCalledTimes(1);
      expect(JSON.parse(openCommentList.mock.calls[0][0])).toEqual(
        expect.objectContaining({
          lotId: 'LOT-READY-001',
          operation: 'OP',
          subOperation: '10',
          processStep: 'PROC-01',
          operSequence: '001',
        }),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('falls back to hash navigation when opening comment list without Android bridge', async () => {
    const originalHash = window.location.hash;
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(wrapper, 'LOT-READY-001');
      await wrapper.findAll('.batch-move-in-action-button')[1].trigger('click');

      expect(window.location.hash).toBe('#/comment-list?lotId=LOT-READY-001');
    } finally {
      window.location.hash = originalHash;
      wrapper.unmount();
    }
  });

  it('restores without reloading or reopening popup after returning from comment list', async () => {
    const openCommentList = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { openCommentList },
    });

    const firstWrapper = mountPage();

    try {
      await flushPromises();
      await firstWrapper.get('.batch-move-in-dialog button').trigger('click');
      await selectLot(firstWrapper, 'LOT-READY-001');
      await firstWrapper.findAll('.batch-move-in-action-button')[1].trigger('click');

      expect(openCommentList).toHaveBeenCalledTimes(1);
    } finally {
      firstWrapper.unmount();
    }

    fetchBatchMoveInList.mockClear();
    executeBatchMoveIn.mockClear();
    Reflect.deleteProperty(window, 'Android');

    const restoredWrapper = mountPage();

    try {
      await flushPromises();

      expect(fetchBatchMoveInList).not.toHaveBeenCalled();
      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(restoredWrapper.find('.batch-move-in-dialog').exists()).toBe(false);
      expect(restoredWrapper.getComponent(BaseRevoGrid).props('selectedRowKey')).toBe(
        'LOT-READY-001',
      );
      expect(gridRows(restoredWrapper).map((row) => row.lotId)).toContain('LOT-READY-001');
    } finally {
      restoredWrapper.unmount();
    }
  });

  it('keeps the original search labels and inert search action', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      expect((wrapper.get('.batch-move-in-search input').element as HTMLInputElement).value).toBe(
        'BATCH-UNIT-01',
      );
      expect(wrapper.text()).toContain('Batch ID');
      expect(wrapper.get('.batch-move-in-search input').attributes('placeholder')).toBe('Search');
      expect(wrapper.find('.batch-move-in-search-icon').exists()).toBe(true);
      expect(wrapper.get('.batch-move-in-back').attributes('aria-label')).toBe('Back');
      expect(wrapper.get('.batch-move-in-back').findComponent(QIcon).props('name')).toBe(
        'sym_o_arrow_back',
      );
      expect(wrapper.get('.batch-move-in-search-button').text()).toBe('조회');
      await wrapper.get('.batch-move-in-search-button').trigger('click');
      expect(fetchBatchMoveInList).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('covers finish and cancel fallbacks', async () => {
    const finish = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { finish },
    });
    fetchBatchMoveInList.mockResolvedValueOnce(structuredClone(autoMoveResponse));

    const finishWrapper = mountPage();

    try {
      await flushPromises();

      expect(finish).toHaveBeenCalledTimes(1);
    } finally {
      finishWrapper.unmount();
      Reflect.deleteProperty(window, 'Android');
    }

    const close = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { close },
    });
    const closeWrapper = mountPage();

    try {
      await flushPromises();

      await closeWrapper.get('.batch-move-in-cancel').trigger('click');

      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      closeWrapper.unmount();
      Reflect.deleteProperty(window, 'Android');
    }

    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const historyWrapper = mountPage();

    try {
      await flushPromises();

      await historyWrapper.get('.batch-move-in-cancel').trigger('click');

      expect(historyBack).toHaveBeenCalledTimes(1);
    } finally {
      historyBack.mockRestore();
      historyWrapper.unmount();
    }
  });

  it('ignores invalid stored return state and loads a fresh batch list', async () => {
    sessionStorage.setItem('batchMoveIn:returnState', '{bad json');

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(fetchBatchMoveInList).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain('Work Comment exists.');
    } finally {
      wrapper.unmount();
    }
  });
});
