import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import { BaseTableCell as ExportedBaseTableCell } from '../../src/components/base/table-cell';
import BaseTableCell from '../../src/components/base/table-cell/BaseTableCell.vue';

describe('BaseTableCell', () => {
  it('exports the component through its design-system barrel', () => {
    expect(ExportedBaseTableCell).toBe(BaseTableCell);
  });

  it('renders primitive values, including zero, and leaves nullish values empty', () => {
    expect(
      mount(BaseTableCell, { props: { value: 0 } })
        .get('.ds-table-cell__content')
        .text(),
    ).toBe('0');
    expect(
      mount(BaseTableCell, { props: { value: null } })
        .get('.ds-table-cell__content')
        .text(),
    ).toBe('');
    expect(
      mount(BaseTableCell, { props: { value: undefined } })
        .get('.ds-table-cell__content')
        .text(),
    ).toBe('');
  });

  it('applies semantic variants, alignment, and truncation metadata', () => {
    const wrapper = mount(BaseTableCell, {
      props: { align: 'end', truncate: true, value: 'Long value' },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'ds-table-cell--body',
        'ds-table-cell--align-end',
        'ds-table-cell--truncate',
      ]),
    );
    expect(wrapper.get('.ds-table-cell__content').attributes('title')).toBe('Long value');
  });

  it('composes prefix and suffix slots without changing the content contract', () => {
    const wrapper = mount(BaseTableCell, {
      props: { value: 'Healthy' },
      slots: {
        prefix: h('span', { class: 'status-icon' }, 'ok'),
        suffix: h('button', { type: 'button' }, 'More'),
      },
    });

    expect(wrapper.get('.status-icon').text()).toBe('ok');
    expect(wrapper.get('button').text()).toBe('More');
    expect(wrapper.get('.ds-table-cell__content').text()).toBe('Healthy');
  });

  it('preserves prefix accessibility and forwards native attributes to the root', () => {
    const wrapper = mount(BaseTableCell, {
      attrs: { 'data-testid': 'cell', role: 'cell' },
      slots: { prefix: '<span aria-label="Meaningful status">!</span>' },
    });

    expect(wrapper.attributes('data-testid')).toBe('cell');
    expect(wrapper.attributes('role')).toBe('cell');
    expect(wrapper.get('.ds-table-cell__prefix').attributes('aria-hidden')).toBeUndefined();
    expect(wrapper.find('[aria-label="Meaningful status"]').exists()).toBe(true);
  });

  it('exposes the empty-state variant as a distinct visual state', () => {
    const wrapper = mount(BaseTableCell, {
      props: { variant: 'empty-state' },
      slots: { default: '<strong>404</strong><span>No results.</span>' },
    });

    expect(wrapper.classes()).toContain('ds-table-cell--empty-state');
    expect(wrapper.text()).toContain('No results.');
  });

  it('lets an explicit default slot provide rich accessible content', () => {
    const wrapper = mount(BaseTableCell, {
      props: { value: 'ignored fallback' },
      slots: { default: '<a href="/details">Open resource</a>' },
    });

    expect(wrapper.get('a').attributes('href')).toBe('/details');
    expect(wrapper.get('.ds-table-cell__content').text()).toBe('Open resource');
  });
});
