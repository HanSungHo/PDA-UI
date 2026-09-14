/* eslint-disable vue/one-component-per-file */
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import BaseRangeSlider from '../../src/components/base/range-slider/BaseRangeSlider.vue';

const BaseSliderStub = defineComponent({
  name: 'BaseSlider',
  inheritAttrs: false,
  props: {
    modelValue: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, required: true },
    disabled: { type: Boolean, required: true },
    readonly: { type: Boolean, required: true },
    loading: { type: Boolean, required: true },
    size: { type: String, required: true },
    block: { type: Boolean, required: true },
  },
  emits: ['update:modelValue', 'change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        class: 'range-control-stub',
        type: 'range',
        value: props.modelValue,
        min: props.min,
        max: props.max,
        step: props.step,
        disabled: props.disabled || props.loading,
        'data-readonly': String(props.readonly),
        onInput: (event: Event) =>
          emit('update:modelValue', Number((event.target as HTMLInputElement).value)),
        onChange: (event: Event) =>
          emit('change', Number((event.target as HTMLInputElement).value)),
        onFocus: (event: FocusEvent) => emit('focus', event),
        onBlur: (event: FocusEvent) => emit('blur', event),
      });
  },
});

const InputNumberStub = defineComponent({
  name: 'AInputNumber',
  inheritAttrs: false,
  props: {
    value: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, required: true },
    controls: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    readonly: { type: Boolean, required: true },
    size: { type: String, required: true },
    status: { type: String, default: undefined },
  },
  emits: ['update:value', 'change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        class: 'number-control-stub',
        type: 'number',
        value: props.value,
        min: props.min,
        max: props.max,
        step: props.step,
        disabled: props.disabled,
        readonly: props.readonly,
        'data-controls': String(props.controls),
        'data-status': props.status,
        onInput: (event: Event) => {
          const value = (event.target as HTMLInputElement).value;
          emit('update:value', value === '' ? null : Number(value));
        },
        onChange: (event: Event) => {
          const value = (event.target as HTMLInputElement).value;
          emit('change', value === '' ? null : Number(value));
        },
        onFocus: (event: FocusEvent) => emit('focus', event),
        onBlur: (event: FocusEvent) => emit('blur', event),
      });
  },
});

