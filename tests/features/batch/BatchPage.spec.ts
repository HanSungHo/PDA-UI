import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentPublicInstance } from 'vue';

const api = vi.hoisted(() => ({
  checkBatchCreate: vi.fn(),
  fetchLotInfo: vi.fn(),
  fetchMachineInfo: vi.fn(),
  fetchBatchZone: vi.fn(),
  fetchBatchListByLot: vi.fn(),
  fetchBatchCount: vi.fn(),
  fetchParentBatchIds: vi.fn(),
  submitBatch: vi.fn(),
}));
const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn(), guard: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => router, onBeforeRouteLeave: router.guard }));
vi.mock('src/features/batch/services/batch.service', () => api);
vi.mock('@revolist/vue3-datagrid', () => ({
  default: { name: 'RevoGrid', props: ['source', 'columns'], template: '<div />' },
}));
import { BaseDropdownList } from 'src/components/base/dropdown-list';
import { BaseRadioGroup } from 'src/components/base/radio';
import { BaseRevoGrid } from 'src/components/base/revo-grid';

import BatchPage from '../../../src/features/batch/pages/BatchPage.vue';
import { useBatchStore } from '../../../src/features/batch/stores/batch.store';
import { useBatchsubStore } from '../../../src/features/batchsub/stores/batchsub.store';

const wrappers: VueWrapper<ComponentPublicInstance>[] = [];
function page() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const w = mount(BatchPage, { attachTo: host });
  wrappers.push(w);
  return w;
}
function input(w: VueWrapper, testid: string) {
  return w.get(`[data-testid="${testid}"] input`);
}
async function dialogButton(label = '확인') {
  const button = [...document.body.querySelectorAll('button')].find(
    (el) => el.textContent?.trim() === label,
  );
  expect(button).toBeTruthy();
  button!.click();
  await flushPromises();
}
function lot(overrides: Record<string, string> = {}) {
  return {
    PRODUCT: 'P',
    OPERATION: '1100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'DIFF',
    QUANTITY: '25',
    BATCHID: '',
    STEPRECIPE: 'R',
    LIMITZONE: 'O',
    STATUS: 'RUN',
    VIEWCOUNT: '1/2/3',
    PROCESSNAME: '',
    PTIN: 'v',
    PTSPEC: 'v',
    CHECKQTIME: '',
    PROCESSOPERATIONTYPE: 'T',
    JALOT: '',
    MOLOT: '',
    CHECKRECIPE: 'R',
    JACOUNT: '0',
    LIMITRECIPE: 'R',
    FQCSAMPLE: '',
    ...overrides,
  };
}
async function lookup(w: VueWrapper, id = 'A', overrides: Record<string, string> = {}) {
  api.fetchLotInfo.mockResolvedValueOnce(lot(overrides));
  await input(w, 'batch-lot-input').setValue(id);
  await w.get('[data-testid="batch-search-button"]').trigger('click');
  await flushPromises();
}

