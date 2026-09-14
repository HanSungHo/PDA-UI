import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import {
  BaseRadio as ExportedBaseRadio,
  BaseRadioGroup as ExportedBaseRadioGroup,
} from '../../src/components/base/radio';
import BaseRadio from '../../src/components/base/radio/BaseRadio.vue';
import BaseRadioGroup from '../../src/components/base/radio/BaseRadioGroup.vue';

const ARadioStub = defineComponent({
  name: 'ARadio',
  inheritAttrs: false,
  props: {
    checked: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    autofocus: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    value: { type: [String, Number], default: undefined },
  },
  emits: ['update:checked', 'change', 'focus', 'blur'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h('label', { ...attrs, class: 'radio-stub' }, [
        h('input', {
          type: 'radio',
          checked: props.checked,
          disabled: props.disabled,
          autofocus: props.autofocus,
          name: props.name,
          value: props.value,
          onChange: (event: Event) => {
            emit('update:checked', true);
            emit('change', {
              target: { checked: true, value: props.value },
              nativeEvent: event,
            });
          },
          onFocus: (event: FocusEvent) => emit('focus', event),
          onBlur: (event: FocusEvent) => emit('blur', event),
        }),
        slots.default?.(),
      ]);
  },
});

const ARadioGroupStub = defineComponent({
  name: 'ARadioGroup',
  inheritAttrs: false,
  props: {
    value: { type: [String, Number], default: undefined },
    disabled: { type: Boolean, default: false },
    name: { type: String, default: undefined },
  },
  emits: ['update:value', 'change'],
  setup(props, { attrs, slots }) {
    return () =>
      h(
        'div',
        { ...attrs, class: 'radio-group-stub', 'data-value': props.value },
        slots.default?.(),
      );
  },
});

function globalStubs() {
  return { ARadio: ARadioStub, ARadioGroup: ARadioGroupStub };
}

function radioFactory(props: Record<string, unknown> = {}) {
  return mount(BaseRadio, {
    props,
    global: { stubs: globalStubs() },
  });
}

function groupFactory(props: Record<string, unknown> = {}) {
  return mount(BaseRadioGroup, {
    props,
    global: { stubs: globalStubs() },
  });
}

