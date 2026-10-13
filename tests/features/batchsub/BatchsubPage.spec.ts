import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/deviceinfo';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

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

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: ['rows', 'columns', 'rowKey'],
  emits: ['rowSelect'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'batchsub-grid-stub' }, [
        h(
          'div',
          { 'data-testid': 'batchsub-grid-headers' },
          (props.columns as { name: string }[]).map((column) => column.name).join('|'),
        ),
        h(
          'div',
          { 'data-testid': 'batchsub-grid-rows' },
          (props.rows as { Jalotname: string }[]).map((row) => row.Jalotname).join('|'),
        ),
        ...(props.rows as { no: string; Jalotname: string }[]).map((row, index) =>
          h(
            'button',
            {
              type: 'button',
              'data-testid': `batchsub-row-${index}`,
              onClick: () => emit('rowSelect', row.no),
            },
            row.Jalotname,
          ),
        ),
      ]);
  },
});

import BatchsubPage from '../../../src/features/batchsub/pages/BatchsubPage.vue';
import { useBatchsubStore } from '../../../src/features/batchsub/stores/batchsub.store';

function mountPage() {
  return mount(BatchsubPage, {
    global: {
      stubs: {
        BaseRevoGrid: BaseRevoGridStub,
      },
    },
  });
}

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

    const wrapper = mountPage();
    await flushPromises();

    expect(fetchBatchsubList).toHaveBeenCalledWith({
      facility: 'KFAB',
      psbatchid: 'BAT2026092201',
    });
    expect(wrapper.get('[data-testid="batchsub-title"]').text()).toBe('子 BATCH LIST');
    const grid = wrapper.getComponent(BaseRevoGridStub);

    expect(grid.props('rowKey')).toBe('no');
    expect((grid.props('columns') as { name: string }[]).map((column) => column.name)).toEqual([
      'No',
      'BATCH ID',
      'LOT No.',
    ]);
    expect(grid.props('rows')).toEqual([
      { no: '1', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 01' },
      { no: '2', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 02' },
    ]);
    expect(wrapper.get('[data-testid="batchsub-grid-rows"]').text()).toContain('LOT2026092201 02');
  });

  it('does not load when MOBATCHID is empty', async () => {
    mountPage();
    await flushPromises();

    expect(fetchBatchsubList).not.toHaveBeenCalled();
  });

  it('stores selected JALOTNAME and navigates back on row click', async () => {
    routeQuery = { MOBATCHID: 'BAT2026092201' };
    fetchBatchsubList.mockResolvedValue({
      context: { facility: 'KFAB', psbatchid: 'BAT2026092201', serchType: 'C' },
      items: [{ no: '1', batchId: 'BAT2026092201', Jalotname: 'LOT2026092201 01' }],
    });

    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('[data-testid="batchsub-row-0"]').trigger('click');

    expect(useBatchsubStore().result).toEqual({ JALOTNAME: 'LOT2026092201 01' });
    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('stores empty JALOTNAME on cancel', async () => {
    const wrapper = mountPage();

    await wrapper.get('[data-testid="batchsub-cancel"]').trigger('click');

    expect(useBatchsubStore().result).toEqual({ JALOTNAME: '' });
    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('uses centered title and BaseRevoGrid without direct back icon imports', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/batchsub/pages/BatchsubPage.vue'),
      'utf8',
    );

    expect(source).not.toContain('@ant-design/icons-vue');
    expect(source).not.toContain('QIcon');
    expect(source).not.toContain('sym_o_arrow_back');
    expect(source).not.toContain('batchsub__back');
    expect(source).not.toContain('<table');
    expect(source).toContain('BaseRevoGrid');
    expect(source).toContain('justify-content: center');
  });

  it('keeps the RevoGrid height and cell spacing aligned with RCP inquire', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/batchsub/pages/BatchsubPage.vue'),
      'utf8',
    );

    expect(source).toContain('const BATCHSUB_GRID_HEADER_SIZE = 40');
    expect(source).toContain('const BATCHSUB_GRID_ROW_SIZE = 40');
    expect(source).not.toContain('const BATCHSUB_GRID_MIN_WIDTH');
    expect(source).not.toContain('const tableCardRef = ref<HTMLElement>();');
    expect(source).not.toContain('class="batchsub__grid-scroll"');
    expect(source).toContain(':row-size="BATCHSUB_GRID_ROW_SIZE"');
    expect(source).toContain(':style="gridStyle"');
    expect(source).not.toContain('stretch\n');
    expect(source).toContain(
      'height: `${BATCHSUB_GRID_HEADER_SIZE + items.value.length * BATCHSUB_GRID_ROW_SIZE}px`',
    );
    expect(source).not.toContain('width: `${gridWidth.value}px`');
    expect(source).not.toContain(
      'gridWidth.value - BATCHSUB_NO_COLUMN_WIDTH - BATCHSUB_BATCH_ID_COLUMN_WIDTH',
    );
    expect(source).not.toContain('ResizeObserver');
    expect(source).toContain('.batchsub__grid {\n  --base-revo-grid-border-color');
    expect(source).not.toContain('.batchsub__grid-scroll {');
    expect(source).not.toContain(
      '  flex: 1 1 auto;\n}\n\n.batchsub__grid :deep(.base-revo-grid__viewport)',
    );
    expect(source).toContain('--revo-grid-header-padding: 0 12px');
    expect(source).toContain('--revo-grid-cell-padding: 0 12px');
    expect(source).toContain('.batchsub__grid :deep(.rgHeaderCell)');
    expect(source).toContain('color: #ffffff');
    expect(source).toContain('.batchsub__grid :deep(.rgCell)');
    expect(source).toContain('padding: 0 12px');
    expect(source).toContain(".batchsub__grid :deep(.rgHeaderCell:not([data-rgcol='0'])),");
    expect(source).not.toContain(
      ".batchsub__grid :deep(.base-revo-grid__scroll-indicator[aria-valuemax='0'])",
    );
  });
});
