import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';

import BaseFilter from '../../src/components/base/filter/BaseFilter.vue';

const filters = [
  { id: 'status', key: 'Status', value: 'DEPLOYED' },
  { id: 'version', key: 'Version', value: 'All' },
];

function mountFilter(props: Record<string, unknown> = {}) {
  return mount(BaseFilter, { props: { modelValue: filters, ...props } });
}

describe('BaseFilter', () => {
  it('locks the framework-independent public contract and defaults', () => {
    const wrapper = mountFilter();
    expect(Object.keys(wrapper.props()).sort()).toEqual(
      [
        'addLabel',
        'addable',
        'ariaLabel',
        'clearLabel',
        'clearable',
        'disabled',
        'loading',
        'modelValue',
        'readonly',
        'size',
      ].sort(),
    );
    expect(wrapper.props()).toMatchObject({
      addLabel: 'Add filter',
      addable: true,
      clearLabel: 'Clear all',
      clearable: true,
      disabled: false,
      loading: false,
      readonly: false,
      size: 'small',
    });
  });

  it('renders filter keys and values as a semantic list', () => {
    const wrapper = mountFilter();
    expect(wrapper.get('[role="list"]').attributes('aria-label')).toBe('Active filters');
    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('DEPLOYED');
  });

  it('removes an item and emits the next model through base events', async () => {
    const wrapper = mountFilter();
    await wrapper.get('[aria-label="Remove Status: DEPLOYED filter"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[filters.slice(1)]]);
    expect(wrapper.emitted('change')).toEqual([[filters.slice(1)]]);
    expect(wrapper.emitted('remove')).toEqual([[filters[0]]]);
  });

  it('removes by stable item id when the list order changes', async () => {
    const reordered = [filters[1], filters[0]];
    const wrapper = mountFilter({ modelValue: reordered });
    await wrapper.get('[aria-label="Remove Status: DEPLOYED filter"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[[filters[1]]]]);
    expect(wrapper.emitted('remove')).toEqual([[filters[0]]]);
  });

  it('moves focus to the next removable chip after removal', async () => {
    const Harness = defineComponent({
      components: { BaseFilter },
      setup() {
        const value = ref([...filters, { id: 'tags', key: 'Tags', value: 'All' }]);
        return { value };
      },
      template: '<BaseFilter v-model="value" />',
    });
    const wrapper = mount(Harness, { attachTo: document.body });

    await wrapper.get('[aria-label="Remove Status: DEPLOYED filter"]').trigger('click');

    expect(wrapper.find('[aria-label="Remove Status: DEPLOYED filter"]').exists()).toBe(false);
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="Remove Version: All filter"]').element,
    );
    wrapper.unmount();
  });

  it('clears all filters and emits clear', async () => {
    const wrapper = mountFilter();
    await wrapper.get('[data-testid="clear-filters"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[[]]]);
    expect(wrapper.emitted('change')).toEqual([[[]]]);
    expect(wrapper.emitted('clear')).toEqual([[]]);
  });

  it('emits add without leaking BaseButton click payload', async () => {
    const wrapper = mountFilter();
    await wrapper.get('[data-testid="add-filter"]').trigger('click');
    expect(wrapper.emitted('add')).toEqual([[]]);
  });

  it.each(['disabled', 'readonly', 'loading'] as const)('%s blocks mutations', async (state) => {
    const wrapper = mountFilter({ [state]: true });
    expect(wrapper.classes()).toContain(`ds-filter--${state}`);
    expect(wrapper.find('[aria-label="Remove Status: DEPLOYED filter"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="clear-filters"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="add-filter"]').attributes('disabled')).toBeDefined();
  });

  it('exposes disabled and loading accessibility states without reporting readonly as disabled', () => {
    expect(mountFilter({ disabled: true }).attributes('aria-disabled')).toBe('true');
    expect(mountFilter({ loading: true }).attributes('aria-busy')).toBe('true');
    expect(mountFilter({ readonly: true }).attributes('aria-disabled')).toBeUndefined();
  });

  it('respects item disabled state while other chips stay removable', () => {
    const wrapper = mountFilter({ modelValue: [{ ...filters[0], disabled: true }, filters[1]] });
    expect(wrapper.find('[aria-label="Remove Status: DEPLOYED filter"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Remove Version: All filter"]').exists()).toBe(true);
  });

  it('hides actions when disabled by component configuration or when empty', () => {
    const configured = mountFilter({ addable: false, clearable: false });
    expect(configured.find('[data-testid="add-filter"]').exists()).toBe(false);
    expect(configured.find('[data-testid="clear-filters"]').exists()).toBe(false);
    expect(mountFilter({ modelValue: [] }).find('[data-testid="clear-filters"]').exists()).toBe(
      false,
    );
  });

  it.each(['small', 'medium', 'large'] as const)('exposes the %s size hook', (size) => {
    expect(mountFilter({ size }).classes()).toContain(`ds-filter--${size}`);
  });
});
