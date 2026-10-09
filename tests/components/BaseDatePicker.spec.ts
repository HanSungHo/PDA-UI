import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseDatePickerDefaults } from 'components/base/date-picker';
import BaseDatePicker from 'components/base/date-picker/BaseDatePicker.vue';
import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick } from 'vue';

const PopupProxyStub = defineComponent({
  name: 'QPopupProxy',
  props: {
    breakpoint: {
      type: Number,
      default: 0,
    },
    cover: {
      type: Boolean,
      default: false,
    },
    transitionHide: {
      type: String,
      default: undefined,
    },
    transitionShow: {
      type: String,
      default: undefined,
    },
  },
  methods: {
    hide() {
      this.$emit('beforeHide');
    },
  },
  template: '<div v-bind="$attrs"><slot /></div>',
});

function mountDatePicker(options: Record<string, unknown> = {}) {
  const global = options.global as { stubs?: Record<string, unknown> } | undefined;

  return mount(BaseDatePicker, {
    ...options,
    global: {
      ...global,
      stubs: {
        ...global?.stubs,
        QPopupProxy: PopupProxyStub,
      },
    },
  });
}

describe('BaseDatePicker', () => {
  it('exports documented defaults from the date-picker module', () => {
    expect(baseDatePickerDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      format: 'MM/DD/YYYY',
      hint: '',
      inputReadOnly: false,
      mode: 'single',
      modelValue: null,
      placeholder: 'Select Date',
      required: false,
      size: 'medium',
      valueFormat: 'YYYY-MM-DD',
      withSeconds: false,
      withTime: false,
    });
  });

  it('renders with label inside the input, placeholder, and helper text', () => {
    const wrapper = mountDatePicker({
      props: {
        hint: 'Helper Text',
        label: 'Label text',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-picker');
      expect(wrapper.get('.base-date-picker__control').classes()).toContain('base-picker__control');
      const input = wrapper.get('input');

      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(wrapper.findComponent({ name: 'QInput' }).props('label')).toBe('Label text');
      expect(wrapper.findComponent({ name: 'QInput' }).props('stackLabel')).toBe(true);
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.text()).toContain('Helper Text');
      expect(input.attributes('placeholder')).toBe('Select Date');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses QInput label wiring for vertical layout accessibility', () => {
    const wrapper = mountDatePicker({
      props: {
        hint: 'Helper Text',
        id: 'delivery-date',
        label: 'Label text',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('delivery-date-message');
      expect(input.attributes('id')).toBe('delivery-date');
      expect(input.attributes('aria-labelledby')).toBeUndefined();
      expect(input.attributes('aria-describedby')).toBe('delivery-date-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses filled state when a value exists', () => {
    const wrapper = mountDatePicker({
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
    const wrapper = mountDatePicker({
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
    const wrapper = mountDatePicker({
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
    const wrapper = mountDatePicker();

    try {
      await wrapper.get('input').trigger('focusin');

      expect(wrapper.classes()).toContain('base-date-picker--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the Quasar filled input date picker pattern in single mode', () => {
    const wrapper = mountDatePicker();

    try {
      expect(wrapper.findComponent({ name: 'QInput' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'QDate' }).exists()).toBe(true);
      expect(
        wrapper
          .findAllComponents({ name: 'QIcon' })
          .some((icon) => icon.props('name') === 'o_event'),
      ).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('cover')).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('transitionShow')).toBe('scale');
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('transitionHide')).toBe('scale');
      expect(
        wrapper
          .findAllComponents({ name: 'QBtn' })
          .some((button) => button.props('label') === 'Close'),
      ).toBe(true);
      expect(wrapper.findComponent({ name: 'QInput' }).props('mask')).toBe('##/##/####');
      expect(wrapper.findComponent({ name: 'QDate' }).props('range')).toBe(false);
      expect(wrapper.findAllComponents({ name: 'QPopupProxy' })).toHaveLength(1);
    } finally {
      wrapper.unmount();
    }
  });

  it('emits a single date from the Quasar date selection', async () => {
    const wrapper = mountDatePicker({
      props: {
        modelValue: '2026-08-27',
      },
    });
    const picker = wrapper.findComponent({ name: 'QDate' });

    try {
      expect(picker.props('modelValue')).toBe('2026/08/27');
      expect(wrapper.get('input').element.value).toBe('08/27/2026');

      await picker.vm.$emit('update:modelValue', '2026/09/01');
      expect(wrapper.emitted('update:modelValue')).toEqual([['2026-09-01']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders range mode with Quasar range selection and commits an object value', async () => {
    const wrapper = mountDatePicker({
      props: {
        mode: 'range',
        modelValue: {
          from: '2026-08-01',
          to: '2026-08-27',
        },
      },
    });
    const picker = wrapper.findComponent({ name: 'QDate' });

    try {
      expect(wrapper.classes()).toContain('base-date-picker--range');
      expect(picker.props('range')).toBe(true);
      expect(picker.props('modelValue')).toEqual({
        from: '2026/08/01',
        to: '2026/08/27',
      });
      expect(wrapper.get('input').element.value).toBe('08/01/2026 - 08/27/2026');

      await picker.vm.$emit('update:modelValue', {
        from: '2026/09/01',
        to: '2026/09/10',
      });

      expect(wrapper.emitted('update:modelValue')).toEqual([
        [
          {
            from: '2026-09-01',
            to: '2026-09-10',
          },
        ],
      ]);
    } finally {
      wrapper.unmount();
    }
  });

  it('emits null when an incomplete range is confirmed', async () => {
    const wrapper = mountDatePicker({
      props: {
        mode: 'range',
      },
    });
    const picker = wrapper.findComponent({ name: 'QDate' });

    try {
      await picker.vm.$emit('update:modelValue', {
        from: '2026/09/01',
      });

      expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders optional time selection for single date-time values', async () => {
    const wrapper = mountDatePicker({
      props: {
        format: 'MM/DD/YYYY HH:mm',
        modelValue: '2026-08-27 13:30',
        valueFormat: 'YYYY-MM-DD HH:mm',
        withTime: true,
      },
    });
    const timePicker = wrapper.findComponent({ name: 'QTime' });

    try {
      const iconNames = wrapper
        .findAllComponents({ name: 'QIcon' })
        .map((icon) => icon.props('name'));

      expect(wrapper.findComponent({ name: 'QDate' }).props('mask')).toBe('YYYY/MM/DD HH:mm');
      expect(wrapper.findAllComponents({ name: 'QPopupProxy' })).toHaveLength(2);
      expect(iconNames).toContain('o_event');
      expect(iconNames).toContain('o_access_time');
      expect(timePicker.exists()).toBe(true);
      expect(timePicker.props('modelValue')).toBe('2026/08/27 13:30');
      expect(timePicker.props('mask')).toBe('YYYY/MM/DD HH:mm');
      expect(timePicker.props('format24h')).toBe(true);
      expect(timePicker.props('withSeconds')).toBe(false);
      expect(wrapper.get('input').element.value).toBe('08/27/2026 13:30');

      await timePicker.vm.$emit('update:modelValue', '2026/08/27 14:45');

      expect(wrapper.emitted('update:modelValue')).toEqual([['2026-08-27 14:45']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('allows typing dates by default and can still be configured as read-only', async () => {
    const defaultWrapper = mountDatePicker();
    const readOnlyWrapper = mountDatePicker({
      props: {
        inputReadOnly: true,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'QInput' }).props('readonly')).toBe(false);
      expect(readOnlyWrapper.findComponent({ name: 'QInput' }).props('readonly')).toBe(true);

      await defaultWrapper
        .findComponent({ name: 'QInput' })
        .vm.$emit('update:modelValue', '09/01/2026');
      expect(defaultWrapper.emitted('update:modelValue')).toEqual([['2026-09-01']]);

      await defaultWrapper.findComponent({ name: 'QInput' }).vm.$emit('update:modelValue', '09/');
      await nextTick();

      expect(defaultWrapper.findComponent({ name: 'QInput' }).props('modelValue')).toBe('09/');
      expect(defaultWrapper.emitted('update:modelValue')).toEqual([['2026-09-01']]);
    } finally {
      defaultWrapper.unmount();
      readOnlyWrapper.unmount();
    }
  });

  it('parses typed dates that use short month and weekday tokens', async () => {
    const wrapper = mountDatePicker({
      props: {
        format: 'ddd DD-MMM-YYYY',
        modelValue: '2026-08-27',
      },
    });

    try {
      expect(wrapper.findComponent({ name: 'QInput' }).props('mask')).toBe('SSS ##-SSS-####');
      expect(wrapper.get('input').element.value).toBe('Thu 27-Aug-2026');

      await wrapper
        .findComponent({ name: 'QInput' })
        .vm.$emit('update:modelValue', 'Tue 01-Sep-2026');

      expect(wrapper.emitted('update:modelValue')).toEqual([['2026-09-01']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses shared Quasar picker field styles and keeps the date popup plain', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/shared/base-picker.css'),
      'utf8',
    );
    const dateCss = readFileSync(
      join(process.cwd(), 'src/components/base/date-picker/base-date-picker.css'),
      'utf8',
    );

    expect(css).toContain('height: var(--ds-input-min-height-md)');
    expect(css).toContain('border-bottom: var(--input-medium-border-width) solid transparent');
    expect(css).toContain('border-radius: var(--ds-radius-sm) var(--ds-radius-sm) 0 0');
    expect(css).toContain('color: var(--text-text-primary)');
    expect(css).toContain('padding-top: var(--ds-spacing-4)');
    expect(css).toContain('transform: none');
    expect(css).toContain('.base-picker--focus .base-picker__control .q-field__label');
    expect(css).toContain('.base-picker--error .base-picker__control .q-field__label');
    expect(css).toContain('display: none');
    expect(css).toContain('border-bottom: 2px solid var(--border-border-brand)');
    expect(css).not.toContain('#');
    expect(css).not.toContain('q-field--float .q-field__native');
    expect(css).not.toContain('ant-picker');

    expect(dateCss).toContain('@import');
    expect(dateCss).toContain('.base-date-picker__dropdown');
    expect(dateCss).toContain('--q-primary: var(--background-background-brand)');
    expect(dateCss).not.toContain('.q-field__control');
    expect(dateCss).not.toContain('#');
    expect(css).not.toContain('.base-date-picker__header');
    expect(css).not.toContain('.base-date-picker__footer');
    expect(css).not.toContain('.base-date-picker__ok');
    expect(css).not.toContain('.q-date__range');
    expect(css).not.toContain('.q-date__calendar');
    expect(css).not.toContain('.q-date__today');
    expect(css).not.toContain('ds-date-picker');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('!important');
  });

  it('does not synchronize accessibility by mutating private input DOM after render', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/date-picker/BaseDatePicker.vue'),
      'utf8',
    );

    expect(source).not.toContain('syncInputAccessibility');
    expect(source).not.toContain('setOptionalAttribute');
    expect(source).not.toContain("querySelector('input')");
    expect(source).not.toContain('ADatePicker');
    expect(source).not.toContain('name="event"');
    expect(source).not.toContain('base-date-picker__header');
    expect(source).not.toContain('base-date-picker__footer');
  });

  it('loads the outlined icon font in Storybook like BaseButton stories', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/date-picker/BaseDatePicker.stories.ts'),
      'utf8',
    );

    expect(source).toContain('@quasar/extras/material-icons-outlined/material-icons-outlined.css');
    expect(source).not.toContain('layout:');
    expect(source).not.toContain('Horizontal');
    expect(source).not.toContain('FocusStyle');
    expect(source).toContain('WithTime');
    expect(source).toContain('withTime: true');
  });
});
