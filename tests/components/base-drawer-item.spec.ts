import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { BaseDrawerItemProps } from 'src/components/base';
import { BaseDrawerItem } from 'src/components/base';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseDrawerItem', () => {
  it('renders the documented default state with a native button', () => {
    const wrapper = mount(BaseDrawerItem, {
      props: { label: 'Dashboard', value: 'dashboard' },
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.attributes('disabled')).toBeUndefined();
    expect(wrapper.attributes('aria-current')).toBeUndefined();
    expect(wrapper.classes()).not.toContain('ds-drawer-item--selected');
    expect(wrapper.classes()).not.toContain('ds-drawer-item--disabled');
    expect(wrapper.text()).toBe('Dashboard');
  });

  it('lets the default slot override the label while preserving the public contract', () => {
    const wrapper = mount(BaseDrawerItem, {
      props: { label: 'Fallback', value: 1 },
      slots: { default: 'Custom label' },
    });

    expect(wrapper.get('.ds-drawer-item__label').text()).toBe('Custom label');
    expect(Object.keys(wrapper.props()).sort()).toEqual(
      ['disabled', 'label', 'selected', 'value'].sort(),
    );
  });

  it('marks the current item and renders a decorative check icon when selected', () => {
    const wrapper = mount(BaseDrawerItem, {
      props: { label: 'Dashboard', selected: true, value: 'dashboard' },
    });

    expect(wrapper.classes()).toContain('ds-drawer-item--selected');
    expect(wrapper.attributes('aria-current')).toBe('page');
    expect(wrapper.find('.ds-drawer-item__check').exists()).toBe(true);
    expect(wrapper.get('.ds-drawer-item__check').attributes('aria-hidden')).toBe('true');
  });

  it('emits the value and native event when selected', async () => {
    const value = 42;
    const wrapper = mount(BaseDrawerItem, {
      props: { label: 'Dashboard', value },
    });

    await wrapper.trigger('click');

    expect(wrapper.emitted('select')).toHaveLength(1);
    expect(wrapper.emitted('select')?.[0]?.[0]).toBe(value);
    expect(wrapper.emitted('select')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
  });

  it('allows consumers to type values beyond primitive identifiers', () => {
    const props: BaseDrawerItemProps<{ id: string }> = {
      label: 'Dashboard',
      value: { id: 'dashboard' },
    };

    expect(props.value.id).toBe('dashboard');
  });

  it('uses native disabled semantics and blocks selection', async () => {
    const wrapper = mount(BaseDrawerItem, {
      props: { disabled: true, label: 'Dashboard', value: 'dashboard' },
    });

    expect(wrapper.attributes('disabled')).toBeDefined();
    expect(wrapper.classes()).toContain('ds-drawer-item--disabled');

    await wrapper.trigger('click');

    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('remains keyboard-focusable when enabled', () => {
    const wrapper = mount(BaseDrawerItem, {
      attachTo: document.body,
      props: { label: 'Dashboard', value: 'dashboard' },
    });

    (wrapper.element as HTMLButtonElement).focus();

    expect(document.activeElement).toBe(wrapper.element);
  });
});
