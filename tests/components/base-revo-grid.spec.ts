import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { BaseRevoGrid as ExportedBaseRevoGrid } from 'src/components/base/revo-grid';
import BaseRevoGrid from 'src/components/base/revo-grid/BaseRevoGrid.vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@revolist/vue3-datagrid', () => ({
  default: {
    name: 'RevoGrid',
    props: ['source', 'columns', 'stretch', 'resize', 'filter'],
    emits: ['beforecellfocus'],
    template: `
      <div data-testid="revo-grid-stub">
        <div class="rgCell" data-rgrow="0" aria-colindex="1" />
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
      {
        ...rows[0],
        rowClass: 'base-revo-grid__row--alternate base-revo-grid__row--selected',
      },
    ]);

    wrapper.findComponent({ name: 'RevoGrid' }).vm.$emit('beforecellfocus', {
      detail: { model: rows[0], type: 'rgRow', prop: 'name' },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('rowSelect')).toEqual([['row-1', rows[0]]]);
    wrapper.unmount();
  });

  it('emits the focused cell when a data cell is double-tapped', async () => {
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
    const pointer = { pointerId: 1, clientX: 10, clientY: 10 };
    await wrapper.find('.rgCell').trigger('pointerdown', pointer);
    await wrapper.find('.rgCell').trigger('pointerup', pointer);
    await wrapper.find('.rgCell').trigger('pointerdown', pointer);
    await wrapper.find('.rgCell').trigger('pointerup', pointer);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cellDoubleClick')).toEqual([
      [{ rowKey: 'row-1', row: expect.objectContaining({ name: 'Inspection' }), prop: 'name' }],
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
      'is-fail base-revo-grid__row--alternate base-revo-grid__row--selected',
    );
    wrapper.unmount();
  });

  it('marks even data indexes including 10 without mutating source rows', () => {
    const source = Array.from({ length: 12 }, (_, index) => ({ id: index, rowClass: 'is-run' }));
    const wrapper = mount(BaseRevoGrid, { props: { rows: source, columns } });
    const renderedRows = wrapper.findComponent({ name: 'RevoGrid' }).props('source');

    for (const index of [0, 2, 4, 6, 8, 10]) {
      expect(renderedRows[index].rowClass).toBe('is-run base-revo-grid__row--alternate');
    }
    for (const index of [1, 3, 5, 7, 9, 11]) {
      expect(renderedRows[index].rowClass).toBe('is-run');
    }
    expect(source.every((row) => row.rowClass === 'is-run')).toBe(true);
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
  it('turns the column filter off unless a screen asks for it', () => {
    const wrapper = mount(BaseRevoGrid, { props: { rows, columns } });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).props('filter')).toBe(false);
    wrapper.unmount();
  });

  it('shows the Figma EMPTY state instead of the grid when there are no rows', async () => {
    const wrapper = mount(BaseRevoGrid, { props: { rows: [], columns } });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).exists()).toBe(false);
    expect(wrapper.find('[role="scrollbar"]').exists()).toBe(false);
    const empty = wrapper.findComponent({ name: 'BaseEmptyState' });
    expect(empty.props()).toMatchObject({ title: 'EMPTY', iconVariant: 'filled' });
    expect(empty.text()).toContain('해당 결과가 없습니다');

    await wrapper.setProps({ rows });
    expect(wrapper.findComponent({ name: 'RevoGrid' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'BaseEmptyState' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('lets a screen replace the EMPTY state through the empty slot', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows: [], columns },
      slots: { empty: '<p class="custom-empty">No LOT</p>' },
    });

    expect(wrapper.get('.custom-empty').text()).toBe('No LOT');
    expect(wrapper.findComponent({ name: 'BaseEmptyState' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('aligns a column through a class on its header and data cells', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: {
        rows,
        columns: [
          { prop: 'name', name: '공정명', align: 'center' as const },
          {
            prop: 'id',
            name: 'ID',
            align: 'right' as const,
            cellProperties: () => ({ class: { 'is-key': true } }),
          },
          { prop: 'note', name: '비고' },
        ],
      },
    });
    const [center, right, plain] = wrapper
      .findComponent({ name: 'RevoGrid' })
      .props('columns') as Array<Record<string, unknown>>;
    const call = (column: Record<string, unknown> | undefined, key: string) =>
      (column?.[key] as ((props: unknown) => { class?: unknown }) | undefined)?.({});

    expect(center).not.toHaveProperty('align');
    expect(call(center, 'cellProperties')?.class).toBe('base-revo-grid__cell--center');
    expect(call(center, 'columnProperties')?.class).toBe('base-revo-grid__cell--center');
    expect(call(right, 'cellProperties')?.class).toEqual({
      'is-key': true,
      'base-revo-grid__cell--right': true,
    });
    expect(plain).not.toHaveProperty('cellProperties');
    wrapper.unmount();
  });

  it('uses the Figma table tokens: 4px corners, brand border, gray-100 dividers, left headers', () => {
    expect(gridCss).toContain('--base-revo-grid-radius: var(--radius-4);');
    expect(gridCss).toContain('--base-revo-grid-border-color: var(--border-border-brand);');
    expect(gridCss).toContain('--revo-grid-header-border: var(--border-border-secondary);');
    // Left by default through RevoGrid's own variable, so a screen that sets it still wins.
    expect(gridCss).toContain('--revo-grid-header-text-align: left;');
    expect(gridCss).not.toMatch(/rgHeaderCell[^}]*text-align/);
    expect(gridCss).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
