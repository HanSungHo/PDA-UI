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
    tone: {
      control: 'select',
      options: [
        'default',
        'brand',
        'success',
        'warning',
        'warning-subtle',
        'error',
        'error-text',
        'inactive',
        'modified',
        'muted',
      ],
    },
    fontWeight: {
      control: 'inline-radio',
      options: ['regular', 'bold'],
    },
    truncate: { control: 'boolean' },
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

export const Filled: Story = { args: { modelValue: 'Filled' } };
export const Readonly: Story = { args: { readonly: true, modelValue: 'Read only' } };
export const Loading: Story = { args: { loading: true } };
export const Success: Story = { args: { status: 'success' } };
export const Warning: Story = { args: { status: 'warning' } };
export const SemanticTone: Story = { args: { tone: 'brand', modelValue: 'RUN' } };
export const ErrorTextTone: Story = { args: { tone: 'error-text', modelValue: 'Invalid value' } };
export const IdleState: Story = {
  args: {
    tone: 'inactive',
    fontWeight: 'bold',
    truncate: true,
    modelValue: 'IDLE Port Status with a long machine description that should end with an ellipsis',
  },
};
export const BoldTruncated: Story = {
  args: { fontWeight: 'bold', truncate: true, modelValue: 'A long value that is truncated' },
};
export const Horizontal: Story = { args: { layout: 'horizontal' } };
export const Small: Story = { args: { size: 'small' } };
export const Large: Story = { args: { size: 'large' } };
export const Clearable: Story = { args: { clearable: true, modelValue: 'Filled' } };

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
    modelValue: '',
  },
};

export const TextareaFilled: Story = { args: { mode: 'textarea', modelValue: 'Line 1\nLine 2' } };
export const TextareaError: Story = {
  args: { mode: 'textarea', status: 'error', errorMessage: 'Helper Text' },
};
export const TextareaDisabled: Story = { args: { mode: 'textarea', disabled: true } };
export const TextareaReadonly: Story = {
  args: { mode: 'textarea', readonly: true, modelValue: 'Read only' },
};
export const TextareaResizable: Story = { args: { mode: 'textarea', resize: 'vertical' } };
export const TextareaCount: Story = {
  args: { mode: 'textarea', rows: 5, maxLength: 50, showCount: true, modelValue: 'Hello' },
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
