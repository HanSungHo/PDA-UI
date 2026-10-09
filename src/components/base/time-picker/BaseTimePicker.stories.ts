import '@quasar/extras/material-icons-outlined/material-icons-outlined.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseTimePicker from './BaseTimePicker.vue';

const meta = {
  title: 'Base Components/Time Picker',
  component: BaseTimePicker,
  argTypes: {
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

export const Playground: Story = {};

export const Filled: Story = {
  args: {
    modelValue: '09:30:15',
  },
};

export const HoursMinutes: Story = {
  args: {
    format: 'HH:mm',
    modelValue: '09:30',
    valueFormat: 'HH:mm',
  },
};

export const HoursMinutesSeconds: Story = {
  args: {
    format: 'HH:mm:ss',
    modelValue: '09:30:15',
    valueFormat: 'HH:mm:ss',
  },
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
