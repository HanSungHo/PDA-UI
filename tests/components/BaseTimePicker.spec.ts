import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseTimePickerDefaults } from 'components/base/time-picker';
import BaseTimePicker from 'components/base/time-picker/BaseTimePicker.vue';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

describe('BaseTimePicker', () => {
  it('exports documented defaults from the time-picker module', () => {
    expect(baseTimePickerDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      format: 'HH:mm:ss',
      hint: '',
      inputReadOnly: true,
      layout: 'vertical',
      modelValue: null,
      placeholder: 'Select Time',
      required: false,
      size: 'medium',
      valueFormat: 'HH:mm:ss',
    });
  });

  it('renders the vertical layout by default with label, placeholder, and helper text', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        hint: 'Helper Text',
        label: 'Label text',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-time-picker--vertical');
      expect(wrapper.classes()).toContain('base-picker');
      expect(wrapper.get('.base-time-picker__control').classes()).toContain('base-picker__control');
      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.get('input').attributes('placeholder')).toBe('Select Time');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses shared field shell wiring for label, helper message, and input accessibility', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        hint: 'Helper Text',
        id: 'delivery-time',
        label: 'Label text',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.get('.ds-field__label').attributes('for')).toBe('delivery-time');
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('delivery-time-message');
      expect(input.attributes('id')).toBe('delivery-time');
      expect(input.attributes('aria-labelledby')).toBe('delivery-time-label');
      expect(input.attributes('aria-describedby')).toBe('delivery-time-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses filled state when a value exists', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        modelValue: '09:30:15',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-time-picker--filled');
      expect(wrapper.attributes('data-state')).toBe('filled');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses error state when error text is provided', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        errorMessage: 'Helper Text',
        hint: 'Neutral helper',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-time-picker--error');
      expect(wrapper.text()).toContain('Helper Text');
      expect(wrapper.text()).not.toContain('Neutral helper');
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
    } finally {
      wrapper.unmount();
    }
  });

  it('passes disabled state to the underlying time picker input', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        disabled: true,
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-time-picker--disabled');
      expect(wrapper.get('input').attributes()).toHaveProperty('disabled');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses focus state while the underlying time picker input is focused', async () => {
    const wrapper = mount(BaseTimePicker);

    try {
      await wrapper.get('input').trigger('focus');

      expect(wrapper.classes()).toContain('base-time-picker--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('lets Ant handle native OK confirmation and commits its confirmed value', async () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        modelValue: '09:30:15',
      },
    });
    const picker = wrapper.findComponent({ name: 'ATimePicker' });

    try {
      expect(picker.props('value')).toBe('09:30:15');
      expect(picker.props('open')).toBeUndefined();
      expect(picker.props('onOpenChange')).toBeUndefined();
      expect(picker.props('onSelect')).toBeUndefined();
      expect(picker.props('onOk')).toBeUndefined();

      await picker.vm.$emit('update:value', '11:20:00');
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([['11:20:00']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps Ant time popup positioning and panel width at its default', () => {
    const wrapper = mount(BaseTimePicker);
    const picker = wrapper.findComponent({ name: 'ATimePicker' });

    try {
      expect(picker.props('popupClassName')).toBe('base-time-picker__dropdown');
      expect(picker.props('placement')).toBeUndefined();
      expect(picker.props('getPopupContainer')).toBeUndefined();
      expect(picker.props('format')).toBe('HH:mm:ss');
      expect(picker.props('open')).toBeUndefined();
      expect(picker.props('showNow')).toBe(true);
      expect(picker.props('locale')).toMatchObject({
        lang: {
          now: 'Today',
          ok: 'OK',
        },
      });
      expect(picker.props('popupStyle')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('passes input read-only behavior through as an overridable picker prop', () => {
    const defaultWrapper = mount(BaseTimePicker);
    const editableWrapper = mount(BaseTimePicker, {
      props: {
        inputReadOnly: false,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'ATimePicker' }).props('inputReadOnly')).toBe(
        true,
      );
      expect(editableWrapper.findComponent({ name: 'ATimePicker' }).props('inputReadOnly')).toBe(
        false,
      );
    } finally {
      defaultWrapper.unmount();
      editableWrapper.unmount();
    }
  });

  it('passes seconds format through while leaving popup sizing to Ant', () => {
    const wrapper = mount(BaseTimePicker, {
      props: {
        format: 'HH:mm:ss',
        valueFormat: 'HH:mm:ss',
      },
    });
    const picker = wrapper.findComponent({ name: 'ATimePicker' });

    try {
      expect(picker.props('format')).toBe('HH:mm:ss');
      expect(picker.props('valueFormat')).toBe('HH:mm:ss');
      expect(picker.props('popupClassName')).toBe('base-time-picker__dropdown');
      expect(picker.props('popupStyle')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('styles the native time picker panel without overriding Ant panel dimensions', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/base-time-picker.css'),
      'utf8',
    );

    expect(css).toContain('.base-time-picker__dropdown .ant-picker-time-panel');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-time-panel-column');
    expect(css).not.toContain('height: var(--ds-picker-time-panel-height)');
    expect(css).not.toContain('--ds-picker-time-panel-height');
    expect(css).toContain('background: var(--ds-color-surface)');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-panel-container');
    expect(css).toContain('border-radius: 0 0 var(--ds-picker-dropdown-radius)');
    expect(css).toContain('width: auto');
    expect(css).toContain('margin-inline: 0');
    expect(css).not.toContain('overflow-y: scroll');
    expect(css).toContain('scrollbar-color: var(--ds-color-text-disabled) transparent');
    expect(css).toContain('scrollbar-width: thin');
    expect(css).toContain(
      '.base-time-picker__dropdown .ant-picker-time-panel-column::-webkit-scrollbar',
    );
    expect(css).toContain(
      '.base-time-picker__dropdown .ant-picker-time-panel-column::-webkit-scrollbar-track',
    );
    expect(css).toContain(
      '.base-time-picker__dropdown .ant-picker-time-panel-column::-webkit-scrollbar-thumb',
    );
    expect(css).toContain(
      '.base-time-picker__dropdown .ant-picker-time-panel-column::-webkit-scrollbar-thumb:hover',
    );
    expect(css).toContain('width: var(--ds-spacing-1)');
    expect(css).toContain('background-color: var(--ds-color-text-disabled)');
    expect(css).toContain('background-color: var(--ds-color-text-secondary)');
    expect(css).not.toContain('.base-time-picker__dropdown .ant-picker-time-panel-column::after');
    expect(css).not.toContain('height: 0');
    expect(css).not.toContain('height: var(--ds-picker-time-first-column-spacer-height)');
    expect(css).not.toContain('height: var(--ds-picker-panel-item-height)');
    expect(css).not.toContain('block-size: var(--ds-picker-panel-item-height)');
    expect(css).not.toContain('width: var(--ds-time-picker-column-width)');
    expect(css).not.toContain('width: var(--ds-time-picker-dropdown-width)');
    expect(css).not.toContain('inline-size: var(--ds-time-picker-column-width)');
    expect(css).not.toContain('inline-size: var(--ds-time-picker-dropdown-width)');
    expect(css).toContain('font-size: var(--ds-font-size-md)');
    expect(css).toContain('color: var(--ds-color-text)');
    expect(css).toContain('li.ant-picker-time-panel-cell-selected');
    expect(css).toContain('li.ant-picker-time-panel-cell-selected:hover');
    expect(css).toContain('.ant-picker-time-panel-cell-inner:hover');
    expect(css).toContain('background-color: var(--ds-color-primary)');
    expect(css).toContain('color: var(--ds-color-on-primary)');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('calc(var(--ds-spacing-2) + 2px)');
    expect(css).not.toContain('!important');
  });

  it('styles the native time picker footer without replacing Ant footer layout', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/base-time-picker.css'),
      'utf8',
    );

    expect(css).toContain('.base-time-picker__dropdown .ant-picker-footer');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-ranges');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-now');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-now-btn');
    expect(css).toContain('.base-time-picker__dropdown .ant-picker-ok');
    expect(css).toContain('justify-content: space-between');
    expect(css).toContain('block-size: var(--ds-picker-footer-height)');
    expect(css).toContain('align-self: stretch');
    expect(css).toContain('flex-grow: 1');
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('block-size: 100%');
    expect(css).toContain('padding: var(--ds-picker-footer-padding-y) var(--ds-spacing-3)');
    expect(css).toContain('font-weight: var(--ds-font-weight-regular)');
    expect(css).toContain('line-height: var(--ds-picker-footer-text-line-height)');
    expect(css).toContain('background: var(--ds-color-surface)');
    expect(css).toContain('box-shadow: inset 0 1px 0 var(--ds-color-divider)');
    expect(css).toContain('color: var(--ds-color-primary-subtle)');
    expect(css).toContain('block-size: var(--ds-picker-action-button-height)');
    expect(css).toContain('inline-size: var(--ds-picker-action-button-width)');
    expect(css).toContain('line-height: var(--ds-picker-action-button-line-height)');
    expect(css).not.toContain('base-time-picker__footer');
    expect(css).not.toContain('base-time-picker__ok');
    expect(css).not.toContain('ant-picker-month-panel');
    expect(css).not.toContain('ant-picker-year-panel');
    expect(css).not.toContain('ant-picker-cell-in-range');
    expect(css).not.toContain('ds-date-picker');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('text-transform');
  });

  it('does not synchronize accessibility by mutating Ant private input DOM after render', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/BaseTimePicker.vue'),
      'utf8',
    );

    expect(source).not.toContain('syncInputAccessibility');
    expect(source).not.toContain('setOptionalAttribute');
    expect(source).not.toContain("querySelector('input')");
  });
});
