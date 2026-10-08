import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseInput from './BaseInput.vue';

const meta = {
  title: 'Base Components/Input',
  component: BaseInput,
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['input', 'textarea'],
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'search', 'tel', 'url'],
    },
    status: {
      control: 'inline-radio',
      options: ['default', 'success', 'warning', 'error'],
    },
  },
  args: {
    label: 'Label text',
    placeholder: 'Placeholder',
    hint: 'Helper Text',
    modelValue: '',
  },
  render: (args) => ({
    components: { BaseInput },
    setup() {
      const modelValue = ref(args.modelValue);

      watch(
        () => args.modelValue,
        (value) => {
          modelValue.value = value;
        },
      );

      return { args, modelValue };
    },
    template: `
      <div style="width: 280px">
        <BaseInput
          v-bind="{ ...args, modelValue }"
          @update:model-value="modelValue = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const Password: Story = {
  args: {
    type: 'password',
  },
};

export const Numeric: Story = {
  args: {
    type: 'number',
    modelValue: 42,
  },
};

export const Textarea: Story = {
  args: {
    mode: 'textarea',
    rows: 5,
    modelValue: '',
    maxLength: 50,
    showCount: true,
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    errorMessage: 'Helper Text',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
