import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { BaseRevoGrid as ExportedBaseRevoGrid } from 'src/components/base/revo-grid';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid/base-revo-grid.types';
import BaseRevoGrid from 'src/components/base/revo-grid/BaseRevoGrid.vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@revolist/vue3-datagrid', () => ({
  default: {
    name: 'RevoGrid',
    props: ['source', 'columns', 'stretch', 'resize', 'filter'],
    emits: ['beforecellfocus'],
    template: `
      <div data-testid="revo-grid-stub">
        <div class="rgCell" data-rgrow="0" data-rgcol="0" aria-colindex="1" />
        <div class="rgCell" data-rgrow="1" data-rgcol="0" aria-colindex="1" />
        <revogr-scroll-virtual class="vertical" />
        <revogr-scroll-virtual class="horizontal" />
      </div>
    `,
  },
}));

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  target?: Element;
  constructor(private callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }
  observe(target: Element): void {
    this.target = target;
  }
  disconnect(): void {
    this.target = undefined;
  }
  static resizeViewport(width: number): void {
    for (const observer of this.instances) {
      if (observer.target?.classList.contains('base-revo-grid__viewport')) {
        observer.callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          observer as unknown as ResizeObserver,
        );
      }
    }
  }
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

interface TestRow {
  id: string;
  name: string;
}

const rows: TestRow[] = [{ id: 'row-1', name: 'Inspection' }];
const columns = [{ prop: 'name', name: '공정명', size: 140 }];
const gridCss = readFileSync(
  join(process.cwd(), 'src/components/base/revo-grid/base-revo-grid.css'),
  'utf8',
);

