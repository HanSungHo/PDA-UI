import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { BaseRevoGrid as ExportedBaseRevoGrid } from 'src/components/base/revo-grid';
import BaseRevoGrid from 'src/components/base/revo-grid/BaseRevoGrid.vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@revolist/vue3-datagrid', () => ({
  default: {
    name: 'RevoGrid',
    props: ['source', 'columns', 'stretch'],
    emits: ['beforecellfocus'],
    template: `
      <div data-testid="revo-grid-stub">
        <revogr-scroll-virtual class="vertical" />
        <revogr-scroll-virtual class="horizontal" />
      </div>
    `,
  },
}));

class ResizeObserverStub {
  observe(): void {}

  disconnect(): void {}
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

  it('hides scrollbar indicators when the grid has no scrollable range', () => {
    expect(gridCss).toContain(
      ".base-revo-grid__scroll-indicator[aria-valuemax='0'] {\n  display: none;\n}",
    );
  });

  it('passes the stretch strategy to RevoGrid when requested', () => {
    const wrapper = mount(BaseRevoGrid, {
      props: { rows, columns, stretch: true },
      global: {
        config: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'revogr-scroll-virtual',
          },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'RevoGrid' }).props('stretch')).toBe(true);
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
