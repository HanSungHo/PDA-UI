import '@quasar/extras/material-icons/material-icons.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseDropdownList from './BaseDropdownList.vue';

const options = [
  { label: 'Menu item', value: 'menu-item-1' },
  { label: 'Menu item', value: 'menu-item-2' },
  { label: 'Menu item', value: 'menu-item-3' },
  { label: 'Menu item', value: 'menu-item-4' },
  { label: 'Menu item', value: 'menu-item-5' },
];

const meta = {
  title: 'Base Components/Dropdown List',
  component: BaseDropdownList,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    status: {
      control: 'inline-radio',
      options: ['default', 'success', 'warning', 'error'],
    },
  },
  args: {
    options,
    placeholder: 'Placeholder',
    label: 'Label text',
    modelValue: undefined,
  },
  render: (args) => ({
    components: { BaseDropdownList },
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
      <div style="width: 312px; min-height: 220px; padding: 16px">
        <BaseDropdownList
          v-bind="{ ...args, modelValue }"
          @update:model-value="modelValue = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseDropdownList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExternalLabel: Story = {
  args: { label: 'Label text', placeholder: 'Placeholder' },
};

export const Unlabeled: Story = { args: { label: undefined } };
export const Small: Story = { args: { size: 'small' } };
export const SmallFocused: Story = { args: { size: 'small', autofocus: true } };
export const SmallError: Story = { args: { size: 'small', errorMessage: 'Choose an option' } };
export const SmallDisabled: Story = { args: { size: 'small', disabled: true } };
export const Large: Story = { args: { size: 'large' } };

export const Selected: Story = {
  args: {
    modelValue: 'menu-item-1',
  },
};

export const Focused: Story = {
  args: {
    autofocus: true,
  },
};

export const Success: Story = {
  args: {
    status: 'success',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
  },
};

export const Required: Story = {
  args: {
    label: 'Required',
    required: true,
  },
};

export const FilledReference: Story = {
  args: {
    label: 'Filled',
    modelValue: 'google',
    options: [
      { label: 'Google', value: 'google' },
      { label: 'Facebook', value: 'facebook' },
      { label: 'Twitter', value: 'twitter' },
      { label: 'Apple', value: 'apple' },
      { label: 'Oracle', value: 'oracle' },
    ],
    placeholder: undefined,
  },
};

export const Searchable: Story = {
  args: {
    options: [
      { label: 'Process 100', value: 'process-100' },
      { label: 'Process 120', value: 'process-120' },
      { label: 'Recipe A', value: 'recipe-a' },
      { label: 'Recipe B', value: 'recipe-b' },
    ],
    searchable: true,
  },
};

export const Multiple: Story = {
  args: {
    multiple: true,
    modelValue: ['menu-item-1', 'menu-item-3'],
  },
};

export const Readonly: Story = {
  args: {
    modelValue: 'menu-item-1',
    readonly: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Clearable: Story = {
  args: {
    clearable: true,
    modelValue: 'menu-item-2',
    placeholder: 'Select a menu item',
  },
};

export const Error: Story = {
  args: {
    errorMessage: 'Choose a menu item',
    status: 'error',
  },
};
