import { mount } from '@vue/test-utils';
import { BaseTable } from 'src/components/base';
import { describe, expect, it } from 'vitest';

const rows = Array.from({ length: 12 }, (_, index) => ({
  id: `LOT-${index}`,
  status: index === 0 ? 'FAIL' : 'RUN',
}));
const columns = [{ name: 'id', field: 'id', label: 'LOTNO' }];

describe('BaseTable', () => {
  it('provides row, column and value to the optional cell slot', async () => {
    const wrapper = mount(BaseTable, {
      props: { rows: [{ id: 'LOT-1' }], columns, rowKey: 'id' },
      slots: {
        cell: '<template #cell="{ row, column, value }"><button @click.stop>{{ row.id }}:{{ column.name }}:{{ value }}</button></template>',
      },
    });
    try {
      expect(wrapper.get('tbody button').text()).toBe('LOT-1:id:LOT-1');
      await wrapper.get('tbody button').trigger('click');
      expect(wrapper.emitted('row-click')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });
  it('renders all rows without pagination and supports click and keyboard selection', async () => {
    const wrapper = mount(BaseTable, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        selectedRowKey: 'LOT-0',
        rowStatus: (row) => String(row.status),
      },
    });
    try {
      expect(wrapper.findAll('tbody tr')).toHaveLength(12);
      expect(wrapper.get('th').text()).toBe('LOTNO');
      const firstRow = wrapper.get('tbody tr');
      expect(firstRow.attributes('aria-selected')).toBe('true');
      expect(firstRow.classes()).toContain('ds-table__row--fail');
      await firstRow.trigger('click');
      await firstRow.trigger('keydown.enter');
      await firstRow.trigger('keydown.space');
      expect(wrapper.emitted('row-click')).toEqual([[rows[0]], [rows[0]], [rows[0]]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('supports non-interactive rows while preserving interactive cell controls', async () => {
    const wrapper = mount(BaseTable, {
      props: { rows: [{ id: 'LOT-1' }], columns, rowKey: 'id', rowInteractive: false },
      slots: {
        cell: '<template #cell="{ row }"><button>{{ row.id }}</button></template>',
      },
    });
    try {
      const row = wrapper.get('tbody tr');
      expect(row.attributes('tabindex')).toBeUndefined();
      expect(row.attributes('aria-selected')).toBeUndefined();
      await row.trigger('click');
      await row.trigger('keydown.enter');
      await row.trigger('keydown.space');
      expect(wrapper.emitted('row-click')).toBeUndefined();
      expect(wrapper.get('tbody button').text()).toBe('LOT-1');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the empty slot when there are no rows', () => {
    const wrapper = mount(BaseTable, {
      props: { rows: [], columns, rowKey: 'id' },
      slots: { empty: '<span>해당 결과가 없습니다</span>' },
    });
    try {
      expect(wrapper.text()).toContain('해당 결과가 없습니다');
      expect(wrapper.find('tbody tr').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
