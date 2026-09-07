import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseInput } from 'src/components/base';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseInput', () => {
  it('renders a native input with documented defaults', () => {
    const wrapper = mount(BaseInput, { props: { label: 'Name', placeholder: 'Placeholder' } });

    expect(wrapper.get('input').attributes('type')).toBe('text');
    expect(wrapper.classes()).toContain('ds-input--medium');
    expect(wrapper.get('label').text()).toBe('Name');
    expect(wrapper.get('input').attributes('placeholder')).toBe('Placeholder');
  });

  it('emits v-model updates from input events', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: '' } });

    await wrapper.get('input').setValue('Nam');

    expect(wrapper.emitted('update:modelValue')).toEqual([['Nam']]);
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('Nam');
  });

  it('clears the current value when clearable', async () => {
    const wrapper = mount(BaseInput, { props: { modelValue: 'Filled', clearable: true } });

    await wrapper.get('button[aria-label="Clear input"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('renders textarea mode with count metadata', () => {
    const wrapper = mount(BaseInput, {
      props: {
        mode: 'textarea',
        modelValue: 'Hello',
        hint: 'Helper Text',
        maxLength: 50,
        showCount: true,
      },
    });

    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.get('.ds-input__control').classes()).toContain('ds-input__textarea--resizable');
    expect(wrapper.find('button[aria-label="Resize textarea height"]').exists()).toBe(true);
    expect(wrapper.find('.ds-input__resizer svg').exists()).toBe(true);
    expect(wrapper.text()).toContain('Helper Text');
    expect(wrapper.text()).toContain('5/50');
  });

  it('can disable textarea resizing and hides the resize affordance', () => {
    const wrapper = mount(BaseInput, { props: { mode: 'textarea', resize: 'none' } });

    expect(wrapper.get('.ds-input__control').classes()).not.toContain(
      'ds-input__textarea--resizable',
    );
    expect(wrapper.find('button[aria-label="Resize textarea height"]').exists()).toBe(false);
  });

  it('resizes textarea height from the keyboard-accessible handle', async () => {
    const wrapper = mount(BaseInput, { props: { mode: 'textarea' } });
    const control = wrapper.get<HTMLElement>('.ds-input__control');
    const handle = wrapper.get('button[aria-label="Resize textarea height"]');

    control.element.getBoundingClientRect = () => ({ height: 120 }) as DOMRect;
    await handle.trigger('keydown', { key: 'ArrowDown' });

    expect(control.attributes('style')).toContain('height: 128px');
    expect(wrapper.emitted('resize')).toEqual([[128]]);
  });

  it('keeps a slotted tag and an empty input on the same flex line while space remains', async () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '' },
      slots: {
        content: '<span class="custom-tag">Tag name</span>',
      },
    });

    const input = wrapper.get('input');

    expect(input.attributes('style')).toContain('flex-basis: 1ch');
    expect(wrapper.find('.custom-tag').text()).toBe('Tag name');

    await wrapper.setProps({ modelValue: 'find' });

    expect(input.attributes('style')).toContain('flex-basis: 4ch');
  });

  it('locks value updates while disabled', async () => {
    const wrapper = mount(BaseInput, { props: { disabled: true, modelValue: 'Locked' } });

    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
    await wrapper.get('input').trigger('input');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
