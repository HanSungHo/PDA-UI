import { mount } from '@vue/test-utils';
import ESheetProcessGrid from 'src/features/esheet/components/ESheetProcessGrid.vue';
import type { ESheetProcessRow } from 'src/features/esheet/esheet.types';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: {
    rows: { type: Array, required: true },
    columns: { type: Array, required: true },
  },
  emits: ['row-select', 'cell-activate'],
  template: '<div data-testid="base-revo-grid-stub" />',
});

const rows: ESheetProcessRow[] = [
  {
    actionType: 'M',
    bay: 'B01',
    c: 0,
    current: true,
    description: 'Inspection spec',
    id: 'P00001:00:0',
    i: 100,
    o: 100,
    operation: 'P00001',
    name: 'Inspection',
    operationType: 'P',
    subOperation: '00',
    commentCount: '0',
    endTime: '',
    lotStatus: 'WAIT',
    operSequence: '0001',
    facility: 'F01',
    equipmentGroup: 'EQ01',
  },
  {
    actionType: 'M',
    bay: 'B02',
    c: 0,
    current: false,
    description: 'Measurement spec',
    id: 'P00002:00:1',
    i: 100,
    o: 100,
    operation: 'P00002',
    name: 'Measurement',
    operationType: 'S',
    subOperation: '00',
    commentCount: '0',
    endTime: '',
    lotStatus: 'WAIT',
    operSequence: '0002',
    facility: 'F01',
    equipmentGroup: 'EQ01',
  },
];

function mountGrid(selectedProcessId = rows[0].id) {
  return mount(ESheetProcessGrid, {
    props: { rows, selectedProcessId },
    global: { stubs: { BaseRevoGrid: BaseRevoGridStub } },
  });
}

describe('ESheetProcessGrid', () => {
  it('forwards row selection as a string process id', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('row-select', 42);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select')).toEqual([['42']]);
  });

  it('opens the Drawer only on a second activation of the selected M/P process name cell', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'name',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('openMenu')).toEqual([[rows[0].id]]);
  });

  it('does not open the Drawer for another row, another column, or an unsupported process type', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[1].id,
      row: rows[1],
      prop: 'name',
    });
    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'c',
    });
    grid.vm.$emit('cell-activate', {
      rowKey: rows[1].id,
      row: rows[1],
      prop: 'name',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('openMenu')).toBeUndefined();
  });
});
