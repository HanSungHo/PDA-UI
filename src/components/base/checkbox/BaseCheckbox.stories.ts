import './base-checkbox.stories.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseCheckbox from './BaseCheckbox.vue';

const meta = {
  title: 'Base Components/Checkbox',
  component: BaseCheckbox,
  args: {
    ariaLabel: 'Checkbox',
    autofocus: false,
    block: false,
    disabled: false,
    error: false,
    label: 'Checkbox Text',
    loading: false,
    modelValue: false,
    readonly: false,
    required: false,
    status: 'default',
  },
  render: (args) => ({
    components: { BaseCheckbox },
    setup() {
      const checked = ref(args.modelValue);

      watch(
        () => args.modelValue,
        (nextValue) => {
          checked.value = nextValue;
        },
      );

      return { args, checked };
    },
    template: `
      <BaseCheckbox
        v-bind="{ ...args, modelValue: checked }"
        @update:model-value="checked = $event"
      />
    `,
  }),
} satisfies Meta<typeof BaseCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Checked: Story = {
  args: { modelValue: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true },
};

export const FocusedUnchecked: Story = {
  args: { autofocus: true },
};

export const FocusedChecked: Story = {
  args: { autofocus: true, modelValue: true },
};

export const FocusedIndeterminate: Story = {
  args: { autofocus: true, indeterminate: true },
};

export const Readonly: Story = {
  args: { modelValue: true, readonly: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Error: Story = {
  args: { errorMessage: 'Please confirm this option.' },
};

export const DesignStates: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      const checked = ref(true);
      const mixed = ref(false);
      return { checked, mixed };
    },
    template: `
      <main class="checkbox-design-page">
        <section class="checkbox-design-hero">
          <p class="checkbox-design-breadcrumb">Base Component <span aria-hidden="true">→</span> Checkbox</p>
          <h1>Checkbox</h1>
        </section>

        <section class="checkbox-design-content">
          <BaseCheckbox label="Checkbox Text" />

          <div class="checkbox-design-states" aria-label="Checkbox states">
            <BaseCheckbox :model-value="false" aria-label="Unchecked default" />
            <BaseCheckbox :model-value="false" aria-label="Unchecked focused" />
            <BaseCheckbox :model-value="false" aria-label="Unchecked disabled" disabled />
            <BaseCheckbox :model-value="true" aria-label="Checked default" />
            <BaseCheckbox :model-value="true" aria-label="Checked focused" />
            <BaseCheckbox :model-value="true" aria-label="Checked disabled" disabled />
            <BaseCheckbox v-model="mixed" :indeterminate="true" aria-label="Indeterminate default" />
            <BaseCheckbox :indeterminate="true" aria-label="Indeterminate focused" />
            <BaseCheckbox :indeterminate="true" aria-label="Indeterminate disabled" disabled />
          </div>
        </section>
      </main>
    `,
  }),
};
