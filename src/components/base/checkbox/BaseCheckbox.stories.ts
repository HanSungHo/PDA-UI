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

export const FocusedUnchecked: Story = {
  args: { autofocus: true },
};

export const FocusedChecked: Story = {
  args: { autofocus: true, modelValue: true },
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
      const unchecked = ref(false);
      const checked = ref(true);
      return { checked, unchecked };
    },
    template: `
      <main class="checkbox-design-page">
        <section class="checkbox-design-hero">
          <p class="checkbox-design-breadcrumb">Base Component <span aria-hidden="true">→</span> Checkbox</p>
          <h1>Checkbox</h1>
        </section>

        <section class="checkbox-design-content">
          <BaseCheckbox v-model="unchecked" label="Checkbox Text" />

          <div class="checkbox-design-states" aria-label="Checkbox states">
            <BaseCheckbox v-model="unchecked" aria-label="Unchecked focused" autofocus />
            <BaseCheckbox :model-value="true" aria-label="Checked disabled" disabled />
            <BaseCheckbox :model-value="true" aria-label="Checked default" />
            <BaseCheckbox :model-value="checked" aria-label="Checked focused" autofocus />
            <BaseCheckbox :model-value="false" aria-label="Unchecked default" />
            <BaseCheckbox :model-value="false" aria-label="Unchecked disabled" disabled />
          </div>
        </section>
      </main>
    `,
  }),
};
