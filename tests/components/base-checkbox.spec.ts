import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import BaseCheckbox from '../../src/components/base/checkbox/BaseCheckbox.vue';

const QCheckboxStub = defineComponent({
  name: 'QCheckbox',
  inheritAttrs: false,
  props: {
    autofocus: Boolean,
    disable: Boolean,
    modelValue: { type: [Boolean, null], default: false },
  },
  emits: ['update:modelValue', 'focus', 'blur'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          class: 'q-checkbox',
          role: 'checkbox',
          tabindex: props.disable ? -1 : 0,
          'aria-checked': props.modelValue === null ? 'mixed' : String(props.modelValue),
          'aria-disabled': props.disable || undefined,
          onClick: (event: MouseEvent) => {
            if (event.defaultPrevented || props.disable) return;
            emit('update:modelValue', props.modelValue === true ? false : true, event);
          },
          onFocus: (event: FocusEvent) => emit('focus', event),
          onBlur: (event: FocusEvent) => emit('blur', event),
        },
        slots.default?.(),
      );
  },
});

function mountCheckbox(props: Record<string, unknown> = {}) {
  return mount(BaseCheckbox, {
    props,
    global: {
      stubs: { QCheckbox: QCheckboxStub },
    },
  });
}

describe('BaseCheckbox', () => {
  it('preserves the public contract and adds an optional indeterminate state', () => {
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
        'indeterminate',
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
      indeterminate: false,
      loading: false,
      modelValue: false,
      readonly: false,
      required: false,
      status: 'default',
    });
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
    const control = wrapper.get('[role="checkbox"]');

    expect(control.attributes('aria-checked')).toBe('true');
    expect(control.attributes('id')).toBe('terms');
    expect(control.attributes('aria-labelledby')).toBe('terms-label');
    expect(control.attributes('aria-required')).toBe('true');
    expect(wrapper.get('.ds-checkbox__label').text()).toContain('Accept terms');
    expect(wrapper.get('.ds-checkbox__required').text()).toBe('*');
  });

  it('uses aria-label when no visible label is provided', () => {
    expect(
      mountCheckbox({ ariaLabel: 'Select row' }).get('[role="checkbox"]').attributes('aria-label'),
    ).toBe('Select row');
  });

  it('maps Quasar model updates to the Base events', async () => {
    const wrapper = mountCheckbox();
    await wrapper.get('[role="checkbox"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('change')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
    expect(Object.keys(wrapper.emitted())).not.toContain('update:checked');
  });

  it('preserves the original browser event in the change payload', () => {
    const wrapper = mountCheckbox();
    const nativeEvent = new KeyboardEvent('keyup', { key: ' ' });

    wrapper.getComponent(QCheckboxStub).vm.$emit('update:modelValue', true, nativeEvent);

    expect(wrapper.emitted('change')?.[0]).toEqual([true, nativeEvent]);
    expect(wrapper.emitted('change')?.[0]?.[1]).toBe(nativeEvent);
  });

  it('activates the checkbox when its visible label is clicked', async () => {
    const wrapper = mountCheckbox({ label: 'Select record' });
    await wrapper.get('.ds-checkbox__label').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
  });

  it('renders indeterminate accessibly and maps activation to checked', async () => {
    const wrapper = mountCheckbox({ indeterminate: true });
    const control = wrapper.getComponent(QCheckboxStub);

    expect(control.props('modelValue')).toBe(null);
    expect(wrapper.get('[role="checkbox"]').attributes('aria-checked')).toBe('mixed');

    control.vm.$emit('update:modelValue', true, new MouseEvent('click'));
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
  });

  it('emits focus and blur events', async () => {
    const wrapper = mountCheckbox();
    await wrapper.get('[role="checkbox"]').trigger('focus');
    await wrapper.get('[role="checkbox"]').trigger('blur');

    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it.each(['disabled', 'loading'] as const)('%s disables and blocks interaction', async (state) => {
    const wrapper = mountCheckbox({ [state]: true });
    const control = wrapper.get('[role="checkbox"]');

    expect(control.attributes('aria-disabled')).toBe('true');
    expect(control.attributes('tabindex')).toBe('-1');
    await control.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('keeps readonly focusable while blocking pointer and keyboard changes', async () => {
    const wrapper = mountCheckbox({ modelValue: true, readonly: true });
    const control = wrapper.get('[role="checkbox"]');

    expect(control.attributes('tabindex')).toBe('0');
    expect(control.attributes('aria-readonly')).toBe('true');
    await control.trigger('focus');
    await control.trigger('keydown', { key: ' ' });
    await control.trigger('keyup', { key: ' ' });
    await control.trigger('click');

    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('renders hint metadata and gives error state/message precedence', () => {
    const hint = mountCheckbox({ id: 'hinted', hint: 'Optional choice' });
    expect(hint.get('.ds-field__message').text()).toBe('Optional choice');
    expect(hint.get('[role="checkbox"]').attributes('aria-describedby')).toBe('hinted-message');

    const error = mountCheckbox({
      hint: 'Hint',
      status: 'success',
      errorMessage: 'Required choice',
    });
    expect(error.classes()).toContain('ds-field--error');
    expect(error.text()).toContain('Required choice');
    expect(error.text()).not.toContain('Hint');
    expect(error.get('[role="checkbox"]').attributes('aria-invalid')).toBe('true');
  });

  it('supports block layout without exposing a framework layout prop', () => {
    expect(mountCheckbox({ block: true }).classes()).toContain('ds-field--block');
  });
});
