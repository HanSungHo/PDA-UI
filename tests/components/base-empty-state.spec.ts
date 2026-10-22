import { mount } from '@vue/test-utils';
import { QIcon } from 'quasar';
import { BaseEmptyState } from 'src/components/base/empty-state';
import { describe, expect, it } from 'vitest';

describe('BaseEmptyState', () => {
  it('keeps the outlined icon as the default', () => {
    const wrapper = mount(BaseEmptyState);

    expect(wrapper.getComponent(QIcon).props('name')).toBe('sym_o_info');
    expect(wrapper.getComponent(QIcon).classes()).not.toContain(
      'ds-empty-state__icon-glyph--filled',
    );

    wrapper.unmount();
  });

  it('supports the filled icon variant without replacing the base icon', () => {
    const wrapper = mount(BaseEmptyState, { props: { iconVariant: 'filled' } });

    expect(wrapper.getComponent(QIcon).props('name')).toBe('sym_o_info');
    expect(wrapper.getComponent(QIcon).classes()).toContain('ds-empty-state__icon-glyph--filled');

    wrapper.unmount();
  });

  it('preserves the existing optional icon slot', () => {
    const wrapper = mount(BaseEmptyState, {
      slots: { icon: '<span data-test="custom-icon">Custom icon</span>' },
    });

    expect(wrapper.get('[data-test="custom-icon"]').text()).toBe('Custom icon');
    expect(wrapper.findComponent(QIcon).exists()).toBe(false);

    wrapper.unmount();
  });
});
