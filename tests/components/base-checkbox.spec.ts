import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import BaseCheckbox from '../../src/components/base/checkbox/BaseCheckbox.vue';

const CheckboxStub = defineComponent({
  name: 'ACheckbox',
  inheritAttrs: false,
  props: {
    autofocus: Boolean,
    checked: Boolean,
    disabled: Boolean,
  },
  emits: ['update:checked', 'change', 'click', 'focus', 'blur'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h('label', { class: 'checkbox-stub-root' }, [
        h('input', {
          ...attrs,
          type: 'checkbox',
          checked: props.checked,
          disabled: props.disabled,
          autofocus: props.autofocus,
          onClick: (event: MouseEvent) => {
            emit('click', event);
            if (event.defaultPrevented || props.disabled) return;
            const nextValue = !props.checked;
            emit('update:checked', nextValue);
            emit('change', { target: { checked: nextValue }, nativeEvent: event });
          },
          onFocus: (event: FocusEvent) => emit('focus', event),
          onBlur: (event: FocusEvent) => emit('blur', event),
        }),
        slots.default?.(),
      ]);
  },
});

function mountCheckbox(props: Record<string, unknown> = {}) {
  return mount(BaseCheckbox, {
    props,
    global: {
      stubs: { ACheckbox: CheckboxStub },
    },
  });
}

describe('BaseCheckbox', () => {
  it('locks the framework-independent public prop contract and defaults', () => {
    const wrapper = mountCheckbox();

    expect(Object.keys(wrapper.props()).sort()).toEqual(
      [
        'ariaLabel',
        'autofocus',
        'block',
        'disabled',
        'error',
        'errorMessage',
        'hint',
        'id',
        'label',
        'loading',
        'modelValue',
        'readonly',
        'required',
        'status',
      ].sort(),
    );
    expect(wrapper.props()).toMatchObject({
      ariaLabel: 'Checkbox',
      autofocus: false,
      block: false,
      disabled: false,
      error: false,
      loading: false,
      modelValue: false,
      readonly: false,
      required: false,
      status: 'default',
    });
    expect(wrapper.props()).not.toHaveProperty('indeterminate');
    expect(wrapper.props()).not.toHaveProperty('skipGroup');
    expect(wrapper.props()).not.toHaveProperty('value');
  });

  it('renders checked state and an associated required label', () => {
    const wrapper = mountCheckbox({
      id: 'terms',
      label: 'Accept terms',
      modelValue: true,
      required: true,
    });
    const input = wrapper.get<HTMLInputElement>('input');

    expect(input.element.checked).toBe(true);
    expect(input.attributes('id')).toBe('terms');
    expect(input.attributes('aria-labelledby')).toBe('terms-label');
    expect(input.attributes('aria-required')).toBe('true');
    expect(wrapper.get('.ds-checkbox__label').text()).toContain('Accept terms');
    expect(wrapper.get('.ds-checkbox__required').text()).toBe('*');
  });

  it('uses aria-label when no visible label is provided', () => {
    expect(mountCheckbox({ ariaLabel: 'Select row' }).get('input').attributes('aria-label')).toBe(
      'Select row',
    );
  });

  it('emits model and change through the Base Component API', async () => {
    const wrapper = mountCheckbox();
    await wrapper.get('input').trigger('keydown', { key: ' ' });
    await wrapper.get('input').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('change')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
  });

  it('emits focus and blur events', async () => {
    const wrapper = mountCheckbox();
    await wrapper.get('input').trigger('focus');
    await wrapper.get('input').trigger('blur');

    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it.each(['disabled', 'loading'] as const)('%s disables and blocks interaction', async (state) => {
    const wrapper = mountCheckbox({ [state]: true });
    const input = wrapper.get<HTMLInputElement>('input');

    expect(input.element.disabled).toBe(true);
    await input.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('keeps readonly focusable and visually enabled while blocking changes', async () => {
    const wrapper = mountCheckbox({ modelValue: true, readonly: true });
    const input = wrapper.get<HTMLInputElement>('input');

    expect(input.element.disabled).toBe(false);
    expect(input.attributes('aria-readonly')).toBe('true');
    await input.trigger('focus');
    await input.trigger('keydown', { key: ' ' });
    await input.trigger('click');

    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('renders hint metadata and gives error state/message precedence', () => {
    const hint = mountCheckbox({ id: 'hinted', hint: 'Optional choice' });
    expect(hint.get('.ds-field__message').text()).toBe('Optional choice');
    expect(hint.get('input').attributes('aria-describedby')).toBe('hinted-message');

    const error = mountCheckbox({
      hint: 'Hint',
      status: 'success',
      errorMessage: 'Required choice',
    });
    expect(error.classes()).toContain('ds-field--error');
    expect(error.text()).toContain('Required choice');
    expect(error.text()).not.toContain('Hint');
    expect(error.get('input').attributes('aria-invalid')).toBe('true');
  });

  it('supports block layout without exposing an Ant layout prop', () => {
    expect(mountCheckbox({ block: true }).classes()).toContain('ds-field--block');
  });
});
