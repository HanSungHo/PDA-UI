import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import BaseSlider from '../../src/components/base/slider/BaseSlider.vue';

/**
 * The stub exposes a `dblclick` handler that emits a range-mode array
 * value. This does not represent a real Ant Slider event triggered by
 * an HTML range input (which only ever produces numbers) — it exists
 * solely to exercise BaseSlider's range-rejection branch
 * (`isSingleSliderValue`) at the component call-site, in addition to
 * the standalone `isSingleSliderValue` unit tests in
 * `base-slider-constants.spec.ts`.
 */
const ASliderStub = defineComponent({
  name: 'ASlider',
  inheritAttrs: false,
  props: {
    value: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, required: true },
    disabled: { type: Boolean, required: true },
    dots: { type: Boolean, required: true },
    included: { type: Boolean, required: true },
    marks: { type: Object, default: undefined },
  },
  emits: ['update:value', 'change', 'after-change', 'focus', 'blur'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        class: 'slider-stub',
        type: 'range',
        value: props.value,
        min: props.min,
        max: props.max,
        step: props.step,
        disabled: props.disabled,
        'data-dots': String(props.dots),
        'data-included': String(props.included),
        'data-has-marks': String(props.marks !== undefined),
        onInput: (event: Event) =>
          emit('update:value', Number((event.target as HTMLInputElement).value)),
        onChange: (event: Event) =>
          emit('change', Number((event.target as HTMLInputElement).value)),
        onMouseup: () => emit('after-change', props.value),
        onFocus: (event: FocusEvent) => emit('focus', event),
        onBlur: (event: FocusEvent) => emit('blur', event),
        onDblclick: () => emit('update:value', [10, 20]),
      });
  },
});

function mountBaseSlider(props: Record<string, unknown> = {}) {
  return mount(BaseSlider, {
    props: { modelValue: 40, ...props },
    global: { stubs: { ASlider: ASliderStub } },
  });
}

