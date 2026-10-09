import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseTimePickerDefaults } from 'components/base/time-picker';
import BaseTimePicker from 'components/base/time-picker/BaseTimePicker.vue';
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

function mountTimePicker(options: Record<string, unknown> = {}) {
  const global = options.global as { stubs?: Record<string, unknown> } | undefined;

  return mount(BaseTimePicker, {
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

describe('BaseTimePicker', () => {
  it('exports documented defaults from the time-picker module', () => {
    expect(baseTimePickerDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      format: 'HH:mm:ss',
      hint: '',
      inputReadOnly: false,
      modelValue: null,
      placeholder: 'Select Time',
      required: false,
      size: 'medium',
      valueFormat: 'HH:mm:ss',
    });
  });

  it('renders with label inside the input, placeholder, and helper text', () => {
    const wrapper = mountTimePicker({
      props: {
        hint: 'Helper Text',
        label: 'Label text',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.classes()).toContain('base-picker');
      expect(wrapper.get('.base-time-picker__control').classes()).toContain('base-picker__control');
      expect(wrapper.classes()).toContain('ds-field');
      expect(wrapper.classes()).toContain('ds-field--vertical');
      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(wrapper.findComponent({ name: 'QInput' }).props('label')).toBe('Label text');
      expect(wrapper.findComponent({ name: 'QInput' }).props('stackLabel')).toBe(true);
      expect(wrapper.text()).toContain('Label text');
      expect(wrapper.text()).toContain('Helper Text');
      expect(input.attributes('placeholder')).toBe('Select Time');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses QInput label wiring for vertical layout accessibility', () => {
    const wrapper = mountTimePicker({
      props: {
        hint: 'Helper Text',
        id: 'delivery-time',
        label: 'Label text',
      },
    });

    try {
      const input = wrapper.get('input');

      expect(wrapper.find('.ds-field__label').exists()).toBe(false);
      expect(wrapper.get('.ds-field__message').attributes('id')).toBe('delivery-time-message');
      expect(input.attributes('id')).toBe('delivery-time');
      expect(input.attributes('aria-labelledby')).toBeUndefined();
      expect(input.attributes('aria-describedby')).toBe('delivery-time-message');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses filled state when a value exists', () => {
    const wrapper = mountTimePicker({
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
    const wrapper = mountTimePicker({
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

  it('passes disabled state to the underlying time input', () => {
    const wrapper = mountTimePicker({
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

  it('uses focus state while the underlying time input is focused', async () => {
    const wrapper = mountTimePicker();

    try {
      await wrapper.get('input').trigger('focusin');

      expect(wrapper.classes()).toContain('base-time-picker--focus');
      expect(wrapper.attributes('data-state')).toBe('focus');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders the Quasar filled input time picker pattern', () => {
    const wrapper = mountTimePicker();

    try {
      expect(wrapper.findComponent({ name: 'QInput' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'QTime' }).exists()).toBe(true);
      expect(
        wrapper
          .findAllComponents({ name: 'QIcon' })
          .some((icon) => icon.props('name') === 'o_access_time'),
      ).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('cover')).toBe(true);
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('transitionShow')).toBe('scale');
      expect(wrapper.findComponent({ name: 'QPopupProxy' }).props('transitionHide')).toBe('scale');
      expect(
        wrapper
          .findAllComponents({ name: 'QBtn' })
          .some((button) => button.props('label') === 'Close'),
      ).toBe(true);
      expect(wrapper.findComponent({ name: 'QInput' }).props('mask')).toBe('##:##:##');
      expect(wrapper.findComponent({ name: 'QTime' }).props('format24h')).toBe(true);
      expect(wrapper.findComponent({ name: 'QTime' }).props('withSeconds')).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('emits a time from the Quasar time selection', async () => {
    const wrapper = mountTimePicker({
      props: {
        modelValue: '09:30:15',
      },
    });
    const picker = wrapper.findComponent({ name: 'QTime' });

    try {
      expect(picker.props('modelValue')).toBe('09:30:15');
      expect(wrapper.get('input').element.value).toBe('09:30:15');

      await picker.vm.$emit('update:modelValue', '11:20:00');
      expect(wrapper.emitted('update:modelValue')).toEqual([['11:20:00']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('allows typing times by default and can still be configured as read-only', async () => {
    const defaultWrapper = mountTimePicker();
    const readOnlyWrapper = mountTimePicker({
      props: {
        inputReadOnly: true,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'QInput' }).props('readonly')).toBe(false);
      expect(readOnlyWrapper.findComponent({ name: 'QInput' }).props('readonly')).toBe(true);

      await defaultWrapper
        .findComponent({ name: 'QInput' })
        .vm.$emit('update:modelValue', '11:20:00');
      expect(defaultWrapper.emitted('update:modelValue')).toEqual([['11:20:00']]);

      await defaultWrapper.findComponent({ name: 'QInput' }).vm.$emit('update:modelValue', '11:');
      await nextTick();

      expect(defaultWrapper.findComponent({ name: 'QInput' }).props('modelValue')).toBe('11:');
      expect(defaultWrapper.emitted('update:modelValue')).toEqual([['11:20:00']]);
    } finally {
      defaultWrapper.unmount();
      readOnlyWrapper.unmount();
    }
  });

  it('supports hours and minutes without seconds', () => {
    const wrapper = mountTimePicker({
      props: {
        format: 'HH:mm',
        modelValue: '09:30',
        valueFormat: 'HH:mm',
      },
    });

    try {
      expect(wrapper.findComponent({ name: 'QInput' }).props('mask')).toBe('##:##');
      expect(wrapper.findComponent({ name: 'QTime' }).props('mask')).toBe('HH:mm');
      expect(wrapper.findComponent({ name: 'QTime' }).props('withSeconds')).toBe(false);
      expect(wrapper.get('input').element.value).toBe('09:30');
    } finally {
      wrapper.unmount();
    }
  });

  it('only converts time tokens to numeric input mask placeholders', async () => {
    const wrapper = mountTimePicker({
      props: {
        format: 'HH giờ mm',
        modelValue: '09:30',
        valueFormat: 'HH:mm',
      },
    });

    try {
      expect(wrapper.findComponent({ name: 'QInput' }).props('mask')).toBe('## giờ ##');
      expect(wrapper.get('input').element.value).toBe('09 giờ 30');

      await wrapper.findComponent({ name: 'QInput' }).vm.$emit('update:modelValue', '11 giờ 20');

      expect(wrapper.emitted('update:modelValue')).toEqual([['11:20']]);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses shared Quasar picker field styles and keeps the time popup plain', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/shared/base-picker.css'),
      'utf8',
    );
    const timeCss = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/base-time-picker.css'),
      'utf8',
    );

    expect(css).toContain('background: var(--background-background-primary)');
    expect(css).toContain('border-bottom: var(--input-medium-border-width) solid transparent');
    expect(css).toContain('border-radius: var(--ds-radius-sm) var(--ds-radius-sm) 0 0');
    expect(css).toContain('color: var(--text-text-primary)');
    expect(css).toContain('font-size: var(--font-size-16px)');
    expect(css).toContain('.base-picker--focus .base-picker__control .q-field__label');
    expect(css).toContain('border-bottom: 2px solid var(--border-border-brand)');
    expect(css).toContain('.base-picker--error .base-picker__control .q-field__label');
    expect(css).not.toContain('#');
    expect(css).not.toContain('ant-picker');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('!important');

    expect(timeCss).toContain('@import');
    expect(timeCss).toContain('.base-time-picker__dropdown');
    expect(timeCss).toContain('--q-primary: var(--background-background-brand)');
    expect(timeCss).not.toContain('.q-field__control');
    expect(timeCss).not.toContain('#');
  });

  it('loads the outlined icon font in Storybook like BaseButton stories', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/BaseTimePicker.stories.ts'),
      'utf8',
    );

    expect(source).toContain('@quasar/extras/material-icons-outlined/material-icons-outlined.css');
    expect(source).not.toContain('layout:');
    expect(source).not.toContain('Horizontal');
    expect(source).not.toContain('FocusStyle');
  });

  it('does not keep Ant implementation details or private DOM synchronization', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/time-picker/BaseTimePicker.vue'),
      'utf8',
    );

    expect(source).not.toContain('ATimePicker');
    expect(source).not.toContain('ant-design-vue');
    expect(source).not.toContain('syncInputAccessibility');
    expect(source).not.toContain('setOptionalAttribute');
    expect(source).not.toContain("querySelector('input')");
  });
});
