import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import type { BaseTabItem, BaseTabSize, BaseTabValue } from './base-tab.types';
import BaseTab from './BaseTab.vue';

const items: BaseTabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
  { key: 'locked', label: 'Locked', disabled: true },
];

const meta = {
  title: 'Base Components/Tab',
  component: BaseTab,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    modelValue: {
      control: 'select',
      options: ['overview', 'details', 'locked'],
    },
    items: { control: false },
  },
  args: {
    ariaLabel: 'Content sections',
    items,
    modelValue: 'overview',
    size: 'medium',
  },
  render: (args) => ({
    components: { BaseTab },
    setup() {
      const value = ref<BaseTabValue>(args.modelValue ?? 'overview');

      watch(
        () => args.modelValue,
        (nextValue) => {
          if (nextValue !== undefined) {
            value.value = nextValue;
          }
        },
      );

      return { args, value };
    },
    template: `
      <BaseTab
        v-bind="{ ...args, modelValue: value }"
        @update:model-value="value = $event"
      >
        <template #default="{ value: activeValue }">
          {{ activeValue === 'overview' ? 'Overview content.' : 'Details content.' }}
        </template>
      </BaseTab>
    `,
  }),
} satisfies Meta<typeof BaseTab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => ({
    components: { BaseTab },
    setup() {
      const values = ref<Record<BaseTabSize, BaseTabValue>>({
        small: 'overview',
        medium: 'overview',
        large: 'overview',
      });
      return { items, values };
    },
    template: `
      <div style="display: grid; gap: 24px">
        <BaseTab v-model="values.small" :items="items" size="small" aria-label="Small tabs">
          <template #default="{ value }">{{ value }} content.</template>
        </BaseTab>
        <BaseTab v-model="values.medium" :items="items" size="medium" aria-label="Medium tabs">
          <template #default="{ value }">{{ value }} content.</template>
        </BaseTab>
        <BaseTab v-model="values.large" :items="items" size="large" aria-label="Large tabs">
          <template #default="{ value }">{{ value }} content.</template>
        </BaseTab>
      </div>
    `,
  }),
};

export const DisabledItem: Story = {
  args: {
    modelValue: 'details',
  },
};