describe('BaseRadio', () => {
  it('exports the component through the base barrel', () => {
    expect(ExportedBaseRadio).toBe(BaseRadio);
    expect(ExportedBaseRadioGroup).toBe(BaseRadioGroup);
  });

  it('exposes only the framework-independent radio API', () => {
    expect(Object.keys(radioFactory().props()).sort()).toEqual(
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
        'name',
        'readonly',
        'required',
        'status',
      ].sort(),
    );
    expect(Object.keys(radioFactory().props())).not.toContain('checked');
    expect(Object.keys(radioFactory().props())).not.toContain('prefixCls');
  });

  it('applies documented defaults', () => {
    const wrapper = radioFactory();
    expect(wrapper.props('modelValue')).toBe(false);
    expect(wrapper.props('autofocus')).toBe(false);
    expect(wrapper.props('disabled')).toBe(false);
    expect(wrapper.props('readonly')).toBe(false);
    expect(wrapper.props('loading')).toBe(false);
    expect(wrapper.props('required')).toBe(false);
    expect(wrapper.props('status')).toBe('default');
  });

  it('renders label, required marker and accessibility wiring', () => {
    const wrapper = radioFactory({ id: 'choice', label: 'Choice', required: true });
    expect(wrapper.text()).toContain('Choice');
    expect(wrapper.get('.ds-radio__required').text()).toBe('*');
    const control = wrapper.get('.radio-stub');
    expect(control.attributes('aria-labelledby')).toBe('choice-label');
    expect(control.attributes('aria-required')).toBe('true');
  });

  it('emits Base events and never leaks Ant event names', async () => {
    const wrapper = radioFactory();
    const control = wrapper.getComponent(ARadioStub);
    control.vm.$emit('update:checked', true);
    control.vm.$emit('change', { target: { checked: true }, nativeEvent: new Event('change') });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
    expect(Object.keys(wrapper.emitted())).not.toContain('update:checked');
  });

  it('forwards focus and blur events through the Base API', async () => {
    const wrapper = radioFactory();
    const control = wrapper.getComponent(ARadioStub);
    control.vm.$emit('focus', new FocusEvent('focus'));
    control.vm.$emit('blur', new FocusEvent('blur'));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('keeps readonly focusable while blocking pointer, keyboard and value events', async () => {
    const wrapper = radioFactory({ readonly: true });
    const row = wrapper.get('.ds-radio__row');
    await row.trigger('click');
    await row.trigger('keydown', { key: ' ' });
    wrapper.getComponent(ARadioStub).vm.$emit('update:checked', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.radio-stub').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('.radio-stub').attributes('aria-readonly')).toBe('true');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('allows the wrapper interaction handlers to pass through when editable', async () => {
    const wrapper = radioFactory();
    await wrapper.get('.ds-radio__row').trigger('click');
    await wrapper.get('.ds-radio__row').trigger('keydown', { key: 'Enter' });
    expect(wrapper.get('.radio-stub').attributes('disabled')).toBeUndefined();
  });

  it('renders hint/error message with error precedence', () => {
    const wrapper = radioFactory({ hint: 'Hint', errorMessage: 'Error', status: 'success' });
    expect(wrapper.text()).toContain('Error');
    expect(wrapper.text()).not.toContain('Hint');
    expect(wrapper.classes()).toContain('ds-field--error');
  });
});

describe('BaseRadioGroup', () => {
  const options = [
    { label: 'First', value: 'first' },
    { label: 'Second', value: 'second' },
    { label: 'Disabled', value: 'disabled', disabled: true },
  ];

  it('exposes only the framework-independent group API and defaults', () => {
    const wrapper = groupFactory({ options });
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
        'layout',
        'loading',
        'modelValue',
        'name',
        'options',
        'readonly',
        'required',
        'status',
      ].sort(),
    );
    expect(wrapper.props('layout')).toBe('vertical');
    expect(wrapper.props('readonly')).toBe(false);
    expect(wrapper.props('options')).toEqual(options);
    expect(Object.keys(wrapper.props())).not.toContain('optionType');
    expect(Object.keys(wrapper.props())).not.toContain('buttonStyle');
  });

  it('renders options and maps disabled options without disabling the group', () => {
    const wrapper = groupFactory({ options, modelValue: 'first' });
    expect(wrapper.findAll('.radio-stub')).toHaveLength(3);
    expect(wrapper.findAll('input:disabled')).toHaveLength(1);
    expect(wrapper.get('.radio-group-stub').attributes('aria-labelledby')).toBeUndefined();
  });

  it('marks the group unavailable when every option is disabled', () => {
    const wrapper = groupFactory({
      options: [
        { label: 'First', value: 'first', disabled: true },
        { label: 'Second', value: 'second', disabled: true },
      ],
    });

    expect(wrapper.get('.ds-radio-group__boundary').attributes('aria-disabled')).toBe('true');
    expect(wrapper.findAll('input:disabled')).toHaveLength(2);
  });

  it('emits scalar model and change values from Ant group events', async () => {
    const wrapper = groupFactory({ options });
    const group = wrapper.getComponent(ARadioGroupStub);
    group.vm.$emit('update:value', 'second');
    group.vm.$emit('change', {
      target: { value: 'second' },
      nativeEvent: new Event('change'),
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['second']]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe('second');
    expect(Object.keys(wrapper.emitted())).not.toContain('update:value');
  });

  it('keeps readonly group enabled and blocks pointer, keyboard and value changes', async () => {
    const wrapper = groupFactory({ options, readonly: true });
    const boundary = wrapper.get('.ds-radio-group__boundary');
    await boundary.trigger('click');
    await boundary.trigger('keydown', { key: 'ArrowRight' });
    wrapper.getComponent(ARadioGroupStub).vm.$emit('update:value', 'second');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('input:disabled')).toHaveLength(1);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.get('.ds-radio-group__boundary').attributes('aria-readonly')).toBe('true');
  });

  it('emits focus and blur once when focus enters and leaves the group', async () => {
    const wrapper = groupFactory({ options });
    const boundary = wrapper.get('.ds-radio-group__boundary');
    await boundary.trigger('focusin', { relatedTarget: null });
    await boundary.trigger('focusout', { relatedTarget: null });
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('keeps editable group keyboard and pointer interactions available', async () => {
    const wrapper = groupFactory({ options });
    await wrapper.get('.ds-radio-group__boundary').trigger('click');
    await wrapper.get('.ds-radio-group__boundary').trigger('keydown', { key: 'Tab' });
    expect(wrapper.get('.ds-radio-group__boundary').attributes('aria-readonly')).toBeUndefined();
  });
});
