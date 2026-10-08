import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import {
  BaseRadio as ExportedBaseRadio,
  BaseRadioGroup as ExportedBaseRadioGroup,
} from '../../src/components/base/radio';
import BaseRadio from '../../src/components/base/radio/BaseRadio.vue';
import BaseRadioGroup from '../../src/components/base/radio/BaseRadioGroup.vue';

const QRadioStub = defineComponent({
  name: 'QRadio',
  inheritAttrs: false,
  props: {
    modelValue: { type: [Boolean, String, Number], default: false },
    val: { type: [Boolean, String, Number], default: true },
    disable: Boolean,
    tabindex: { type: [String, Number], default: 0 },
    name: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    function select(event: MouseEvent | KeyboardEvent): void {
      if (event.defaultPrevented || props.disable || props.modelValue === props.val) return;
      emit('update:modelValue', props.val, event);
    }

    return () =>
      h(
        'div',
        {
          ...attrs,
          class: ['q-radio', 'radio-stub'],
          role: 'radio',
          tabindex: props.disable ? -1 : props.tabindex,
          'aria-checked': String(props.modelValue === props.val),
          'aria-disabled': props.disable || undefined,
          'data-value': String(props.val),
          onClick: select,
          onKeyup: (event: KeyboardEvent) => {
            if (event.key === ' ' || event.key === 'Enter') select(event);
          },
        },
        slots.default?.(),
      );
  },
});

function globalStubs() {
  return { QRadio: QRadioStub };
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
  it('exports the components through the base barrel', () => {
    expect(ExportedBaseRadio).toBe(BaseRadio);
    expect(ExportedBaseRadioGroup).toBe(BaseRadioGroup);
  });

  it('exposes only the framework-independent radio API', () => {
    const wrapper = radioFactory();
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
        'name',
        'readonly',
        'required',
        'status',
      ].sort(),
    );
    expect(Object.keys(wrapper.props())).not.toContain('checked');
    expect(Object.keys(wrapper.props())).not.toContain('prefixCls');
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
    const control = wrapper.get('[role="radio"]');
    expect(control.attributes('id')).toBe('choice');
    expect(control.attributes('aria-labelledby')).toBe('choice-label');
    expect(control.attributes('aria-required')).toBe('true');
  });

  it('maps Quasar model updates to the Base events', async () => {
    const wrapper = radioFactory();
    wrapper.getComponent(QRadioStub).vm.$emit('update:modelValue', true, new MouseEvent('click'));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(true);
    expect(wrapper.emitted('change')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
    expect(Object.keys(wrapper.emitted())).not.toContain('update:checked');
  });

  it('forwards focus and blur events through the Base API', async () => {
    const wrapper = radioFactory();
    await wrapper.get('[role="radio"]').trigger('focus');
    await wrapper.get('[role="radio"]').trigger('blur');
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('keeps readonly focusable while blocking pointer and keyboard changes', async () => {
    const wrapper = radioFactory({ readonly: true });
    const control = wrapper.get('[role="radio"]');
    expect(control.attributes('tabindex')).toBe('0');
    expect(control.attributes('aria-readonly')).toBe('true');
    await control.trigger('click');
    await control.trigger('keydown', { key: ' ' });
    await control.trigger('keyup', { key: ' ' });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it.each(['disabled', 'loading'] as const)('%s blocks radio activation', async (state) => {
    const wrapper = radioFactory({ [state]: true });
    await wrapper.get('[role="radio"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('renders hint and error messages with error precedence', () => {
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

  it('renders option values and disables only disabled options', () => {
    const wrapper = groupFactory({ options, modelValue: 'first' });
    const radios = wrapper.findAllComponents(QRadioStub);
    expect(radios).toHaveLength(3);
    expect(radios.map((radio) => radio.props('val'))).toEqual(['first', 'second', 'disabled']);
    expect(radios.map((radio) => radio.props('disable'))).toEqual([false, false, true]);
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-labelledby')).toBeUndefined();
  });

  it('marks the group unavailable when every option is disabled', () => {
    const wrapper = groupFactory({
      options: [
        { label: 'First', value: 'first', disabled: true },
        { label: 'Second', value: 'second', disabled: true },
      ],
    });

    expect(wrapper.get('[role="radiogroup"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.findAll('[role="radio"][aria-disabled="true"]')).toHaveLength(2);
  });

  it('emits scalar model and change values from a Quasar radio event', async () => {
    const wrapper = groupFactory({ options });
    wrapper
      .findAllComponents(QRadioStub)[1]
      .vm.$emit('update:modelValue', 'second', new MouseEvent('click'));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['second']]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe('second');
    expect(wrapper.emitted('change')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
    expect(Object.keys(wrapper.emitted())).not.toContain('update:value');
  });

  it('keeps readonly group enabled and blocks pointer, keyboard and value changes', async () => {
    const wrapper = groupFactory({ options, readonly: true });
    const boundary = wrapper.get('[role="radiogroup"]');
    await wrapper.findAll('[role="radio"]')[1].trigger('click');
    await boundary.trigger('keydown', { key: 'ArrowRight' });
    wrapper
      .findAllComponents(QRadioStub)[1]
      .vm.$emit('update:modelValue', 'second', new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(boundary.attributes('aria-readonly')).toBe('true');
  });

  it('emits focus and blur once when focus enters and leaves the group', async () => {
    const wrapper = groupFactory({ options });
    const boundary = wrapper.get('[role="radiogroup"]');
    await boundary.trigger('focusin', { relatedTarget: null });
    await boundary.trigger('focusout', { relatedTarget: null });
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('moves selection with arrow keys and skips disabled options', async () => {
    const wrapper = groupFactory({ options, modelValue: 'first' });
    const radios = wrapper.findAll('[role="radio"]');
    await radios[0].trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['second']]);
    expect(radios[0].attributes('tabindex')).toBe('-1');
    expect(radios[1].attributes('tabindex')).toBe('0');
  });

  it('handles arrow navigation when the event target is inside an option', async () => {
    const wrapper = groupFactory({ options, modelValue: 'first' });
    const firstOptionLabel = wrapper.findAll('.ds-radio-group__label')[0];

    await firstOptionLabel.trigger('keydown', { key: 'ArrowDown' });

    expect(wrapper.emitted('update:modelValue')).toEqual([['second']]);
  });

  it('wraps arrow navigation and skips disabled choices', async () => {
    const wrapper = groupFactory({
      options: [
        { label: 'First', value: 'first' },
        { label: 'Disabled', value: 'disabled', disabled: true },
        { label: 'Last', value: 'last' },
      ],
      modelValue: 'first',
    });
    const radios = wrapper.findAll('[role="radio"]');

    await radios[0].trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['last']]);
    expect(radios[2].attributes('tabindex')).toBe('0');

    await radios[2].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')).toEqual([['last'], ['first']]);
  });
});
