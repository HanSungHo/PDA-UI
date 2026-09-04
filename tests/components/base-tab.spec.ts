import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw } from 'vue';

import type { BaseTabItem } from '../../src/components/base/tab/base-tab.types';
import BaseTab from '../../src/components/base/tab/BaseTab.vue';

const items: BaseTabItem[] = [
  { key: 'overview', label: 'Overview', content: 'Overview content' },
  { key: 'details', label: 'Details', content: 'Details content' },
  { key: 'locked', label: 'Locked', disabled: true },
];

function mountBaseTab(
  props: Record<string, unknown> = {},
  options: { slots?: Record<string, string> } = {},
) {
  return mount(BaseTab, {
    props: { items, modelValue: 'overview', ...props },
    ...options,
  });
}

describe('BaseTab', () => {
  it('renders dynamic labels and the selected panel', () => {
    const wrapper = mountBaseTab();

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'Overview',
      'Details',
      'Locked',
    ]);
    expect(wrapper.get('[role="tabpanel"]').text()).toBe('Overview content');
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Overview');
  });

  it('emits the public v-model and change events for a selected item', async () => {
    const wrapper = mountBaseTab();

    await wrapper.get('[role="tab"]:nth-child(2)').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([['details']]);
    expect(wrapper.emitted('change')).toEqual([['details']]);
  });

  it('does not hard-code the active item when the model value changes', () => {
    const wrapper = mountBaseTab({ modelValue: 'details' });

    expect(wrapper.get('[role="tabpanel"]').text()).toBe('Details content');
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Details');
  });

  it('blocks disabled items and readonly interaction', async () => {
    const wrapper = mountBaseTab({ readonly: true });

    await wrapper.get('[role="tab"]:nth-child(2)').trigger('click');
    await wrapper.get('[role="tab"]:nth-child(3)').trigger('click');

    expect(wrapper.emitted('change')).toBeUndefined();
    expect(wrapper.get('[role="tab"]:nth-child(3)').attributes('disabled')).toBeDefined();
  });

  it('supports a custom panel through the default slot', () => {
    const wrapper = mountBaseTab(
      { items: [{ key: 1, label: 'Custom' }] },
      {
        slots: { default: '<div class="custom-panel">Slot content</div>' },
      },
    );

    expect(wrapper.get('.custom-panel').text()).toBe('Slot content');
  });

  it('renders component content without requiring HTML strings', () => {
    const content = defineComponent({
      setup() {
        return () => h('strong', { class: 'component-panel' }, 'Component content');
      },
    });
    const wrapper = mountBaseTab({
      items: [{ key: 'component', label: 'Component', content: markRaw(content) }],
      modelValue: 'component',
    });

    expect(wrapper.get('.component-panel').text()).toBe('Component content');
  });
});
