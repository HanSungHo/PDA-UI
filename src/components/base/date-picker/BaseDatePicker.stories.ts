import '@quasar/extras/material-icons-outlined/material-icons-outlined.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseDatePicker from './BaseDatePicker.vue';

const meta = {
  title: 'Base Components/Date Picker',
  component: BaseDatePicker,
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['single', 'range'],
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
    mode: 'single',
    modelValue: null,
    placeholder: 'Select Date',
    required: false,
    size: 'medium',
  },
  render: (args) => ({
    components: { BaseDatePicker },
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
        <BaseDatePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseDatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Filled: Story = {
  args: {
    modelValue: '2026-08-27',
  },
};

export const Range: Story = {
  args: {
    mode: 'range',
    modelValue: null,
  },
};

export const FilledRange: Story = {
  args: {
    mode: 'range',
    modelValue: {
      from: '2026-08-01',
      to: '2026-08-27',
    },
  },
};

export const WithTime: Story = {
  args: {
    format: 'MM/DD/YYYY HH:mm',
    modelValue: '2026-08-27 13:30',
    valueFormat: 'YYYY-MM-DD HH:mm',
    withTime: true,
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