function mountRangeSlider(props: Record<string, unknown> = {}) {
  return mount(BaseRangeSlider, {
    props: { modelValue: 25, ...props },
    global: { stubs: { AInputNumber: InputNumberStub, BaseSlider: BaseSliderStub } },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('BaseRangeSlider', () => {
  it('locks the public prop contract and defaults', () => {
    const wrapper = mountRangeSlider();

    expect(Object.keys(wrapper.props()).sort()).toEqual(
      [
        'ariaLabel',
        'block',
        'disabled',
        'error',
        'errorMessage',
        'hint',
        'id',
        'label',
        'layout',
        'loading',
        'max',
        'min',
        'modelValue',
        'readonly',
        'required',
        'size',
        'status',
        'step',
      ].sort(),
    );
    expect(wrapper.props()).toMatchObject({
      ariaLabel: 'Range slider',
      block: true,
      disabled: false,
      error: false,
      layout: 'vertical',
      loading: false,
      max: 100,
      min: 0,
      readonly: false,
      required: false,
      size: 'medium',
      status: 'default',
      step: 1,
    });
  });

  it('renders label, required marker, hint and vertical layout', () => {
    const wrapper = mountRangeSlider({
      hint: 'Choose a value',
      label: 'Replica Count',
      required: true,
    });

    expect(wrapper.classes()).toContain('ds-range-slider--vertical');
    expect(wrapper.get('.ds-field__label').text()).toContain('Replica Count');
    expect(wrapper.get('.ds-field__required').text()).toBe('*');
    expect(wrapper.get('.ds-field__message').text()).toBe('Choose a value');
  });

  it('maps horizontal layout and range constraints to both controls', () => {
    const wrapper = mountRangeSlider({ layout: 'horizontal', min: 10, max: 80, step: 5 });
    const slider = wrapper.getComponent(BaseSliderStub);
    const input = wrapper.getComponent(InputNumberStub);

    expect(wrapper.classes()).toContain('ds-range-slider--horizontal');
    expect(slider.props()).toMatchObject({ min: 10, max: 80, step: 5 });
    expect(input.props()).toMatchObject({ min: 10, max: 80, step: 5, controls: false });
  });

  it.each([
    ['small', 'small'],
    ['medium', 'middle'],
    ['large', 'large'],
  ] as const)('maps the %s size without leaking Ant naming', (size, antSize) => {
    const wrapper = mountRangeSlider({ size });

    expect(wrapper.classes()).toContain(`ds-range-slider--${size}`);
    expect(wrapper.getComponent(BaseSliderStub).props('size')).toBe(size);
    expect(wrapper.getComponent(InputNumberStub).props('size')).toBe(antSize);
  });

  it('forwards slider updates through the Base Component event names', async () => {
    const wrapper = mountRangeSlider();
    const slider = wrapper.get<HTMLInputElement>('.range-control-stub');

    slider.element.value = '40';
    await slider.trigger('input');
    slider.element.value = '45';
    await slider.trigger('change');

    expect(wrapper.emitted('update:modelValue')).toEqual([[40]]);
    expect(wrapper.emitted('change')).toEqual([[45]]);
    expect(Object.keys(wrapper.emitted())).not.toContain('update:value');
  });

  it('syncs numeric input updates and clamps values to min and max', async () => {
    const wrapper = mountRangeSlider({ min: 10, max: 80 });
    const input = wrapper.getComponent(InputNumberStub);

    input.vm.$emit('update:value', 60);
    input.vm.$emit('update:value', '70');
    input.vm.$emit('update:value', 120);
    input.vm.$emit('change', -5);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toEqual([[60], [70], [80]]);
    expect(wrapper.emitted('change')).toEqual([[10]]);
  });

  it('ignores empty and non-numeric input payloads', async () => {
    const wrapper = mountRangeSlider();
    const input = wrapper.getComponent(InputNumberStub);

    input.vm.$emit('update:value', null);
    input.vm.$emit('update:value', 'not-a-number');
    input.vm.$emit('change', '');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it.each(['disabled', 'readonly', 'loading'] as const)(
    'blocks slider and numeric input updates while %s',
    async (state) => {
      const wrapper = mountRangeSlider({ [state]: true });
      const slider = wrapper.getComponent(BaseSliderStub);
      const input = wrapper.getComponent(InputNumberStub);

      slider.vm.$emit('update:modelValue', 50);
      input.vm.$emit('update:value', 60);
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(slider.props(state)).toBe(true);
      expect(input.props(state === 'loading' ? 'disabled' : state)).toBe(true);
    },
  );

  it('keeps readonly focusable instead of styling it as disabled', () => {
    const wrapper = mountRangeSlider({ readonly: true });
    const input = wrapper.get<HTMLInputElement>('.number-control-stub');

    expect(input.attributes('readonly')).toBeDefined();
    expect(input.attributes('disabled')).toBeUndefined();
    expect(wrapper.classes()).toContain('ds-range-slider--readonly');
    expect(wrapper.classes()).not.toContain('ds-range-slider--disabled');
  });

  it('gives error precedence over warning and wires accessibility metadata', () => {
    const wrapper = mountRangeSlider({
      id: 'replicas',
      label: 'Replica Count',
      status: 'warning',
      errorMessage: 'Invalid replica count',
    });
    const group = wrapper.get('[role="group"]');
    const input = wrapper.getComponent(InputNumberStub);

    expect(wrapper.classes()).toContain('ds-field--error');
    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid replica count');
    expect(group.attributes('aria-labelledby')).toBe('replicas-label');
    expect(group.attributes('aria-describedby')).toBe('replicas-message');
    expect(group.attributes('aria-invalid')).toBe('true');
    expect(input.props('status')).toBe('error');
  });

  it('forwards focus and blur from both controls', async () => {
    const wrapper = mountRangeSlider();
    const slider = wrapper.get('.range-control-stub');
    const input = wrapper.get('.number-control-stub');

    await slider.trigger('focus');
    await slider.trigger('blur');
    await input.trigger('focus');
    await input.trigger('blur');

    expect(wrapper.emitted('focus')).toHaveLength(2);
    expect(wrapper.emitted('blur')).toHaveLength(2);
  });
});
