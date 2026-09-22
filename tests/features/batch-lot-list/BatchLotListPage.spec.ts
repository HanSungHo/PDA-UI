import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { ApiError } from '../../../src/services/api-error';

const { fetchBatchLotList } = vi.hoisted(() => ({
  fetchBatchLotList: vi.fn(),
}));

vi.mock('../../../src/features/batch-lot-list/services/batch-lot-list.service', () => ({
  fetchBatchLotList,
}));

import BatchLotListPage from '../../../src/features/batch-lot-list/pages/BatchLotListPage.vue';

enableAutoUnmount(afterEach);

const lots = [
  { no: '1', lotId: 'LOT-A260915-018', isDcol: 'Y' },
  { no: '2', lotId: 'LOT-A260915-019', isDcol: 'N' },
];

let router: Router;

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/batch-lot-list', name: 'batch-lot-list', component: BatchLotListPage },
    ],
  });
}

async function mountPage(props: Record<string, unknown> = {}) {
  const wrapper = mount(BatchLotListPage, {
    attachTo: document.body,
    global: { plugins: [router] },
    props,
  });
  await flushPromises();

  return wrapper;
}

function errorDialogText(): string | undefined {
  return document.body.querySelector('.ds-modal__body')?.textContent?.trim();
}

async function clickDialogOk(): Promise<void> {
  const okButton = document.body.querySelector<HTMLButtonElement>('.ds-modal__footer button');
  okButton?.click();
  await flushPromises();
}

describe('BatchLotListPage', () => {
  beforeEach(async () => {
    fetchBatchLotList.mockReset();
    fetchBatchLotList.mockResolvedValue({
      context: { batId: 'BAT-A260915-001', facility: 'KFAB' },
      items: lots,
    });
    router = createTestRouter();
    await router.push('/batch-lot-list');
    await router.isReady();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the batch on mount when a batch id is provided and renders the lot grid', async () => {
    const wrapper = await mountPage({ batId: 'BAT-A260915-001' });

    expect(fetchBatchLotList).toHaveBeenCalledWith({ batId: 'BAT-A260915-001', facility: 'KFAB' });
    expect(wrapper.get('input').element.value).toBe('BAT-A260915-001');

    const headers = wrapper.findAll('th').map((th) => th.text());
    expect(headers).toEqual(['NO', 'LOT No.', 'D']);

    const rows = wrapper.findAll('tbody tr[tabindex]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain('LOT-A260915-018');
    expect(rows[1]?.attributes('aria-selected')).toBe('false');
  });

  it('reads the initial batch id from the route query when no prop is given', async () => {
    await router.replace({ path: '/batch-lot-list', query: { batId: 'BAT-A260915-002' } });
    await mountPage();

    expect(fetchBatchLotList).toHaveBeenCalledWith({ batId: 'BAT-A260915-002', facility: 'KFAB' });
  });

  it('does not search on mount without a batch id and searches on form submit', async () => {
    const wrapper = await mountPage();

    expect(fetchBatchLotList).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter a batch id and press Search.');

    await wrapper.get('input').setValue('  BAT-A260916-001 ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(fetchBatchLotList).toHaveBeenCalledWith({ batId: 'BAT-A260916-001', facility: 'KFAB' });
  });

  it('shows the error dialog when OK is pressed without a selected lot', async () => {
    const wrapper = await mountPage({ batId: 'BAT-A260915-001' });

    await wrapper.get('footer button:first-of-type').trigger('click');
    await flushPromises();

    expect(errorDialogText()).toBe('Please select a LOT.');
    expect(wrapper.emitted('confirm')).toBeUndefined();

    await clickDialogOk();
    expect(document.body.querySelector('.ds-modal__body')).toBeNull();
  });

  it('emits the selected lot on OK and leaves navigation to the listener', async () => {
    const back = vi.spyOn(router, 'back');
    const wrapper = await mountPage({ batId: 'BAT-A260915-001', onConfirm: vi.fn() });

    const rows = wrapper.findAll('tbody tr[tabindex]');
    await rows[1]!.trigger('click');
    expect(rows[1]?.classes()).toContain('is-selected');
    expect(rows[1]?.attributes('aria-selected')).toBe('true');

    await wrapper.get('footer button:first-of-type').trigger('click');

    expect(wrapper.emitted('confirm')).toEqual([['LOT-A260915-019']]);
    expect(back).not.toHaveBeenCalled();
  });

  it('navigates back on Cancel when nobody listens for the result', async () => {
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    const wrapper = await mountPage();

    await wrapper.get('footer button:last-of-type').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('moves selection with the arrow keys and confirms with Enter', async () => {
    const wrapper = await mountPage({ batId: 'BAT-A260915-001', onConfirm: vi.fn() });
    const rows = wrapper.findAll<HTMLTableRowElement>('tbody tr[tabindex]');

    rows[0]!.element.focus();
    await rows[0]!.trigger('focus');
    await rows[0]!.trigger('keydown', { key: 'ArrowDown' });
    await rows[1]!.trigger('focus');

    expect(document.activeElement).toBe(rows[1]!.element);
    expect(rows[1]?.classes()).toContain('is-selected');

    await rows[1]!.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('confirm')).toEqual([['LOT-A260915-019']]);
  });

  it('shows the server error message when the lookup fails', async () => {
    fetchBatchLotList.mockRejectedValue(new ApiError('Batch not found.', { status: 404 }));
    const wrapper = await mountPage({ batId: 'UNKNOWN' });

    expect(errorDialogText()).toBe('Batch not found.');
    expect(wrapper.text()).toContain('No LOT found for this batch.');
  });
});
