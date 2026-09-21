import { flushPromises, mount } from '@vue/test-utils';
import type { BatchMoveInListResponse } from 'src/features/batch-move-in/types/batch-move-in.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  });
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
      expect(wrapper.text()).toContain('BATCH MVIN');
      expect(wrapper.text()).toContain('장비');
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
      expect(wrapper.text()).toContain('LOT-READY-001');
      expect(wrapper.text()).not.toContain('LOT-HIDDEN-003');
      expect(wrapper.text()).toContain('Info');
      expect(wrapper.text()).toContain('Work Comment exists.');
      expect(wrapper.text()).toContain('Please read it before proceeding.');
    } finally {
      wrapper.unmount();
    }
  });

  it('selects rows and enables action buttons from status/comment rules', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');

      const rows = wrapper.findAll('tbody tr');
      await rows[0].trigger('click');

      expect(rows[0].classes()).toContain('is-selected');
      expect(wrapper.get('.batch-move-in-action-button').attributes('disabled')).toBeUndefined();
      expect(
        wrapper.findAll('.batch-move-in-action-button')[1].attributes('disabled'),
      ).toBeUndefined();

      await rows[1].trigger('click');

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
      await wrapper.findAll('tbody tr')[0].trigger('click');
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
      await wrapper.findAll('tbody tr')[1].trigger('click');
      await wrapper.get('.batch-move-in-action-button').trigger('click');
      await wrapper.find('.batch-move-in-dialog footer button:last-child').trigger('click');
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-WAIT-002', eqpId: 'EQP-01', recipe: 'RCP-01' }),
      );
      expect(wrapper.findAll('tbody tr')[1].text()).toContain('RUN');

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
      expect(failWrapper.text()).toContain('FAIL');
      expect(failWrapper.text()).toContain('server fail');
    } finally {
      failWrapper.unmount();
    }
  });

  it('cancels individual move in confirmation and shows individual move in failure', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');
      await wrapper.findAll('tbody tr')[1].trigger('click');
      await wrapper.get('.batch-move-in-action-button').trigger('click');

      expect(wrapper.text()).toContain('[LOT-WAIT-002] LOT will be individually MOVED IN.');

      await wrapper.find('.batch-move-in-dialog-secondary').trigger('click');

      expect(executeBatchMoveIn).not.toHaveBeenCalled();
      expect(wrapper.find('.batch-move-in-dialog').exists()).toBe(false);

      executeBatchMoveIn.mockResolvedValueOnce({ ok: false, message: 'individual fail' });
      await wrapper.get('.batch-move-in-action-button').trigger('click');
      await wrapper.find('.batch-move-in-dialog footer button:last-child').trigger('click');
      await flushPromises();

      expect(executeBatchMoveIn).toHaveBeenCalled();
      expect(wrapper.text()).toContain('individual fail');
      expect(wrapper.findAll('tbody tr')[1].text()).toContain('FAIL');
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
      await wrapper.findAll('tbody tr')[0].trigger('click');
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
      await wrapper.findAll('tbody tr')[0].trigger('click');
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
      await firstWrapper.findAll('tbody tr')[0].trigger('click');
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
      expect(restoredWrapper.findAll('tbody tr')[0].classes()).toContain('is-selected');
      expect(restoredWrapper.text()).toContain('LOT-READY-001');
    } finally {
      restoredWrapper.unmount();
    }
  });

  it('keeps Search as a no-op like the legacy Android screen', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-in-dialog button').trigger('click');

      fetchBatchMoveInList.mockClear();
      await wrapper.get('.batch-move-in-search-button').trigger('click');

      expect(fetchBatchMoveInList).not.toHaveBeenCalled();
      expect(wrapper.find('.batch-move-in-dialog').exists()).toBe(false);
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
