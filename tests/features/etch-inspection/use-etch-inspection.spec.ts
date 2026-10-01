/* eslint-disable vue/one-component-per-file -- Composable tests mount local host components. */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { route, router, store, service } = vi.hoisted(() => ({
  route: { query: {} as Record<string, unknown> },
  router: { back: vi.fn() },
  store: { facility: 'FAB-A', operatorId: 'OPERATOR-1' },
  service: {
    searchData: vi.fn(),
    execution: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => store }));
vi.mock('src/features/etch-inspection/services/etch-inspection.service', () => service);

import { useEtchInspection } from 'src/features/etch-inspection/composables/use-etch-inspection';

const pass = (data: Record<string, string> | null = null) => ({
  success: true,
  data,
  errorMessage: '',
});
const fail = (errorMessage = 'API failed') => ({
  success: false,
  data: null,
  errorMessage,
});
const inspection = (inspectionDate = '') =>
  pass({
    OLDPROCESSOPERATIONNAME: 'ETCH-010',
    OLDOPERATIONDESCRIPTION: 'Old operation',
    OLDMACHINENAME: 'EQP-1',
    NOWPROCESSOPERATIONNAME: 'ETCH-020',
    NOWOPERATIONDESCRIPTION: 'Current operation',
    INSPDATE: inspectionDate,
    PRODUCTSPECNAME: 'PRODUCT-A',
  });

function mountComposable() {
  const wrapper = mount(
    defineComponent({
      setup(_, { expose }) {
        const state = useEtchInspection();
        expose({ state });
        return () => h('div');
      },
    }),
  );
  const state = (wrapper.vm as unknown as { state: ReturnType<typeof useEtchInspection> }).state;
  return { wrapper, state };
}

async function mountReady() {
  const mounted = mountComposable();
  await flushPromises();
  return mounted;
}

function setLoadedState(state: ReturnType<typeof useEtchInspection>, inspectionDate = '') {
  state.txtViewLotname.value = 'LOT-1';
  state.OldOperation.value = 'ETCH-010';
  state.OldOperationDesc.value = 'Old operation';
  state.oldMachine.value = 'EQP-1';
  state.NowOperation.value = 'ETCH-020';
  state.NowOperationDesc.value = 'Current operation';
  state.sInspDate.value = inspectionDate;
  state.sproduct.value = 'PRODUCT-A';
  state.txtInspectionComment.value = 'comment';
}

describe('useEtchInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = {};
    service.searchData.mockResolvedValue(inspection());
    service.execution.mockResolvedValue({ success: true, errorMessage: '' });
  });

  it('searches an initial uppercase LOTID and maps all response fields', async () => {
    route.query = { lotId: 'lot-1' };
    const { state, wrapper } = await mountReady();

    expect(service.searchData).toHaveBeenCalledWith('LOT-1');
    expect(state.LOTID.value).toBe('');
    expect(state.txtViewLotname.value).toBe('LOT-1');
    expect(state.OldOperation.value).toBe('ETCH-010');
    expect(state.OldOperationDesc.value).toBe('Old operation');
    expect(state.oldMachine.value).toBe('EQP-1');
    expect(state.NowOperation.value).toBe('ETCH-020');
    expect(state.NowOperationDesc.value).toBe('Current operation');
    expect(state.sInspDate.value).toBe('');
    expect(state.sproduct.value).toBe('PRODUCT-A');
    expect(state.canExecute.value).toBe(true);
    wrapper.unmount();
  });

  it('normalizes manual LOT input to uppercase without barcode parsing', async () => {
    const { state } = await mountReady();

    state.updateLotInput('lot-2');
    expect(state.LOTID.value).toBe('LOT-2');

    await state.searchData();
    expect(service.searchData).toHaveBeenCalledWith('LOT-2');
  });

  it('parses scanned LOT input, removes the scan suffix and searches on Enter', async () => {
    const { state } = await mountReady();

    state.updateLotInput(' $lot-123x');
    await state.handleLotEnter();

    expect(service.searchData).toHaveBeenCalledWith('LOT-123');
    expect(state.txtViewLotname.value).toBe('LOT-123');
    expect(state.LOTID.value).toBe('');
  });

  it('rejects invalid scanned input with the legacy READING ERROR flow', async () => {
    const { state } = await mountReady();
    state.updateLotInput('LOT-123X');

    await state.handleLotEnter();

    expect(service.searchData).not.toHaveBeenCalled();
    expect(state.LOTID.value).toBe('');
    expect(state.dialogTitle.value).toBe('READING ERROR');
    expect(state.dialogMessage.value).toBe('LOT#를 읽어주세요.');
  });

  it('validates an empty direct search and reports search failure with focus selection', async () => {
    const { state } = await mountReady();
    await state.searchData('');
    expect(service.searchData).not.toHaveBeenCalled();
    expect(state.dialogMessage.value).toBe('LOT ID을 입력하세요');

    state.closeDialog();
    service.searchData.mockResolvedValueOnce(fail('Search rejected'));
    const focus = vi.fn();
    const select = vi.fn();
    state.lotInputRef.value = { focus, select };
    await state.searchData('LOT-3');
    await flushPromises();

    expect(state.dialogMessage.value).toBe('Search rejected');
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
  });

  it('treats a missing response payload as a failure', async () => {
    service.searchData.mockResolvedValueOnce({ success: true, data: null, errorMessage: '' });
    const { state } = await mountReady();

    await state.searchData('LOT-9');

    expect(state.dialogTitle.value).toBe('에  러');
    expect(state.canExecute.value).toBe(false);
  });

  it('guards execution when the loaded LOT is missing', () => {
    const state = mount(
      defineComponent({
        setup(_, { expose }) {
          const value = useEtchInspection();
          expose({ value });
          return () => h('div');
        },
      }),
    ).vm as unknown as { value: ReturnType<typeof useEtchInspection> };

    state.value.execution();
    expect(state.value.dialogTitle.value).toBe('에  러');
    expect(state.value.dialogMessage.value).toBe('LotName이 확인되지 않습니다..');
    expect(service.execution).not.toHaveBeenCalled();
  });

  it('requires confirmation before replacing an existing inspection and sends the payload', async () => {
    const { state } = await mountReady();
    setLoadedState(state, '2026-09-29 10:30:00');

    state.execution();
    expect(state.dialogMode.value).toBe('confirm');
    expect(state.dialogTitle.value).toBe('알  림');
    expect(state.dialogMessage.value).toBe(
      '[ETCH-010] 공정의 검사 이력이 있습니다. 삭제 후 다시 입력 하시겠습니까?',
    );

    state.cancelDialog();
    expect(service.execution).not.toHaveBeenCalled();

    state.execution();
    await state.confirmExecution();
    expect(service.execution).toHaveBeenCalledWith({
      facility: 'FAB-A',
      lotId: 'LOT-1',
      product: 'PRODUCT-A',
      oldOperation: 'ETCH-010',
      oldOperationDesc: 'Old operation',
      oldMachine: 'EQP-1',
      operatorId: 'OPERATOR-1',
      comment: 'comment',
    });
    expect(state.canExecute.value).toBe(false);
    expect(state.LOTID.value).toBe('');
  });

  it('keeps loaded data when execution fails and focuses LOT input after success', async () => {
    const { state } = await mountReady();
    setLoadedState(state);

    service.execution.mockResolvedValueOnce({ success: false, errorMessage: 'Execution rejected' });
    await state.confirmExecution();
    expect(state.dialogMessage.value).toBe('Execution rejected');
    expect(state.txtViewLotname.value).toBe('LOT-1');
    expect(state.canExecute.value).toBe(true);

    state.closeDialog();
    const focus = vi.fn();
    const select = vi.fn();
    state.lotInputRef.value = { focus, select };
    await state.confirmExecution();
    await flushPromises();
    expect(state.txtViewLotname.value).toBe('');
    expect(focus).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
  });

  it('reports thrown API errors in the alert dialog', async () => {
    const { state } = await mountReady();

    service.searchData.mockRejectedValueOnce(new Error('network failure'));
    await state.searchData('LOT-1');
    expect(state.dialogMessage.value).toBe('network failure');

    setLoadedState(state);
    service.execution.mockRejectedValueOnce(new Error('execution exception'));
    await state.confirmExecution();
    expect(state.dialogMessage.value).toBe('execution exception');
  });
});
