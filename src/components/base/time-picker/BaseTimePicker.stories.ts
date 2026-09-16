import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, onMounted, ref, watch } from 'vue';

import BaseTimePicker from './BaseTimePicker.vue';

const meta = {
  title: 'Base Components/Time Picker',
  component: BaseTimePicker,
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
    placeholder: 'Select Time',
    required: false,
    size: 'medium',
  },
  render: (args) => ({
    components: { BaseTimePicker },
    setup() {
      const value = ref(args.modelValue);

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue;
        },
      );

      return { args, value };
    },
    template: `
      <div style="width: 280px">
        <BaseTimePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseTimePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
  },
  render: (args) => ({
    components: { BaseTimePicker },
    setup() {
      const value = ref(args.modelValue);

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue;
        },
      );

      return { args, value };
    },
    template: `
      <div style="width: 360px">
        <BaseTimePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: {
    modelValue: '09:30:15',
  },
};

export const HoursMinutesSeconds: Story = {
  args: {
    format: 'HH:mm:ss',
    modelValue: '09:30:15',
    valueFormat: 'HH:mm:ss',
  },
};

export const FocusStyle: Story = {
  render: (args) => ({
    components: { BaseTimePicker },
    setup() {
      const container = ref<HTMLElement | null>(null);
      const value = ref(args.modelValue);

      onMounted(async () => {
        await nextTick();
        container.value?.querySelector('input')?.focus();
      });

      return { args, container, value };
    },
    template: `
      <div ref="container" style="width: 280px">
        <BaseTimePicker
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
