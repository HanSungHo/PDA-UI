import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import type { BatchMoveOutListResponse } from 'src/features/batch-move-out/types/batch-move-out.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routeLocationKey } from 'vue-router';

import { useBatchMoveOutStore } from '../../../src/features/batch-move-out/stores/batch-move-out.store';

const {
  checkBatchMoveOutBatchCount,
  executeBatchMoveOut,
  fetchBatchMoveOutFqcSampling,
  fetchBatchMoveOutList,
} = vi.hoisted(() => ({
  checkBatchMoveOutBatchCount: vi.fn(),
  fetchBatchMoveOutList: vi.fn(),
  fetchBatchMoveOutFqcSampling: vi.fn(),
  executeBatchMoveOut: vi.fn(),
}));

vi.mock('src/features/batch-move-out/services/batch-move-out.service', () => ({
  checkBatchMoveOutBatchCount,
  fetchBatchMoveOutList,
  fetchBatchMoveOutFqcSampling,
  executeBatchMoveOut,
}));

const { default: BatchMoveOutPage } =
  await import('src/features/batch-move-out/pages/BatchMoveOutPage.vue');

const runItem = {
  lotId: 'LOT-RUN-001',
  commentQty: 2,
  status: 'RUN',
  processStep: 'PROC-01',
  product: 'PROD-A',
  quantity: '25',
  errorMessage: '',
  operation: 'OP',
  subOperation: '10',
  lotState: 'WIP',
  nwCommentQty: 1,
  operSequence: '001',
  opType: 'NORMAL',
  bayName: 'BAY-01',
  stockerName: 'STK-01',
};

const responseWithComments: BatchMoveOutListResponse = {
  context: {
    batchId: 'BATCH-UNIT-01',
    lotId: 'LOT-UNIT-001',
    eqpId: 'EQP-01',
    recipe: 'RCP-01',
    comment: 'operator comment',
    transport: 'Y',
    facility: 'KFAB',
  },
  checkParameter: 'Y',
  unreadWorkCommentQty: 1,
  items: [
    runItem,
    {
      ...runItem,
      lotId: 'LOT-WAIT-002',
      commentQty: 0,
      status: 'WAIT',
      nwCommentQty: 0,
      operSequence: '002',
    },
    {
      ...runItem,
      lotId: 'LOT-HIDDEN-003',
      processName: 'MW_TEST',
    },
  ],
};

let pinia: ReturnType<typeof createPinia>;

function mountPage(query: Record<string, string> = {}) {
  return mount(BatchMoveOutPage, {
    attachTo: document.body,
    global: {
      plugins: [pinia],
      provide: {
        [routeLocationKey as symbol]: { query },
      },
    },
  });
}

