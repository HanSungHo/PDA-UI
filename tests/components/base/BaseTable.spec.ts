import { mount } from '@vue/test-utils';
import { BaseTable } from 'src/components/base';
import { describe, expect, it } from 'vitest';

const rows = Array.from({ length: 12 }, (_, index) => ({
  id: `LOT-${index}`,
  status: index === 0 ? 'FAIL' : 'RUN',
}));
const columns = [{ name: 'id', field: 'id', label: 'LOTNO' }];

describe('BaseTable', () => {
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
