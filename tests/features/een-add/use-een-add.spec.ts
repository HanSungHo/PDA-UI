import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { route, router, store, eenAddStore, service } = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  router: { back: vi.fn() },
  store: { facility: 'STORE-FAB', operatorId: 'OP-STORE' },
  eenAddStore: { setReturnLotId: vi.fn() },
  service: {
    getProcessFlow: vi.fn(),
    getProcessOperation: vi.fn(),
    getTagId: vi.fn(),
    getTagPosition: vi.fn(),
    insertEen: vi.fn(),
    setEenAddService: vi.fn(),
    resetEenAddService: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => store }));
vi.mock('src/features/een-add/stores/een-add.store', () => ({
  useEenAddStore: () => eenAddStore,
}));
vi.mock('src/features/een-add/services/een-add.service', () => service);

import { useEenAdd } from 'src/features/een-add/composables/use-een-add';
import type { EenAddResponse } from 'src/features/een-add/types/een-add.types';

const pass = (messageBody: Record<string, unknown> = {}): EenAddResponse => ({
  isSuccess: true,
  messageBody,
  errorMessage: '',
});
const fail = (errorMessage = 'API failed'): EenAddResponse => ({
  isSuccess: false,
  messageBody: {},
  errorMessage,
});
const routes = () =>
  pass({
    PROCESSFLOWNAME: 'FLOW-A',
    ITEMS: { ITEM: [{ PROCESSFLOWNAME: 'FLOW-A' }, { PROCESSFLOWNAME: 'FLOW-B' }] },
  });
const operations = () =>
  pass({
    ITEMS: {
      ITEM: [
        { PROCESSOPERATIONNAME: '10001', PODESC: 'Inspection' },
        { PROCESSOPERATIONNAME: '10002', PODESC: 'Packaging' },
      ],
    },
  });
const tags = () => pass({ TAGLIST: 'TAG-A\tTag comment A\nTAG-B\tTag comment B' });

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup(_, { expose }) {
        const state = useEenAdd();
        expose({ state });
        return () => h('div');
      },
    }),
  );
  const state = (wrapper.vm as unknown as { state: ReturnType<typeof useEenAdd> }).state;
  return { wrapper, state };
}

async function mountReady() {
  const mounted = mountComposable();
  await flushPromises();
  return mounted;
}

function setReadyState(state: ReturnType<typeof useEenAdd>) {
  state.selectedRoute.value = 'FLOW-A';
  state.operationOptions.value = [
    {
      label: '10001 Inspection',
      value: '10001 Inspection',
      operation: '10001',
      description: 'Inspection',
    },
  ];
  state.selectedOperation.value = '10001 Inspection';
  state.selectedActionPoint.value = 'MOVEIN';
  state.comment.value = 'Defect detail';
  state.selectedTagId.value = 'TAG-A';
}