describe('BatchMoveOutPage', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    fetchBatchMoveOutList.mockResolvedValue({
      ok: true,
      data: structuredClone(responseWithComments),
    });
    executeBatchMoveOut.mockResolvedValue({ ok: true });
    fetchBatchMoveOutFqcSampling.mockResolvedValue({ ok: true });
    checkBatchMoveOutBatchCount.mockResolvedValue({ ok: true, batchDown: false });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    fetchBatchMoveOutList.mockReset();
    executeBatchMoveOut.mockReset();
    fetchBatchMoveOutFqcSampling.mockReset();
    checkBatchMoveOutBatchCount.mockReset();
    sessionStorage.clear();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'Android');
  });

  it('renders context, filters MW_TEST rows, and blocks auto move out when unread comments exist', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(fetchBatchMoveOutList).toHaveBeenCalledTimes(1);
      expect(fetchBatchMoveOutList).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: '', state: 'MVOU' }),
      );
      expect(executeBatchMoveOut).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('BATCH MVOUT');
      expect(wrapper.text()).toContain('LOT-RUN-001');
      expect(wrapper.text()).not.toContain('LOT-HIDDEN-003');
      expect(wrapper.text()).toContain('작업성 COMMENT가 있습니다.');
      expect(
        (wrapper.find('.batch-move-out-readonly-field input').element as HTMLInputElement).value,
      ).toBe('EQP-01');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the route batch id for the initial BATCHLISTBYLOT request', async () => {
    const wrapper = mountPage({
      batchId: 'BATCH-ROUTE-01',
      lotId: 'LOT-ROUTE-01',
      eqpId: 'EQP-ROUTE',
      recipe: 'RCP-ROUTE',
      comment: 'route comment',
      transport: 'Y',
      facility: 'KFAB',
    });

    try {
      await flushPromises();

      expect(fetchBatchMoveOutList).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'BATCH-ROUTE-01',
          lotId: 'LOT-ROUTE-01',
          eqpId: 'EQP-ROUTE',
          facility: 'KFAB',
          state: 'MVOU',
        }),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('moves out a selected RUN lot with transport payload and changes it to WAIT', async () => {
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await wrapper.findAll('tbody tr')[0].trigger('click');
      await wrapper.get('.batch-move-out-action-button').trigger('click');
      await wrapper.find('.batch-move-out-dialog footer button:last-child').trigger('click');
      await flushPromises();

      expect(executeBatchMoveOut).toHaveBeenCalledWith(
        expect.objectContaining({
          lotId: 'LOT-RUN-001',
          comment: 'operator comment',
          isCarry: 'Y',
          bayName: 'BAY-01',
          stockerName: 'STK-01',
          operatorId: DeviceInfo.OPERATOR_ID,
          isSkip: 'N',
          inputMaskLogo: '',
          wfInterlock: '',
        }),
      );
      expect(fetchBatchMoveOutFqcSampling).toHaveBeenCalledWith(
        expect.objectContaining({ lotId: 'LOT-RUN-001', eqpId: 'EQP-01' }),
      );
      expect(wrapper.findAll('tbody tr')[0].text()).toContain('WAIT');
    } finally {
      wrapper.unmount();
    }
  });

  it('preserves route recipe comment and transport when BATCHLISTBYLOT response omits them', async () => {
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        context: {
          batchId: 'BATCH-UNIT-01',
          lotId: 'LOT-ROUTE-01',
          eqpId: 'EQP-ROUTE',
          recipe: '',
          comment: '',
          transport: '',
          facility: 'KFAB',
        },
      },
    });

    const wrapper = mountPage({
      batchId: 'BATCH-ROUTE-01',
      lotId: 'LOT-ROUTE-01',
      eqpId: 'EQP-ROUTE',
      recipe: 'RCP-ROUTE',
      comment: 'route comment',
      transport: 'Y',
      facility: 'KFAB',
    });

    try {
      await flushPromises();
      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await wrapper.findAll('tbody tr')[0].trigger('click');
      await wrapper.get('.batch-move-out-action-button').trigger('click');
      await wrapper.find('.batch-move-out-dialog footer button:last-child').trigger('click');
      await flushPromises();

      expect(executeBatchMoveOut).toHaveBeenCalledWith(
        expect.objectContaining({
          recipe: 'RCP-ROUTE',
          comment: 'route comment',
          isCarry: 'Y',
          bayName: 'BAY-01',
          stockerName: 'STK-01',
        }),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('auto moves RUN lots when there are no unread comments', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [{ ...structuredClone(runItem), nwCommentQty: 0 }],
      },
    });

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveOut).toHaveBeenCalledTimes(1);
      expect(checkBatchMoveOutBatchCount).toHaveBeenCalledWith(
        expect.objectContaining({
          facility: 'KFAB',
          eqpId: 'EQP-01',
          operatorId: DeviceInfo.OPERATOR_ID,
        }),
      );
      expect(useBatchMoveOutStore().result).toEqual({ ok: true });
      expect(historyBack).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('navigates back after successful auto move out when Android bridge is unavailable', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [{ ...structuredClone(runItem), nwCommentQty: 0 }],
      },
    });

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(historyBack).toHaveBeenCalledTimes(1);
      expect(useBatchMoveOutStore().result).toEqual({ ok: true });
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps FQC dialogs queued before showing the batch count down dialog', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [
          { ...structuredClone(runItem), nwCommentQty: 0, lotId: 'LOT-FQC-001' },
          { ...structuredClone(runItem), nwCommentQty: 0, lotId: 'LOT-FQC-002' },
        ],
      },
    });
    fetchBatchMoveOutFqcSampling
      .mockResolvedValueOnce({
        ok: true,
        cycleComment: 'cycle comment 1',
        recipeComment: 'recipe comment 1',
      })
      .mockResolvedValueOnce({
        ok: true,
        updateCode: 'update code 2',
      });
    checkBatchMoveOutBatchCount.mockResolvedValueOnce({
      ok: true,
      batchDown: true,
      downMessage: 'batch down message',
    });

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(wrapper.text()).toContain('cycle comment 1');
      expect(wrapper.text()).not.toContain('batch down message');

      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('recipe comment 1');

      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('update code 2');

      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await flushPromises();
      expect(wrapper.text()).toContain('batch down message');

      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await flushPromises();
      expect(historyBack).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('finishes only after queued FQC dialogs are acknowledged when batch count has no down message', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [{ ...structuredClone(runItem), nwCommentQty: 0, lotId: 'LOT-FQC-001' }],
      },
    });
    fetchBatchMoveOutFqcSampling.mockResolvedValueOnce({
      ok: true,
      cycleComment: 'cycle comment before finish',
    });
    checkBatchMoveOutBatchCount.mockResolvedValueOnce({ ok: true, batchDown: false });

    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(wrapper.text()).toContain('cycle comment before finish');
      expect(historyBack).not.toHaveBeenCalled();

      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await flushPromises();
      expect(historyBack).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows validation and failure dialogs', async () => {
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [{ ...structuredClone(runItem), nwCommentQty: 0, status: 'READY' }],
      },
    });
    const invalidWrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveOut).not.toHaveBeenCalled();
      expect(invalidWrapper.text()).toContain('[LOT-RUN-001]는 RUN상태가 아닙니다.');
    } finally {
      invalidWrapper.unmount();
    }

    executeBatchMoveOut.mockResolvedValueOnce({ ok: false, message: 'server fail' });
    fetchBatchMoveOutList.mockResolvedValueOnce({
      ok: true,
      data: {
        ...structuredClone(responseWithComments),
        unreadWorkCommentQty: 0,
        items: [{ ...structuredClone(runItem), nwCommentQty: 0, lotId: 'LOT-FAIL-001' }],
      },
    });
    const failWrapper = mountPage();

    try {
      await flushPromises();

      expect(failWrapper.text()).toContain(
        'BATCH MOVE OUT처리 도중 [1]개의 에러가 발생하였습니다.',
      );
      expect(failWrapper.text()).toContain('server fail');
    } finally {
      failWrapper.unmount();
    }
  });

  it('shows server error when batch list response is not successful', async () => {
    fetchBatchMoveOutList.mockResolvedValueOnce({ ok: false, message: 'batch list fail' });
    const wrapper = mountPage();

    try {
      await flushPromises();

      expect(executeBatchMoveOut).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain('batch list fail');
    } finally {
      wrapper.unmount();
    }
  });

  it('opens comment list with selected row payload', async () => {
    const openCommentList = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { openCommentList },
    });

    const firstWrapper = mountPage();

    try {
      await flushPromises();
      await firstWrapper.get('.batch-move-out-dialog button').trigger('click');
      await firstWrapper.findAll('tbody tr')[0].trigger('click');
      await firstWrapper.findAll('.batch-move-out-action-button')[1].trigger('click');

      expect(JSON.parse(openCommentList.mock.calls[0][0])).toEqual(
        expect.objectContaining({ lotId: 'LOT-RUN-001', operation: 'OP' }),
      );
    } finally {
      firstWrapper.unmount();
      Reflect.deleteProperty(window, 'Android');
    }
  });

  it('opens comment list fallback with the full legacy query contract', async () => {
    delete (window as Window & { Android?: unknown }).Android;
    const wrapper = mountPage();

    try {
      await flushPromises();
      await wrapper.get('.batch-move-out-dialog button').trigger('click');
      await wrapper.findAll('tbody tr')[0].trigger('click');
      await wrapper.findAll('.batch-move-out-action-button')[1].trigger('click');

      expect(window.location.hash).toBe(
        '#/comment-list?lotId=LOT-RUN-001&operation=OP&subOperation=10&processStep=PROC-01&operSequence=001',
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps page-level scroll locks out of global html and body styles', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/batch-move-out/pages/BatchMoveOutPage.vue'),
      'utf8',
    );

    expect(source).not.toContain(':global(html),\n:global(body),\n:global(#app)');
    expect(source).toContain('position: fixed');
    expect(source).toContain('overflow: hidden');
  });
});
