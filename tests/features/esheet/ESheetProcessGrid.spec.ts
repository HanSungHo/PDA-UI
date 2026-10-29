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
  emits: ['row-select', 'cell-activate', 'cell-click', 'cell-double-click'],
  template: '<div data-testid="base-revo-grid-stub"><div class="rgCell" /></div>',
});

function createRow(overrides: Partial<ESheetProcessRow> = {}): ESheetProcessRow {
  return {
    actionType: '',
    bay: 'B01',
    c: '1',
    commentCount: '1',
    current: true,
    description: 'Inspection spec',
    displayName: 'Inspection',
    endTime: '',
    equipmentGroup: 'EQ01',
    equipmentGroupChanged: false,
    facility: 'F01',
    futureActionDescription: '',
    i: '100',
    id: 'P00001:00:0',
    inOperationName: '',
    isDcol: 'Y',
    isRework: 'N',
    lotStatus: 'WAIT',
    name: 'Inspection',
    o: '100',
    operation: 'P00001',
    operationNumber: 'P00001',
    operationType: 'P',
    operSequence: '0001',
    realEquipmentId: 'EQP-01',
    realRecipe: 'RCP-INSPECT',
    realReticle: '',
    recipe: 'RCP-INSPECT',
    recipeChanged: false,
    rowClass: '',
    startTime: '',
    subOperation: '00',
    subOperationNumber: '00',
    outOperationName: '',
    ...overrides,
  };
}

const rows: ESheetProcessRow[] = [
  createRow(),
  createRow({
    actionType: '',
    commentCount: '0',
    current: false,
    id: 'P00002:00:1',
    isDcol: 'N',
    name: 'Measurement',
    displayName: 'Measurement',
    operation: 'P00002',
    operationNumber: 'P00002',
    operationType: 'S',
    subOperation: '00',
    subOperationNumber: '00',
  }),
];

function mountGrid(selectedProcessId = rows[0].id, showOperationNumbers = false) {
  return mount(ESheetProcessGrid, {
    props: { rows, selectedProcessId, showOperationNumbers },
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

  it('reports a process tap only for cells without their own legacy action', () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);
    const click = (row: ESheetProcessRow, prop: string) =>
      grid.vm.$emit('cell-click', { rowKey: row.id, row, prop, wasSelected: false });

    click(rows[0], 'displayName');
    click(rows[0], 'bay');
    click(rows[1], 'c');
    click(rows[0], 'c');
    click(rows[0], 'isDcol');
    click(rows[0], 'description');
    click(rows[0], 'equipmentGroup');
    click(rows[0], 'recipe');

    expect(wrapper.emitted('processTap')).toEqual([[rows[0]], [rows[0]], [rows[1]]]);
  });

  it('reports a process tap on Enter for a focused process cell', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', { rowKey: rows[1].id, row: rows[1], prop: 'displayName' });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('processTap')).toEqual([[rows[1]]]);
  });

  it('does not open the drawer when the selected M/P process cell receives focus', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'displayName',
    });

    expect(wrapper.emitted('openMenu')).toBeUndefined();
  });

  it('opens the drawer on a normal click of the selected M/P process cell', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);
    await grid.find('.rgCell').trigger('pointerdown');

    grid.vm.$emit('cell-click', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'displayName',
      wasSelected: true,
    });

    expect(wrapper.emitted('openMenu')).toEqual([[rows[0].id]]);
  });

  it('does not open the drawer on a normal click of an unselected process cell', async () => {
    const wrapper = mountGrid(rows[1].id);
    const grid = wrapper.findComponent(BaseRevoGridStub);
    await grid.find('.rgCell').trigger('pointerdown');

    grid.vm.$emit('cell-click', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'displayName',
      wasSelected: false,
    });

    expect(wrapper.emitted('openMenu')).toBeUndefined();
  });

  it('opens the drawer on Enter for a focused selected M/P process cell', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'displayName',
    });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('openMenu')).toEqual([[rows[0].id]]);
  });

  it('does not open the drawer for another row, another column, or an unsupported operation', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-double-click', {
      rowKey: rows[1].id,
      row: rows[1],
      prop: 'displayName',
    });
    grid.vm.$emit('cell-double-click', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'c',
    });
    grid.vm.$emit('cell-double-click', {
      rowKey: rows[0].id,
      row: { ...rows[0], operationType: 'S' },
      prop: 'displayName',
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('openMenu')).toBeUndefined();
  });

  it('adds operation number columns only when the checkbox is selected', () => {
    const hidden = mountGrid();
    const visible = mountGrid(rows[0].id, true);

    expect(hidden.getComponent(BaseRevoGridStub).props('columns')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ prop: 'operationNumber' })]),
    );
    expect(visible.getComponent(BaseRevoGridStub).props('columns')).toEqual(
      expect.arrayContaining([expect.objectContaining({ prop: 'operationNumber', name: 'Step#' })]),
    );
  });

  it('opens EDC on Enter for a D cell marked Y', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    expect(grid.props('columns')).toEqual(
      expect.arrayContaining([expect.objectContaining({ prop: 'isDcol', name: 'D' })]),
    );
    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: { ...rows[0], isDcol: 'Y' },
      prop: 'isDcol',
    });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('openEdc')).toEqual([[expect.objectContaining({ isDcol: 'Y' })]]);
  });

  it('opens the comment flow only for supported operation types with a comment', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-double-click', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'c',
    });
    grid.vm.$emit('cell-double-click', {
      rowKey: rows[1].id,
      row: rows[1],
      prop: 'c',
    });

    expect(wrapper.emitted('openComment')).toEqual([[rows[0]]]);
  });

  it('opens the comment flow on Enter for a supported comment cell', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'c',
    });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('openComment')).toEqual([[rows[0]]]);
  });

  it('does not open the wafer list from grid I/O cells and opens process details on Enter', async () => {
    const wrapper = mountGrid();
    const grid = wrapper.findComponent(BaseRevoGridStub);

    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'i',
    });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });
    grid.vm.$emit('cell-activate', {
      rowKey: rows[0].id,
      row: rows[0],
      prop: 'description',
    });
    await grid.find('.rgCell').trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('openWaferList')).toBeUndefined();
    expect(wrapper.emitted('showDetails')).toEqual([
      ['DESCRIPTION', '[DESCRIPTION]\nInspection spec', rows[0]],
    ]);
  });
});