describe('useEenAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = {};
    store.facility = 'STORE-FAB';
    store.operatorId = 'OP-STORE';
    service.getTagId.mockResolvedValue(tags());
    service.getProcessFlow.mockResolvedValue(routes());
    service.getProcessOperation.mockResolvedValue(operations());
    service.getTagPosition.mockResolvedValue(
      pass({
        ITEMS: { ITEM: [{ POSITION: '01' }, { POSITION: '05' }] },
      }),
    );
    service.insertEen.mockResolvedValue(pass({ RESULT: 'OK' }));
  });

  it('loads tag ids and routes on mount and uses the main-store facility fallback', async () => {
    route.query = { LOTID: ['LOT-1'], PRODUCT: 'PRODUCT-1', OPERATION: '10001' };
    const { state, wrapper } = await mountReady();

    expect(state.context.value).toMatchObject({
      lotId: 'LOT-1',
      facility: 'STORE-FAB',
      product: 'PRODUCT-1',
      operation: '',
    });
    expect(service.getTagId).toHaveBeenCalledWith('STORE-FAB');
    expect(service.getProcessFlow).toHaveBeenCalledWith('STORE-FAB', 'PRODUCT-1', '10001');
    expect(state.routeOptions.value.map((item) => item.value)).toEqual(['FLOW-A', 'FLOW-B']);
    expect(state.operationOptions.value).toHaveLength(2);
    expect(state.selectedOperation.value).toBe('10001 Inspection');
    expect(state.selectedTagId.value).toBe('TAG-A');
    expect(state.comment.value).toBe('Tag comment A');
    wrapper.unmount();
  });

  it('accepts lowercase query aliases and the route facility value', async () => {
    route.query = {
      lotId: 'LOT-2',
      facility: 'QUERY-FAB',
      product: 'P2',
      route: 'FLOW-Z',
      processStep: 'Step',
      operSequence: 24,
    };
    const { state } = await mountReady();

    expect(state.context.value).toEqual({
      lotId: 'LOT-2',
      facility: 'QUERY-FAB',
      product: 'P2',
      route: 'FLOW-Z',
      operation: '',
      processStep: 'Step',
      operSequence: '24',
    });
  });

  it('enables a selected mock case or restores the HTTP implementation', async () => {
    route.query = { mock: 'een-add', mockCase: 'insert-error' };
    const { wrapper } = await mountReady();
    expect(service.setEenAddService).toHaveBeenCalledOnce();
    wrapper.unmount();
    expect(service.resetEenAddService).toHaveBeenCalled();

    vi.clearAllMocks();
    route.query = {};
    const httpMode = await mountReady();
    expect(service.resetEenAddService).toHaveBeenCalledOnce();
    httpMode.wrapper.unmount();
  });

  it('falls back to the first route when the response route is not in its list', async () => {
    service.getProcessFlow.mockResolvedValueOnce(
      pass({
        PROCESSFLOWNAME: 'NOT-LISTED',
        ITEMS: { ITEM: [{ PROCESSFLOWNAME: 'FLOW-A' }] },
      }),
    );
    const { state } = await mountReady();

    expect(state.selectedRoute.value).toBe('NOT-LISTED');
    expect(service.getProcessOperation).toHaveBeenCalledWith('STORE-FAB', '', 'NOT-LISTED');
  });

  it('supports array, singleton, empty and malformed list response shapes', async () => {
    service.getProcessFlow.mockResolvedValueOnce(
      pass({
        PROCESSFLOWNAME: 'FLOW-A',
        ITEMS: [{ PROCESSFLOWNAME: 'FLOW-A' }],
      }),
    );
    service.getProcessOperation.mockResolvedValueOnce(
      pass({
        ITEMS: { ITEM: { PROCESSOPERATIONNAME: '20001', PODESC: 'Single' } },
      }),
    );
    const { state, wrapper } = await mountReady();
    expect(state.routeOptions.value).toEqual([{ label: 'FLOW-A', value: 'FLOW-A' }]);
    expect(state.operationOptions.value).toEqual([
      { label: '20001 Single', value: '20001 Single', operation: '20001', description: 'Single' },
    ]);

    wrapper.unmount();

    service.getProcessFlow.mockResolvedValueOnce(pass({ ITEMS: {} }));
    const emptyObject = await mountReady();
    expect(emptyObject.state.routeOptions.value).toEqual([]);
    emptyObject.wrapper.unmount();

    service.getProcessFlow.mockResolvedValueOnce(
      pass({ ITEMS: [{ PROCESSFLOWNAME: null }, null] }),
    );
    const arrayWithNull = await mountReady();
    expect(arrayWithNull.state.routeOptions.value).toEqual([{ label: '', value: '' }]);
    arrayWithNull.wrapper.unmount();

    service.getProcessFlow.mockResolvedValueOnce(pass({ ITEMS: { ITEM: 42 } }));
    const invalidItem = await mountReady();
    expect(invalidItem.state.routeOptions.value).toEqual([]);
    invalidItem.wrapper.unmount();

    service.getProcessFlow.mockResolvedValueOnce(pass({ ITEMS: 42 }));
    const primitiveList = await mountReady();
    expect(primitiveList.state.routeOptions.value).toEqual([]);
    primitiveList.wrapper.unmount();
  });

  it('shows an error when tag ID loading fails or throws', async () => {
    service.getTagId.mockResolvedValueOnce(fail('TAG failure'));
    const failed = await mountReady();
    expect(failed.state.dialogMessage.value).toBe('TAG failure');
    failed.wrapper.unmount();

    vi.clearAllMocks();
    service.getTagId.mockRejectedValueOnce(new Error('TAG network failure'));
    const rejected = await mountReady();
    expect(rejected.state.dialogMessage.value).toBe('TAG network failure');
  });

  it('handles an empty tag list and an empty tag selection', async () => {
    service.getTagId.mockResolvedValueOnce(pass({ TAGLIST: '' }));
    const { state } = await mountReady();
    expect(state.tagOptions.value).toEqual([]);
    expect(state.selectedTagId.value).toBeUndefined();

    state.onTagChange(undefined);
    expect(state.comment.value).toBe('');
  });

  it('handles route and operation failure responses and thrown errors', async () => {
    service.getProcessFlow.mockResolvedValueOnce(fail('route failed'));
    const routeFailure = await mountReady();
    expect(routeFailure.state.routeOptions.value).toEqual([]);
    expect(routeFailure.state.dialogMessage.value).toBe('route failed');
    routeFailure.wrapper.unmount();

    vi.clearAllMocks();
    service.getProcessFlow.mockRejectedValueOnce('route exception');
    const routeThrow = await mountReady();
    expect(routeThrow.state.dialogMessage.value).toBe('route exception');
    routeThrow.wrapper.unmount();

    vi.clearAllMocks();
    service.getProcessOperation.mockResolvedValueOnce(fail('operation failed'));
    const operationFailure = await mountReady();
    expect(operationFailure.state.operationOptions.value).toEqual([]);
    expect(operationFailure.state.dialogMessage.value).toBe('operation failed');
    operationFailure.wrapper.unmount();

    vi.clearAllMocks();
    service.getProcessOperation.mockRejectedValueOnce(new Error('operation exception'));
    const operationThrow = await mountReady();
    expect(operationThrow.state.dialogMessage.value).toBe('operation exception');
  });

  it('keeps the first operation when incoming operation is not found and skips absent route requests', async () => {
    route.query = { OPERATION: 'unknown' };
    const { state } = await mountReady();
    expect(state.selectedOperation.value).toBe('10001 Inspection');

    state.selectedRoute.value = undefined;
    service.getProcessOperation.mockClear();
    await state.loadOperations();
    expect(service.getProcessOperation).not.toHaveBeenCalled();
  });

  it('uses process step when no operation description is selected', async () => {
    route.query = { PROCESSSTEP: 'Legacy step' };
    const { state } = await mountReady();
    state.operationOptions.value = [];
    state.selectedOperation.value = undefined;
    expect(state.selectedOperationOption.value).toBeUndefined();
    expect(state.context.value.processStep).toBe('Legacy step');
  });

  it('inserts wafer positions and handles API failure and thrown errors', async () => {
    const { state, wrapper } = await mountReady();
    state.context.value.lotId = 'LOT-3';
    state.comment.value = ' memo';
    await state.addWaferNumber();
    expect(service.getTagPosition).toHaveBeenCalledWith('LOT-3');
    expect(state.comment.value).toBe('#01,05 memo');

    service.getTagPosition.mockResolvedValueOnce(fail('position failed'));
    await state.addWaferNumber();
    expect(state.dialogMessage.value).toBe('position failed');

    service.getTagPosition.mockRejectedValueOnce(new Error('position exception'));
    await state.addWaferNumber();
    expect(state.dialogMessage.value).toBe('position exception');
    wrapper.unmount();
  });

  it('changes comment for a selected tag and ignores multi-select values', async () => {
    const { state } = await mountReady();
    state.onTagChange('TAG-B');
    expect(state.selectedTagId.value).toBe('TAG-B');
    expect(state.comment.value).toBe('Tag comment B');

    state.onTagChange(['TAG-A', 'TAG-B']);
    expect(state.selectedTagId.value).toBe('TAG-B');
    state.onTagChange(12);
    expect(state.selectedTagId.value).toBe('12');
    expect(state.comment.value).toBe('');
  });

  it.each([
    [
      'missing route',
      (state: ReturnType<typeof useEenAdd>) => {
        state.selectedRoute.value = undefined;
      },
      'Route 입력',
    ],
    [
      'missing operation',
      (state: ReturnType<typeof useEenAdd>) => {
        state.selectedOperation.value = undefined;
      },
      '공정 입력',
    ],
    [
      'missing action point',
      (state: ReturnType<typeof useEenAdd>) => {
        state.selectedActionPoint.value = '';
      },
      'Action Point 입력',
    ],
    [
      'missing comment',
      (state: ReturnType<typeof useEenAdd>) => {
        state.comment.value = '';
      },
      'Tag Comment 입력',
    ],
  ])('validates %s and does not ask for confirmation', async (_case, invalidate, title) => {
    const { state } = await mountReady();
    setReadyState(state);
    invalidate(state);
    state.submit();
    expect(state.dialogMode.value).toBe('alert');
    expect(state.dialogTitle.value).toBe(title);
  });

  it('asks for confirmation only once valid form data is submitted and ignores submit while loading', async () => {
    const { state } = await mountReady();
    setReadyState(state);
    state.submit();
    expect(state.dialogMode.value).toBe('confirm');
    expect(state.dialogMessage.value).toBe('입력하시겠습니까?');

    state.loading.value = true;
    state.submit();
    expect(state.dialogMode.value).toBe('confirm');
  });

  it('submits legacy fields, reports success after dialog close and navigates back', async () => {
    const { state } = await mountReady();
    setReadyState(state);
    state.context.value = {
      lotId: 'LOT-1',
      facility: ' FAB ',
      product: ' PRODUCT ',
      route: '',
      operation: '',
      processStep: '',
      operSequence: '',
    };
    await state.confirmSubmit();

    expect(service.insertEen).toHaveBeenCalledWith(
      'LOT-1',
      'OP-STORE',
      'FAB',
      'PRODUCT',
      '10001',
      'MOVEIN',
      'FLOW-A',
      'Defect detail',
      'TAG-A',
    );
    expect(eenAddStore.setReturnLotId).toHaveBeenCalledWith('LOT-1');
    expect(state.dialogTitle.value).toBe('확  인');
    expect(state.dialogMessage.value).toBe('EEN을 성공적으로 저장하였습니다.');
    expect(state.loading.value).toBe(false);

    state.closeDialog();
    expect(router.back).toHaveBeenCalledOnce();
  });

  it('reports insert failure and thrown error, and supports cancel/close dialog', async () => {
    const { state, wrapper } = await mountReady();
    service.insertEen.mockResolvedValueOnce(fail('insert failed'));
    await state.confirmSubmit();
    expect(state.dialogMessage.value).toBe('insert failed');

    service.insertEen.mockRejectedValueOnce(new Error('insert exception'));
    await state.confirmSubmit();
    expect(state.dialogMessage.value).toBe('insert exception');

    state.cancelDialog();
    expect(state.dialogMode.value).toBe('');
    expect(router.back).not.toHaveBeenCalled();

    state.cancel();
    expect(router.back).toHaveBeenCalledOnce();
    wrapper.unmount();
    expect(service.resetEenAddService).toHaveBeenCalled();
  });
});
