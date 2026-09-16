import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseDatePickerDefaults } from 'components/base/date-picker';
import BaseDatePicker from 'components/base/date-picker/BaseDatePicker.vue';
import { describe, expect, it } from 'vitest';

describe('BaseDatePicker', () => {
  it('exports documented defaults from the date-picker module', () => {
    expect(baseDatePickerDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      format: 'MM/DD/YYYY',
      hint: '',
      inputReadOnly: true,
      layout: 'vertical',
      modelValue: null,
      placeholder: 'Select Date',
      required: false,
      size: 'medium',
      valueFormat: 'YYYY-MM-DD',
    });
  });

  it('renders the vertical layout by default with label, placeholder, and helper text', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        hint: 'Helper Text',
        label: 'Label text',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-date-picker--vertical');
      expect(wrapper.classes()).toContain('base-picker');
      expect(wrapper.get('.base-date-picker__control').classes()).toContain('base-picker__control');
      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.get('input').attributes('placeholder')).toBe('Select Date');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses shared field shell wiring for label, helper message, and input accessibility', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        hint: 'Helper Text',
        id: 'delivery-date',
        label: 'Label text',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.get('.ds-field__label').attributes('for')).toBe('delivery-date');
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('delivery-date-message');
      expect(input.attributes('id')).toBe('delivery-date');
      expect(input.attributes('aria-labelledby')).toBe('delivery-date-label');
      expect(input.attributes('aria-describedby')).toBe('delivery-date-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses filled state when a value exists', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        modelValue: '2026-08-27',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-date-picker--filled');
      expect(wrapper.attributes('data-state')).toBe('filled');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses error state when error text is provided', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        errorMessage: 'Helper Text',
        hint: 'Neutral helper',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-date-picker--error');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.text()).not.toContain('Neutral helper');
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    } finally {
      wrapper.unmount();
    }
  });

  it('passes disabled state to the underlying picker input', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        disabled: true,
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-date-picker--disabled');
      expect(wrapper.get('input').attributes()).toHaveProperty('disabled');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses focus state while the underlying picker input is focused', async () => {
    const wrapper = mount(BaseDatePicker);

    try {
      await wrapper.get('input').trigger('focus');

      expect(wrapper.classes()).toContain('base-date-picker--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('emits model updates from the Ant picker value contract', async () => {
    const wrapper = mount(BaseDatePicker);
    const picker = wrapper.findComponent({ name: 'ADatePicker' });

    try {
      await picker.vm.$emit('update:value', '2026-08-27');

      expect(wrapper.emitted('update:modelValue')).toEqual([['2026-08-27']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('leaves Ant picker panel and open behavior uncontrolled', () => {
    const wrapper = mount(BaseDatePicker, {
      props: {
        modelValue: '2026-08-27',
      },
    });
    const picker = wrapper.findComponent({ name: 'ADatePicker' });

    try {
      expect(picker.props('value')).toBe('2026-08-27');
      expect(picker.props('open')).toBeUndefined();
      expect(picker.props('mode')).toBeUndefined();
      expect(picker.props('onOpenChange')).toBeUndefined();
      expect(picker.props('onPanelChange')).toBeUndefined();
      expect(picker.props('onSelect')).toBeUndefined();
      expect(picker.props('onChange')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the Ant popup positioning contract at its default and shows the default Today action', () => {
    const wrapper = mount(BaseDatePicker);
    const picker = wrapper.findComponent({ name: 'ADatePicker' });

    try {
      expect(picker.props('popupClassName')).toBe('base-date-picker__dropdown');
      expect(picker.props('placement')).toBeUndefined();
      expect(picker.props('getPopupContainer')).toBeUndefined();
      expect(picker.props('renderExtraFooter')).toBeUndefined();
      expect(picker.props('showToday')).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('passes input read-only behavior through as an overridable picker prop', () => {
    const defaultWrapper = mount(BaseDatePicker);
    const editableWrapper = mount(BaseDatePicker, {
      props: {
        inputReadOnly: false,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'ADatePicker' }).props('inputReadOnly')).toBe(
        true,
      );
      expect(editableWrapper.findComponent({ name: 'ADatePicker' }).props('inputReadOnly')).toBe(
        false,
      );
    } finally {
      defaultWrapper.unmount();
      editableWrapper.unmount();
    }
  });

  it('styles Ant Today action and selected month/year cells', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/date-picker/base-date-picker.css'),
      'utf8',
    );

    expect(css).toContain('.base-date-picker__dropdown .ant-picker-today-btn');
    expect(css).toContain('.base-date-picker__dropdown');
    expect(css).toContain('.ant-picker-month-panel');
    expect(css).toContain('.ant-picker-year-panel');
    expect(css).toContain('.ant-picker-cell-in-view.ant-picker-cell-selected');
    expect(css).toContain('background: var(--ds-color-primary)');
    expect(css).toContain('inline-size: var(--ds-picker-month-year-cell-width)');
    expect(css).toContain('border-radius: var(--ds-picker-year-cell-radius)');
    expect(css).not.toContain('.base-date-picker__footer');
    expect(css).not.toContain('.base-date-picker__today');
    expect(css).not.toContain('.base-date-picker__ok');
    expect(css).not.toContain('ant-picker-time-panel');
    expect(css).not.toContain('ant-picker-cell-in-range');
    expect(css).not.toContain('ds-date-picker');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('!important');
  });

  it('does not synchronize accessibility by mutating Ant private input DOM after render', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/date-picker/BaseDatePicker.vue'),
      'utf8',
    );

    expect(source).not.toContain('syncInputAccessibility');
    expect(source).not.toContain('setOptionalAttribute');
    expect(source).not.toContain("querySelector('input')");
  });
});
