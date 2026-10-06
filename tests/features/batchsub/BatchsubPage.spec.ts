import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchBatchsubList, routerBack } = vi.hoisted(() => ({
  fetchBatchsubList: vi.fn(),
  routerBack: vi.fn(),
}));

let routeQuery: Record<string, string | undefined> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ back: routerBack }),
}));

vi.mock('../../../src/features/batchsub/services/batchsub.service', () => ({
  fetchBatchsubList,
}));

import BatchsubPage from '../../../src/features/batchsub/pages/BatchsubPage.vue';
import { useBatchsubStore } from '../../../src/features/batchsub/stores/batchsub.store';

describe('BatchsubPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routeQuery = {};
    routerBack.mockReset();
    fetchBatchsubList.mockReset();
    DeviceInfo.FACILITY = 'KFAB';
  });

  it('loads child batch rows from MOBATCHID and renders legacy mapped columns', async () => {
    routeQuery = { MOBATCHID: 'BAT2026092201' };
    fetchBatchsubList.mockResolvedValue({
      context: { facility: 'KFAB', psbatchid: 'BAT2026092201', serchType: 'C' },
      items: [
        { no: '1', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 01' },
        { no: '2', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 02' },
      ],
    });

    const wrapper = mount(BatchsubPage);
    await flushPromises();

    expect(fetchBatchsubList).toHaveBeenCalledWith({
      facility: 'KFAB',
      psbatchid: 'BAT2026092201',
    });
    expect(wrapper.get('[data-testid="batchsub-title"]').text()).toBe('子 BATCH LIST');
    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'No',
      'BATCH ID',
      'LOT No.',
    ]);
    expect(wrapper.text()).toContain('LOT2026092201 02');
  });

  it('does not load when MOBATCHID is empty', async () => {
    mount(BatchsubPage);
    await flushPromises();

    expect(fetchBatchsubList).not.toHaveBeenCalled();
  });

  it('stores selected JALOTNAME and navigates back on row click', async () => {
    routeQuery = { MOBATCHID: 'BAT2026092201' };
    fetchBatchsubList.mockResolvedValue({
      context: { facility: 'KFAB', psbatchid: 'BAT2026092201', serchType: 'C' },
      items: [{ no: '1', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 01' }],
    });

    const wrapper = mount(BatchsubPage);
    await flushPromises();
    await wrapper.get('[data-testid="batchsub-row-0"]').trigger('click');

    expect(useBatchsubStore().result).toEqual({ JALOTNAME: 'LOT2026092201 01' });
    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('stores empty JALOTNAME on cancel', async () => {
    const wrapper = mount(BatchsubPage);

    await wrapper.get('[data-testid="batchsub-cancel"]').trigger('click');

    expect(useBatchsubStore().result).toEqual({ JALOTNAME: '' });
    expect(routerBack).toHaveBeenCalledTimes(1);
  });
});