describe('BaseSlider', () => {
  describe('public API contract', () => {
    it('exposes exactly the documented BaseSlider props (no Ant leak)', () => {
      const wrapper = mountBaseSlider();

      expect(Object.keys(wrapper.props()).sort()).toEqual(
        [
          'ariaLabel',
          'block',
          'disabled',
          'dots',
          'error',
          'errorMessage',
          'hint',
          'id',
          'included',
          'label',
          'loading',
          'marks',
          'max',
          'min',
          'modelValue',
          'readonly',
          'required',
          'showValue',
          'size',
          'status',
          'step',
          'tooltipOpen',
          'valuePrefix',
          'valueSuffix',
        ].sort(),
      );
    });

    it('never re-emits the Ant-native "update:value" or "after-change" event names', async () => {
      const wrapper = mountBaseSlider();
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      control.element.value = '70';
      await control.trigger('input');
      await control.trigger('mouseup');

      const emittedNames = Object.keys(wrapper.emitted());

      expect(emittedNames).not.toContain('update:value');
      expect(emittedNames).not.toContain('after-change');
    });

    it('applies every documented default value when optional props are omitted', () => {
      const wrapper = mountBaseSlider();

      expect(wrapper.props('min')).toBe(0);
      expect(wrapper.props('max')).toBe(100);
      expect(wrapper.props('step')).toBe(1);
      expect(wrapper.props('size')).toBe('medium');
      expect(wrapper.props('status')).toBe('default');
      expect(wrapper.props('block')).toBe(true);
      expect(wrapper.props('dots')).toBe(false);
      expect(wrapper.props('included')).toBe(true);
      expect(wrapper.props('showValue')).toBe(false);
      expect(wrapper.props('valuePrefix')).toBe('');
      expect(wrapper.props('valueSuffix')).toBe('');
    });
  });

  describe('rendering and prop forwarding', () => {
    it('forwards the resolved model value to the Ant control', () => {
      expect(
        mountBaseSlider({ modelValue: 65 }).get<HTMLInputElement>('.slider-stub').element.value,
      ).toBe('65');
    });

    it('forwards min, max, step, dots, included and marks to the Ant control', () => {
      const wrapper = mountBaseSlider({
        min: -20,
        max: 200,
        step: 10,
        dots: true,
        included: false,
        marks: { 0: 'Low', 100: 'High' },
      });
      const control = wrapper.get('.slider-stub');

      expect(control.attributes('min')).toBe('-20');
      expect(control.attributes('max')).toBe('200');
      expect(control.attributes('step')).toBe('10');
      expect(control.attributes('data-dots')).toBe('true');
      expect(control.attributes('data-included')).toBe('false');
      expect(control.attributes('data-has-marks')).toBe('true');
    });

    it('renders label, hint and required marker', () => {
      const wrapper = mountBaseSlider({
        label: 'Volume',
        hint: 'Adjust volume',
        required: true,
      });

      expect(wrapper.text()).toContain('Volume');
      expect(wrapper.text()).toContain('Adjust volume');
      expect(wrapper.get('.ds-field__required').text()).toBe('*');
    });
  });

  describe('value display formatting', () => {
    it('does not render the value when showValue is false', () => {
      expect(mountBaseSlider().find('.ds-slider__value').exists()).toBe(false);
    });

    it('renders the bare value when showValue is true with no prefix/suffix', () => {
      expect(
        mountBaseSlider({ modelValue: 75, showValue: true }).get('.ds-slider__value').text(),
      ).toBe('75');
    });

    it('formats the value with a suffix', () => {
      expect(
        mountBaseSlider({ modelValue: 75, showValue: true, valueSuffix: '%' })
          .get('.ds-slider__value')
          .text(),
      ).toBe('75%');
    });

    it('formats the value with a prefix and suffix, and reacts to prop changes', async () => {
      const wrapper = mountBaseSlider({
        modelValue: 500,
        showValue: true,
        valuePrefix: '$',
        valueSuffix: ' USD',
      });

      expect(wrapper.get('.ds-slider__value').text()).toBe('$500 USD');
      await wrapper.setProps({ modelValue: 750 });
      expect(wrapper.get('.ds-slider__value').text()).toBe('$750 USD');
    });
  });

  describe('v-model and events', () => {
    it('emits update:modelValue when the control value changes', async () => {
      const wrapper = mountBaseSlider();
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      control.element.value = '70';
      await control.trigger('input');

      expect(wrapper.emitted('update:modelValue')).toEqual([[70]]);
    });

    it('emits change when the control commits a value', async () => {
      const wrapper = mountBaseSlider();
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      control.element.value = '60';
      await control.trigger('change');

      expect(wrapper.emitted('change')).toEqual([[60]]);
    });

    it('emits afterChange after interaction finishes', async () => {
      const wrapper = mountBaseSlider({ modelValue: 55 });

      await wrapper.get('.slider-stub').trigger('mouseup');

      expect(wrapper.emitted('afterChange')).toEqual([[55]]);
    });

    it('forwards focus and blur', async () => {
      const wrapper = mountBaseSlider();
      const control = wrapper.get('.slider-stub');

      await control.trigger('focus');
      await control.trigger('blur');

      expect(wrapper.emitted('focus')).toHaveLength(1);
      expect(wrapper.emitted('blur')).toHaveLength(1);
    });

    it('ignores a range-mode (array) payload instead of forwarding it', async () => {
      const wrapper = mountBaseSlider();

      await wrapper.get('.slider-stub').trigger('dblclick');

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });
  });

  describe('interaction semantics: disabled vs readonly vs loading', () => {
    it('disabled: sets native Ant disabled and blocks all three value events', async () => {
      const wrapper = mountBaseSlider({ disabled: true, modelValue: 30 });
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      expect(control.attributes('disabled')).toBeDefined();

      control.element.value = '90';
      await control.trigger('input');
      await control.trigger('change');
      await control.trigger('mouseup');

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('afterChange')).toBeUndefined();
    });

    it('loading: sets native Ant disabled, aria-busy, and blocks all three value events', async () => {
      const wrapper = mountBaseSlider({ loading: true, modelValue: 30 });
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      expect(control.attributes('disabled')).toBeDefined();
      expect(control.attributes('aria-busy')).toBe('true');

      control.element.value = '90';
      await control.trigger('input');
      await control.trigger('change');
      await control.trigger('mouseup');

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('afterChange')).toBeUndefined();
    });

    it('readonly: keeps the Ant control natively enabled but still blocks all three value events', async () => {
      const wrapper = mountBaseSlider({ readonly: true, modelValue: 30 });
      const control = wrapper.get<HTMLInputElement>('.slider-stub');

      expect(control.attributes('disabled')).toBeUndefined();
      expect(control.attributes('aria-readonly')).toBe('true');
      expect(wrapper.classes()).toContain('ds-slider--readonly');

      control.element.value = '90';
      await control.trigger('input');
      await control.trigger('change');
      await control.trigger('mouseup');

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('change')).toBeUndefined();
      expect(wrapper.emitted('afterChange')).toBeUndefined();
    });
  });

  describe('size mapping', () => {
    it.each(['small', 'medium', 'large'] as const)(
      'applies the ds-slider--%s field class',
      (size) => {
        expect(mountBaseSlider({ size }).classes()).toContain(`ds-slider--${size}`);
      },
    );
  });

  describe('validation, status and accessibility', () => {
    it('renders an error message with alert role and correct ARIA wiring', () => {
      const wrapper = mountBaseSlider({
        id: 'volume',
        label: 'Volume',
        errorMessage: 'Invalid value',
      });
      const control = wrapper.get('.slider-stub');

      expect(wrapper.get('[role="alert"]').text()).toBe('Invalid value');
      expect(wrapper.classes()).toContain('ds-field--error');
      expect(control.attributes('aria-labelledby')).toBe('volume-label');
      expect(control.attributes('aria-describedby')).toBe('volume-message');
      expect(control.attributes('aria-invalid')).toBe('true');
    });

    it('sets aria-required only when required is true', () => {
      expect(
        mountBaseSlider({ required: true }).get('.slider-stub').attributes('aria-required'),
      ).toBe('true');
      expect(
        mountBaseSlider({ required: false }).get('.slider-stub').attributes('aria-required'),
      ).toBeUndefined();
    });

    it('uses ariaLabel and omits aria-labelledby when no visible label is provided', () => {
      const wrapper = mountBaseSlider({ ariaLabel: 'Accessible slider' });
      const control = wrapper.get('.slider-stub');

      expect(control.attributes('aria-label')).toBe('Accessible slider');
      expect(control.attributes('aria-labelledby')).toBeUndefined();
    });

    it.each(['success', 'warning'] as const)('applies the ds-field--%s status class', (status) => {
      expect(mountBaseSlider({ status }).classes()).toContain(`ds-field--${status}`);
    });

    it('applies the block class by default', () => {
      expect(mountBaseSlider().classes()).toContain('ds-field--block');
    });
  });
});
