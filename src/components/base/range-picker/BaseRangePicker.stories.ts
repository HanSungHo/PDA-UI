import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, onMounted, ref, watch } from 'vue';

import type { BaseRangePickerValue } from './base-range-picker.types';
import BaseRangePicker from './BaseRangePicker.vue';

const meta = {
  title: 'Base Components/Range Picker',
  component: BaseRangePicker,
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
    size: {
      control: 'inline-radio',
      options: ['medium', 'small'],
    },
  },
  args: {
    disabled: false,
    errorMessage: '',
    hint: 'Helper Text',
    label: 'Label text',
    layout: 'vertical',
    modelValue: null,
    placeholder: ['Select Date', 'Select Date'],
    required: false,
    size: 'medium',
  },
  render: (args) => ({
    components: { BaseRangePicker },
    setup() {
      const value = ref<BaseRangePickerValue>(args.modelValue ?? null);

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? null;
        },
      );

      return { args, value };
    },
    template: `
      <div style="width: 280px">
        <BaseRangePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseRangePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
  },
  render: (args) => ({
    components: { BaseRangePicker },
    setup() {
      const value = ref<BaseRangePickerValue>(args.modelValue ?? null);

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? null;
        },
      );

      return { args, value };
    },
    template: `
      <div style="width: 360px">
        <BaseRangePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: {
    modelValue: ['2026-08-01', '2026-08-27'],
  },
};

export const ShowTime: Story = {
  args: {
    format: 'MM/DD/YYYY HH:mm:ss',
    modelValue: ['2026-08-01 08:00:15', '2026-08-27 17:30:45'],
    showTime: {
      format: 'HH:mm:ss',
      showSecond: true,
    },
    valueFormat: 'YYYY-MM-DD HH:mm:ss',
  },
};

export const FocusStyle: Story = {
  render: (args) => ({
    components: { BaseRangePicker },
    setup() {
      const container = ref<HTMLElement | null>(null);
      const value = ref<BaseRangePickerValue>(args.modelValue ?? null);

      onMounted(async () => {
        await nextTick();
        container.value?.querySelector('input')?.focus();
      });

      return { args, container, value };
    },
    template: `
      <div ref="container" style="width: 280px">
        <BaseRangePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Error: Story = {
  args: {
    errorMessage: 'Helper Text',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};