describe('BaseRevoGrid', () => {
  it('is exported from the base component barrel', () => {
    expect(ExportedBaseRevoGrid).toBe(BaseRevoGrid);
  });

  it('renders generic scrollbars and emits a row key when a row is focused', async () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, rowKey: 'id', selectedRowKey: 'row-1' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    expect(wrapper.findAll('[role="scrollbar"]')).toHaveLength(2);

    expect(wrapper.findComponent({ name: 'RevoGrid' }).props('source')).toEqual([
      { ...rows[0], rowClass: 'base-revo-grid__row--selected' },
    ]);

    wrapper.findComponent({ name: 'RevoGrid' }).vm.$emit('beforecellfocus', {
      detail: { model: rows[0], type: 'rgRow', prop: 'name' },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('rowSelect')).toEqual([['row-1', rows[0]]]);
    wrapper.unmount();
  });

  it('uses the clicked cell row when focus is still on another row', async () => {
    const testRows = [
      { id: 'row-1', name: 'Inspection' },
      { id: 'row-2', name: 'Photo' },
    ];
    const wrapper = mount(BaseRevoGrid, {
      props: { rows: testRows, columns, rowKey: 'id', selectedRowKey: 'row-1' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });
    const grid = wrapper.findComponent({ name: 'RevoGrid' });
    grid.vm.$emit('beforecellfocus', {
      detail: { model: testRows[0], type: 'rgRow', prop: 'name' },
    });
    await wrapper.findAll('.rgCell')[1].trigger('pointerdown');
    await wrapper.findAll('.rgCell')[1].trigger('pointerup');
    await wrapper.findAll('.rgCell')[1].trigger('pointerdown');
    await wrapper.findAll('.rgCell')[1].trigger('pointerup');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cellClick')).toEqual([
      [
        {
          rowKey: 'row-2',
          row: expect.objectContaining({ name: 'Photo' }),
          prop: 'name',
          wasSelected: false,
        },
      ],
      [
        {
          rowKey: 'row-2',
          row: expect.objectContaining({ name: 'Photo' }),
          prop: 'name',
          wasSelected: false,
        },
      ],
    ]);
    expect(wrapper.emitted('cellDoubleClick')).toEqual([
      [{ rowKey: 'row-2', row: expect.objectContaining({ name: 'Photo' }), prop: 'name' }],
    ]);
    wrapper.unmount();
  });

  it('marks a tap on the already-selected row', async () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, rowKey: 'id', selectedRowKey: 'row-1' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    await wrapper.findAll('.rgCell')[0].trigger('pointerdown');
    await wrapper.findAll('.rgCell')[0].trigger('pointerup');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cellClick')).toEqual([
      [
        {
          rowKey: 'row-1',
          row: expect.objectContaining({ name: 'Inspection' }),
          prop: 'name',
          wasSelected: true,
        },
      ],
    ]);
    wrapper.unmount();
  });

  it('does not emit a cell click when pointer movement is a drag', async () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, rowKey: 'id', selectedRowKey: 'row-1' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });
    const cell = wrapper.find('.rgCell');

    await cell.trigger('pointerdown', { pointerId: 7, clientX: 10, clientY: 10 });
    await cell.trigger('pointerup', { pointerId: 7, clientX: 38, clientY: 10 });

    expect(wrapper.emitted('cellClick')).toBeUndefined();
    expect(wrapper.emitted('cellDoubleClick')).toBeUndefined();
    wrapper.unmount();
  });

  it('maps clicked columns with the global ARIA index across pinned viewports', async () => {
    const detailRow = {
      id: 'row-1',
      name: 'Inspection',
      c: '0',
      i: '–',
      o: '–',
      description: 'Detail',
    };
    const detailColumns = ['name', 'c', 'i', 'o', 'description'].map((prop) => ({
      prop,
      name: prop,
    }));
    const wrapper = mount(BaseRevoGrid, {
      props: { rows: [detailRow], columns: detailColumns, rowKey: 'id' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });
    const cell = wrapper.find('.rgCell');
    cell.element.setAttribute('data-rgcol', '3');
    cell.element.setAttribute('aria-colindex', '5');
    await cell.trigger('pointerdown');
    await cell.trigger('pointerup');

    expect(wrapper.emitted('cellClick')?.[0]?.[0]).toMatchObject({
      rowKey: 'row-1',
      prop: 'description',
    });
    wrapper.unmount();
  });

  it('maps global ARIA indexes after pinned columns when optional columns precede them', async () => {
    const detailRow = {
      id: 'row-1',
      operationNumber: '1200',
      subOperationNumber: 'A',
      name: 'Inspection',
      c: '2',
      i: '–',
      o: '–',
      description: 'Detail',
    };
    const detailColumns: BaseRevoGridColumn[] = [
      { prop: 'operationNumber', name: 'Step#' },
      { prop: 'subOperationNumber', name: 'Sub#' },
      { prop: 'name', name: '공정명', pin: 'colPinStart' },
      { prop: 'c', name: 'C' },
      { prop: 'i', name: 'I' },
      { prop: 'o', name: 'O' },
      { prop: 'description', name: 'DESCRIPTION' },
    ];
    const wrapper = mount(BaseRevoGrid, {
      props: { rows: [detailRow], columns: detailColumns, rowKey: 'id' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });
    const cell = wrapper.find('.rgCell');

    cell.element.setAttribute('aria-colindex', '1');
    await cell.trigger('pointerdown');
    await cell.trigger('pointerup');
    cell.element.setAttribute('aria-colindex', '4');
    await cell.trigger('pointerdown');
    await cell.trigger('pointerup');
    cell.element.setAttribute('aria-colindex', '7');
    await cell.trigger('pointerdown');
    await cell.trigger('pointerup');

    expect(wrapper.emitted('cellClick')?.map(([detail]) => detail)).toEqual([
      expect.objectContaining({ prop: 'name' }),
      expect.objectContaining({ prop: 'c' }),
      expect.objectContaining({ prop: 'description' }),
    ]);
    wrapper.unmount();
  });

  it('does not emit a cell double-tap for non-cell targets', async () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, rowKey: 'id' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });
    const grid = wrapper.findComponent({ name: 'RevoGrid' });
    grid.vm.$emit('beforecellfocus', {
      detail: { model: rows[0], type: 'rgRow', prop: 'name' },
    });
    await wrapper.find('.base-revo-grid__viewport').trigger('pointerup');
    await wrapper.find('.base-revo-grid__viewport').trigger('pointerup');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cellDoubleClick')).toBeUndefined();
    wrapper.unmount();
  });

  it('hides scrollbar indicators when the grid has no scrollable range', () => {
    expect(gridCss).toContain(
      ".base-revo-grid__scroll-indicator[aria-valuemax='0'] {\n  display: none;\n}",
    );
  });

  it('disables stretch by default', () => {
    const wrapper = mount(BaseRevoGrid, { props: { rows, columns } });
    expect(wrapper.props('stretch')).toBe(false);
    expect(wrapper.findComponent({ name: 'RevoGrid' }).props('stretch')).toBe(false);
    wrapper.unmount();
  });

  it.each([true, false, 'last'])(
    'forwards stretch %s before viewport measurement',
    async (stretch) => {
      const wrapper = mount(BaseRevoGrid, { props: { rows, columns, stretch } });
      const grid = wrapper.findComponent({ name: 'RevoGrid' });
      expect(grid.props('stretch')).toBe(stretch);
      expect(grid.props('columns')).toEqual(columns);
      await wrapper.setProps({ stretch: false });
      expect(grid.props('stretch')).toBe(false);
      expect(grid.props('columns')).toEqual(columns);
      wrapper.unmount();
    },
  );

  it('calculates the last column width on resize only when stretch is enabled', async () => {
    const wrapper = mount(BaseRevoGrid, { props: { rows, columns } });
    const grid = wrapper.findComponent({ name: 'RevoGrid' });
    ResizeObserverStub.resizeViewport(360.5);
    await wrapper.vm.$nextTick();
    expect(grid.props('columns')).toEqual(columns);
    await wrapper.setProps({ stretch: true });
    expect(grid.props('stretch')).toBe(true);
    expect(grid.props('columns')).toEqual([{ ...columns[0], size: 360.5 }]);
    ResizeObserverStub.resizeViewport(240);
    await wrapper.vm.$nextTick();
    expect(grid.props('columns')).toEqual([{ ...columns[0], size: 240 }]);
    ResizeObserverStub.resizeViewport(100);
    await wrapper.vm.$nextTick();
    expect(grid.props('columns')).toEqual(columns);
    await wrapper.setProps({ stretch: false });
    ResizeObserverStub.resizeViewport(500);
    await wrapper.vm.$nextTick();
    expect(grid.props('columns')).toEqual(columns);
    expect(columns[0]?.size).toBe(140);
    wrapper.unmount();
  });

  it('forwards an accessible label to the RevoGrid treegrid', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, accessibleLabel: 'LOT 위치' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).attributes('aria-label')).toBe('LOT 위치');
    wrapper.unmount();
  });

  it('forwards filter and resize options to RevoGrid', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, filter: false, resize: false },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).props()).toMatchObject({
      filter: false,
      resize: false,
    });
    wrapper.unmount();
  });

  it('keeps a row status class when the row is selected', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: {
        rows: [{ ...rows[0], rowClass: 'is-fail' }],
        columns,
        rowKey: 'id',
        selectedRowKey: 'row-1',
      },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).props('source')[0].rowClass).toBe(
      'is-fail base-revo-grid__row--selected',
    );
    wrapper.unmount();
  });

  it('moves the horizontal scroller with ArrowRight', async () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, rowKey: 'id' },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    const horizontal = (wrapper.element as HTMLElement).querySelector(
      'revogr-scroll-virtual.horizontal',
    ) as HTMLElement | null;
    expect(horizontal).not.toBeNull();
    if (!horizontal) return;

    let scrollLeft = 0;
    Object.defineProperties(horizontal, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 300 },
      scrollLeft: {
        configurable: true,
        get: () => scrollLeft,
        set: (value: number) => {
          scrollLeft = value;
        },
      },
    });

    await wrapper.find('[aria-orientation="horizontal"]').trigger('keydown', {
      key: 'ArrowRight',
    });

    expect(scrollLeft).toBe(40);
    wrapper.unmount();
  });
});
