import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { router, service } = vi.hoisted(() => ({
  router: { push: vi.fn(), back: vi.fn() },
  service: { getMergeLot: vi.fn(), executeMergeLot: vi.fn() },
}));
vi.mock('vue-router', () => ({ useRouter: () => router }));
vi.mock('~/constants/deviceinfo', () => ({ DeviceInfo: { FACILITY: 'FAB', OPERATOR_ID: 'OP' } }));
vi.mock('src/features/merge/services/merge.service', () => service);

import { useMergePage } from 'src/features/merge/composables/useMergePage';

const lot = {
  AREA: 'ETCH',
  LOTHOLDSTATE: 'N',
  PROCESSOPERATIONNAME: '100',
  OPERATIONDESCRIPTION: 'ETCH',
  PRODUCTSPECNAME: 'P1',
  PRODUCTQUANTITY: '25',
  REWORKSTATE: 'N',
  PROCESSFLOWNAME: 'R1',
  CHECKMFGGROUP2: '',
  CHILDLOT: '',
  items: [
    {
      LOTNAME: 'L2',
      PRODUCTSPECNAME: 'P1',
      PROCESSFLOWNAME: 'R1',
      OPERATIONDESCRIPTION: 'ETCH',
      PROCESSOPERATIONNAME: '100',
      JOBCODE: 'J',
      PRODUCTQUANTITY: '12',
    },
    {
      LOTNAME: 'L3',
      PRODUCTSPECNAME: 'P1',
      PROCESSFLOWNAME: 'R1',
      OPERATIONDESCRIPTION: 'ETCH',
      PROCESSOPERATIONNAME: '100',
      JOBCODE: 'J',
      PRODUCTQUANTITY: '13',
    },
  ],
};

function setup() {
  const wrapper = mount(
    defineComponent({
      setup(_, { expose }) {
        const state = useMergePage();
        expose({ state });
        return () => h('div');
      },
    }),
  );
  return {
    wrapper,
    state: (wrapper.vm as unknown as { state: ReturnType<typeof useMergePage> }).state,
  };
}

async function acknowledge(state: ReturnType<typeof useMergePage>, promise: Promise<void>) {
  await flushPromises();
  state.closeDialog(true);
  await promise;
}

describe('useMergePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.getMergeLot.mockResolvedValue(structuredClone(lot));
    service.executeMergeLot.mockResolvedValue({ FAILLOTNAME: '', SUCCESS: 'Y' });
  });

  it('validates empty search and clears prior data', async () => {
    const { state } = setup();
    state.comment.value = 'old';
    const pending = state.getMergeLotInfo();
    await flushPromises();
    expect(state.dialog.value.message).toBe('LOT ID을 입력하세요');
    expect(state.comment.value).toBe('');
    state.closeDialog(true);
    await pending;
    expect(service.getMergeLot).not.toHaveBeenCalled();
  });

  it('loads the main LOT, toggles rows, selects all, and submits the legacy payload', async () => {
    const { state } = setup();
    state.lotId.value = 'L1';
    await state.getMergeLotInfo();
    expect(service.getMergeLot).toHaveBeenCalledWith('FAB', 'L1');
    expect(state.gMainLotId.value).toBe('L1');
    expect(state.info.value.PRODUCTSPECNAME).toBe('P1');
    state.selectLotList(1);
    expect(state.selectedRowList.value).toEqual([1]);
    state.selectLotList(1);
    expect(state.selectedRowList.value).toEqual([]);
    state.selectAllRow();
    expect(state.selectedRowList.value).toEqual([0, 1]);
    state.comment.value = 'merge comment';
    const pending = state.executeMerge();
    await flushPromises();
    expect(service.executeMergeLot).toHaveBeenCalledWith({
      facility: 'FAB',
      lotName: 'L1',
      productSpec: 'P1',
      route: 'R1',
      operation: '100',
      qty: '25',
      operatorId: 'OP',
      comment: 'merge comment',
      mergeLot: 'L2 12,L3 13',
    });
    expect(state.dialog.value.message).toBe('작업을 수행하였습니다.');
    state.closeDialog(true);
    await pending;
    expect(state.lotId.value).toBe('');
    expect(state.rows.value).toEqual([]);
  });

  it('shows confirmation before binding data and honors No', async () => {
    service.getMergeLot.mockResolvedValue({ ...lot, CHECKMFGGROUP2: 'Y' });
    const { state } = setup();
    state.lotId.value = 'L1';
    const pending = state.getMergeLotInfo();
    await flushPromises();
    expect(state.dialog.value.confirm).toBe(true);
    expect(state.rows.value).toEqual([]);
    state.closeDialog(false);
    await pending;
    expect(state.gMainLotId.value).toBe('');
  });

  it('shows Child Lot warning and no-candidate error at the same points as Android', async () => {
    service.getMergeLot.mockResolvedValueOnce({ ...lot, CHILDLOT: 'Y' });
    const { state } = setup();
    state.lotId.value = 'L1';
    const pending = state.getMergeLotInfo();
    await flushPromises();
    expect(state.dialog.value.message).toContain('Child Lot');
    state.closeDialog(true);
    await pending;
    expect(state.rows.value).toHaveLength(2);
    service.getMergeLot.mockResolvedValueOnce({ ...lot, items: [] });
    await acknowledge(state, state.getMergeLotInfo());
    expect(state.info.value.PRODUCTSPECNAME).toBe('P1');
    expect(state.rows.value).toEqual([]);
  });

  it('requires a selected LOT and reports failed LOT names without resetting', async () => {
    const { state } = setup();
    state.lotId.value = 'L1';
    await state.getMergeLotInfo();
    await acknowledge(state, state.executeMerge());
    expect(service.executeMergeLot).not.toHaveBeenCalled();
    state.selectLotList(0);
    service.executeMergeLot.mockResolvedValue({ FAILLOTNAME: 'L2', SUCCESS: '' });
    const pending = state.executeMerge();
    await flushPromises();
    expect(state.dialog.value.message).toBe('L2');
    state.closeDialog(true);
    await pending;
    expect(state.rows.value).toHaveLength(2);
  });

  it('uses BarcodeStyle on Enter and passes LOTID to the status page', async () => {
    const { state } = setup();
    state.lotId.value = ' L1!';
    await state.onLotEnter();
    expect(service.getMergeLot).toHaveBeenCalledWith('FAB', 'L1');
    state.inquireLotInfo();
    expect(router.push).toHaveBeenCalledWith({ path: '/lot-status', query: { LOTID: 'L1' } });
    state.close();
    expect(router.back).toHaveBeenCalled();
  });
});