describe('BatchPage source integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    vi.resetAllMocks();
    DeviceInfo.FACILITY = 'KFAB';
    api.checkBatchCreate.mockResolvedValue({ BATCHMESSGE: '', SAMPLECYCLE: '', REMOTE: '' });
    api.submitBatch.mockResolvedValue({ INTERLOCKMSG: '', TTINTERLOCKMSG: '', NOTICEDOWN: '' });
  });
  afterEach(() => {
    okDialog.confirm();
    wrappers.splice(0).forEach((w) => w.unmount());
    vi.useRealTimers();
  });
  it('renders one centered-header title and source readonly fields including count', () => {
    const w = page();
    expect(w.get('h1').text()).toBe('BATCH');
    expect(w.get('header').find('button').exists()).toBe(false);
    expect(input(w, 'batch-id-input').attributes('readonly')).toBeDefined();
    expect(input(w, 'batch-count-input').attributes('readonly')).toBeDefined();
    expect(input(w, 'batch-lot-input').attributes('readonly')).toBeUndefined();
    expect(w.findAll('input').filter((x) => x.attributes('placeholder'))).toHaveLength(0);
    expect(w.getComponent(BaseRevoGrid).props('rows')).toEqual([{ NUM: '0', gridRowKey: '0' }]);
    expect(w.text()).not.toContain('Null');
  });
  it('maps six source visible columns and hides only Z in M without losing rows', async () => {
    const w = page();
    await lookup(w);
    const grid = w.getComponent(BaseRevoGrid);
    expect(grid.props('columns').map((c) => [c.prop, c.name])).toEqual([
      ['ISDCOL', 'Z'],
      ['LOTID', 'Lot No'],
      ['QUANTITY', '수량'],
      ['RECIPE', 'RECIPE'],
      ['THIN', 'TH(UV)'],
      ['PTIN', 'PT'],
    ]);
    w.getComponent(BaseRadioGroup).vm.$emit('update:modelValue', 'M');
    await flushPromises();
    expect(grid.props('columns').map((c) => c.prop)).not.toContain('ISDCOL');
    expect(grid.props('rows')[0]).toMatchObject({ LOTID: 'A' });
  });
  it('focuses equipment first and parses equipment scanner input before API', async () => {
    const w = page();
    await flushPromises();
    expect(document.activeElement).toBe(input(w, 'batch-machine-input').element);
    api.fetchMachineInfo.mockResolvedValueOnce({ EQPID: 'CANONICAL', MSG: '' });
    await input(w, 'batch-machine-input').setValue('eqp-machine!');
    await input(w, 'batch-machine-input').trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchMachineInfo).toHaveBeenCalledWith({ facility: 'KFAB', eqpId: 'MACHINE' });
    expect(document.activeElement).toBe(input(w, 'batch-lot-input').element);
  });
  it('rejects a scanner input without the equipment prefix', async () => {
    const w = page();
    await input(w, 'batch-machine-input').setValue('BAD');
    await input(w, 'batch-machine-input').trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchMachineInfo).not.toHaveBeenCalled();
    expect(input(w, 'batch-machine-input').element).toHaveProperty('value', '');
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
  });
  it('parses LOT scanner space/dollar/trailing char and uppercases it', async () => {
    const w = page();
    api.fetchLotInfo.mockResolvedValueOnce(lot());
    await input(w, 'batch-lot-input').setValue(' $lot-a!');
    await input(w, 'batch-lot-input').trigger('keydown.enter');
    await flushPromises();
    expect(api.fetchLotInfo).toHaveBeenCalledWith(expect.objectContaining({ lotId: 'LOT-A' }));
    expect(input(w, 'batch-count-input').element).toHaveProperty('value', '1/2/3');
  });
  it('keeps search-click as direct lookup rather than scanner parsing', async () => {
    const w = page();
    await lookup(w, 'lot-a');
    expect(api.fetchLotInfo).toHaveBeenCalledWith(expect.objectContaining({ lotId: 'LOT-A' }));
  });
  it('routes row and cell events to summary, toggles and delete button state', async () => {
    const w = page();
    await lookup(w);
    const grid = w.getComponent(BaseRevoGrid);
    expect(w.get('[aria-label="Delete selected row"]').attributes('disabled')).toBeDefined();
    grid.vm.$emit('rowSelect', '0');
    grid.vm.$emit('cellActivate', { rowKey: '0', prop: 'THIN' });
    await flushPromises();
    expect(useBatchStore().batchItemList[0]?.THIN).toBe('Y');
    expect(input(w, 'batch-lot-input').element).toHaveProperty('value', 'A');
    expect(w.get('[aria-label="Delete selected row"]').attributes('disabled')).toBeUndefined();
    await w.get('[aria-label="Delete selected row"]').trigger('click');
    expect(useBatchStore().batchItemList).toEqual([{ NUM: '0' }]);
  });
  it('initializes in place with form cancel but exits with footer cancel', async () => {
    const w = page();
    await lookup(w);
    await w.get('[data-testid="batch-initialize"]').trigger('click');
    expect(router.back).not.toHaveBeenCalled();
    expect(useBatchStore().validBatchItems).toEqual([]);
    await w.get('[data-testid="batch-cancel"]').trigger('click');
    expect(router.back).toHaveBeenCalledOnce();
  });
  it('opens a fresh state when returning to Batch without a child result', () => {
    const s = useBatchStore();
    s.txtBatId = 'OLD';
    s.editMachine = 'OLD';
    page();
    expect(s.txtBatId).toBe('');
    expect(s.editMachine).toBe('');
  });
  it('restores the suspended Batch state when Batchsub is cancelled', async () => {
    const s = useBatchStore();
    s.txtBatId = 'PARENT';
    s.editMachine = 'EQP';
    useBatchsubStore().cancel();
    page();
    await flushPromises();
    expect(s.txtBatId).toBe('PARENT');
    expect(s.editMachine).toBe('EQP');
  });
  it('applies pending Batchsub result with cleared equipment without a fresh-mode reset', async () => {
    const s = useBatchStore();
    s.checkedRadioButton('M');
    s.editMachine = 'EQP';
    useBatchsubStore().complete({ JALOTNAME: 'CHILD' });
    api.fetchLotInfo.mockResolvedValueOnce(lot());
    page();
    await flushPromises();
    expect(api.fetchLotInfo).toHaveBeenCalledWith(
      expect.objectContaining({ lotId: 'CHILD', eqpId: '' }),
    );
    expect(s.radioType).toBe('M');
    expect(useBatchsubStore().result).toBeUndefined();
  });
  it('disables unrelated child lookup and parent/zone selectors initially', () => {
    const w = page();
    expect(w.get('[data-testid="batch-child-search"]').attributes('disabled')).toBeDefined();
    const dropdowns = w.findAllComponents(BaseDropdownList);
    expect(dropdowns[1]?.props('disabled')).toBe(true);
    expect(dropdowns[2]?.props('disabled')).toBe(true);
  });
  it('opens Batchsub only for multiple children and uses source yes/no labels', async () => {
    const w = page();
    api.fetchBatchListByLot.mockResolvedValueOnce({
      BATCHID: 'PB',
      EQPID: 'EQP',
      BATCHTYPE: 'R',
      MWCOUNT: '1',
      RECIPE: 'R',
      PARENTBATCHID: '',
      CHILDZONE: '',
      BATCHITEMS: [],
    });
    await lookup(w, 'A', { BATCHID: 'PB', JALOT: 'CHILD', JACOUNT: '2' });
    expect(document.body.textContent).toContain('예');
    expect(document.body.textContent).toContain('아니오');
    await dialogButton('예');
    await w.get('[data-testid="batch-child-search"]').trigger('click');
    await flushPromises();
    expect(router.push).toHaveBeenCalledWith({ name: 'batchsub', query: { MOBATCHID: 'PB' } });
  });
  it('shows errors, clears failed LOT, then focuses LOT', async () => {
    const w = page();
    api.fetchLotInfo.mockRejectedValueOnce(new Error('lot failure'));
    await input(w, 'batch-lot-input').setValue('BAD');
    await w.get('[data-testid="batch-search-button"]').trigger('click');
    await flushPromises();
    await dialogButton();
    expect(input(w, 'batch-lot-input').element).toHaveProperty('value', '');
    expect(document.activeElement).toBe(input(w, 'batch-lot-input').element);
  });
  it('submits only once during the source click delay and closes after warnings', async () => {
    const w = page();
    await lookup(w);
    useBatchStore().editMachine = 'EQP';
    api.submitBatch.mockResolvedValueOnce({
      INTERLOCKMSG: 'warning',
      TTINTERLOCKMSG: '',
      NOTICEDOWN: '',
    });
    const button = w.get('[data-testid="batch-footer-action"]');
    await button.trigger('click');
    await button.trigger('click');
    await flushPromises();
    expect(api.submitBatch).toHaveBeenCalledOnce();
    expect(router.back).not.toHaveBeenCalled();
    await dialogButton();
    expect(router.back).toHaveBeenCalledOnce();
  });
  it('preserves the suspended activity after system Back from Batchsub without a result', async () => {
    const w = page();
    api.fetchBatchListByLot.mockResolvedValueOnce({
      BATCHID: 'PB',
      EQPID: 'EQP',
      BATCHTYPE: 'R',
      MWCOUNT: '1',
      RECIPE: 'R',
      PARENTBATCHID: '',
      CHILDZONE: '',
      BATCHITEMS: [],
    });
    await lookup(w, 'A', { BATCHID: 'PB', JALOT: 'CHILD', JACOUNT: '2' });
    await dialogButton('예');
    await w.get('[data-testid="batch-child-search"]').trigger('click');
    await flushPromises();
    w.unmount();
    page();
    await flushPromises();
    expect(useBatchStore().txtBatId).toBe('PB');
    expect(useBatchStore().editMachine).toBe('EQP');
  });
  it('blocks reset, submit and another lookup while a LOT request is pending', async () => {
    const w = page();
    let resolve!: (value: ReturnType<typeof lot>) => void;
    api.fetchLotInfo.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    useBatchStore().editMachine = 'EQP';
    await input(w, 'batch-lot-input').setValue('A');
    await w.get('[data-testid="batch-search-button"]').trigger('click');
    await w.get('[data-testid="batch-initialize"]').trigger('click');
    await w.get('[data-testid="batch-footer-action"]').trigger('click');
    expect(useBatchStore().editMachine).toBe('EQP');
    expect(api.checkBatchCreate).not.toHaveBeenCalled();
    expect(api.submitBatch).not.toHaveBeenCalled();
    expect(api.fetchLotInfo).toHaveBeenCalledOnce();
    resolve(lot());
    await flushPromises();
    expect(useBatchStore().validBatchItems).toHaveLength(1);
  });
  it('blocks route Back while a request is pending and permits the successful submit navigation', async () => {
    const w = page();
    let resolve!: (value: ReturnType<typeof lot>) => void;
    api.fetchLotInfo.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    useBatchStore().editMachine = 'EQP';
    await input(w, 'batch-lot-input').setValue('A');
    await w.get('[data-testid="batch-search-button"]').trigger('click');
    expect(router.guard).toHaveBeenCalledOnce();
    const leave = router.guard.mock.calls[0]![0] as () => boolean;
    expect(leave()).toBe(false);
    resolve(lot());
    await flushPromises();
    expect(leave()).toBe(true);
    router.back.mockImplementationOnce(() => {
      expect(leave()).toBe(true);
    });
    await w.get('[data-testid="batch-footer-action"]').trigger('click');
    await flushPromises();
    expect(router.back).toHaveBeenCalledOnce();
  });
  it('keeps RevoGrid display keys unique when hidden source NUM values repeat', async () => {
    const w = page();
    api.fetchBatchListByLot.mockResolvedValueOnce({
      BATCHID: 'B',
      EQPID: 'EQP',
      BATCHTYPE: 'R',
      MWCOUNT: '1',
      RECIPE: 'R',
      PARENTBATCHID: '',
      CHILDZONE: '',
      BATCHITEMS: [{ LOTID: '' }, { LOTID: 'A', ISDCOL: 'Y' }],
    });
    await useBatchStore().getBatchListByLot('A');
    await flushPromises();
    const grid = w.getComponent(BaseRevoGrid);
    expect(grid.props('rows')).toEqual([
      expect.objectContaining({ NUM: '1', gridRowKey: '0' }),
      expect.objectContaining({ NUM: '1', gridRowKey: '1' }),
    ]);
    grid.vm.$emit('rowSelect', '0');
    await flushPromises();
    expect(useBatchStore().selectedRowIndex).toBe(1);
    expect(grid.props('selectedRowKey')).toBe('0');
  });
});
