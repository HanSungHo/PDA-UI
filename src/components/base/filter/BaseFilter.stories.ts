import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import type { BaseFilterItem } from './base-filter.types';
import BaseFilter from './BaseFilter.vue';

const sampleFilters: BaseFilterItem[] = [
  { id: 'status', key: 'Status', value: 'DEPLOYED' },
  { id: 'version', key: 'Version', value: 'All' },
  { id: 'tags', key: 'Tags', value: 'All' },
];

const meta = {
  title: 'Base Components/Filter',
  component: BaseFilter,
  args: {
    addLabel: 'Add filter',
    addable: true,
    ariaLabel: 'Active filters',
    clearLabel: 'Clear all',
    clearable: true,
    disabled: false,
    loading: false,
    modelValue: sampleFilters,
    readonly: false,
    size: 'small',
  },
  render: (args) => ({
    components: { BaseFilter },
    setup() {
      const value = ref<BaseFilterItem[]>([...(args.modelValue ?? [])]);
      let addedFilterIndex = 0;

      function addFilter(): void {
        addedFilterIndex += 1;
        value.value = [
          ...value.value,
          {
            id: `demo-${addedFilterIndex}`,
            key: 'Demo',
            value: addedFilterIndex,
          },
        ];
      }

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = [...(nextValue ?? [])];
        },
      );
      return { addFilter, args, value };
    },
    template: `
      <BaseFilter
        v-bind="{ ...args, modelValue: value }"
        @update:model-value="value = $event"
        @add="addFilter"
      />
    `,
  }),
} satisfies Meta<typeof BaseFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Readonly: Story = {
  args: { readonly: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Empty: Story = {
  args: { modelValue: [] },
};
