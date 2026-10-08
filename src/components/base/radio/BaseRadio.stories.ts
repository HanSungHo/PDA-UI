import './base-radio.stories.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseRadio from './BaseRadio.vue';
import BaseRadioGroup from './BaseRadioGroup.vue';

const options = [
  { label: 'Option A', value: 'first' },
  { label: 'Option B', value: 'second' },
  { label: 'Option C', value: 'third' },
];

const meta = {
  title: 'Base Components/Radio',
  component: BaseRadioGroup,
  args: {
    ariaLabel: 'Radio group',
    block: false,
    disabled: false,
    error: false,
    label: 'Label text',
    layout: 'vertical',
    loading: false,
    modelValue: 'first',
    options,
    readonly: false,
    required: false,
    status: 'default',
  },
  render: (args) => ({
    components: { BaseRadioGroup },
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
      <BaseRadioGroup
        v-bind="{ ...args, modelValue: value }"
        @update:model-value="value = $event"
      />
    `,
  }),
} satisfies Meta<typeof BaseRadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const HorizontalLabel: Story = {
  args: { layout: 'horizontal' },
};

export const Readonly: Story = {
  args: { readonly: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const FocusedUnchecked: Story = {
  render: () => ({
    components: { BaseRadio },
    template: '<BaseRadio aria-label="Unchecked" autofocus />',
  }),
};

export const FocusedChecked: Story = {
  render: () => ({
    components: { BaseRadio },
    template: '<BaseRadio aria-label="Checked" :model-value="true" autofocus />',
  }),
};

export const Checked: Story = {
  args: { modelValue: 'first' },
};

export const Unchecked: Story = {
  args: { modelValue: undefined },
};

export const Error: Story = {
  args: { errorMessage: 'Please choose one option.' },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseRadio, BaseRadioGroup },
    setup() {
      const value = ref('first');
      const unchecked = ref(false);
      return { value, unchecked, options };
    },
    template: `
      <main class="radio-design-page">
        <section class="radio-design-hero">
          <p class="radio-design-breadcrumb">Base Component <span aria-hidden="true">→</span> Radio</p>
          <h1>Radio</h1>
        </section>

        <section class="radio-design-content">
          <BaseRadio v-model="unchecked" label="Radio Text" />

          <div class="radio-design-states" aria-label="Radio states">
            <BaseRadio aria-label="Unchecked default" />
            <BaseRadio aria-label="Unchecked focused" />
            <BaseRadio :model-value="false" aria-label="Unchecked disabled" disabled />
            <BaseRadio :model-value="true" aria-label="Checked default" />
            <BaseRadio :model-value="true" aria-label="Checked focused" />
            <BaseRadio :model-value="true" aria-label="Checked disabled" disabled />
          </div>

          <div class="radio-design-groups">
            <BaseRadioGroup v-model="value" label="Label text" :options="options" />
            <BaseRadioGroup
              v-model="value"
              label="Label text"
              layout="horizontal"
              :options="options.slice(0, 2)"
            />
          </div>
        </section>
      </main>
    `,
  }),
  parameters: { layout: 'fullscreen' },
};
