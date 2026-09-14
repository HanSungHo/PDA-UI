import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, onMounted, ref, watch } from 'vue';

import BaseDatePicker from './BaseDatePicker.vue';

const meta = {
  title: 'Base Components/Date Picker',
  component: BaseDatePicker,
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

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
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
      <div style="width: 360px">
        <BaseDatePicker
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: {
    modelValue: '2026-08-27',
  },
};

export const FocusStyle: Story = {
  render: (args) => ({
    components: { BaseDatePicker },
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
        <BaseDatePicker
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
