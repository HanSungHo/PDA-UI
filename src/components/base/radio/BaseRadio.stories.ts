import './base-radio.stories.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseRadio from './BaseRadio.vue';
import BaseRadioGroup from './BaseRadioGroup.vue';

const options = [
  { label: 'Checkbox Text', value: 'first' },
  { label: 'Checkbox Text', value: 'second' },
  { label: 'Checkbox Text', value: 'third' },
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

export const Error: Story = {
  args: { errorMessage: 'Please choose one option.' },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseRadio, BaseRadioGroup },
    setup() {
      const value = ref('first');
      const unchecked = ref(false);
      const checked = ref(true);
      return { checked, value, unchecked, options };
    },
    template: `
      <main class="radio-design-page">
        <section class="radio-design-hero">
          <p class="radio-design-breadcrumb">Base Component <span aria-hidden="true">→</span> Radio</p>
          <h1>Radio</h1>
        </section>

        <section class="radio-design-content">
          <BaseRadio v-model="unchecked" label="Checkbox Text" />

          <div class="radio-design-states" aria-label="Radio states">
            <BaseRadio aria-label="Unchecked focused" autofocus />
            <BaseRadio :model-value="true" aria-label="Checked disabled" disabled />
            <BaseRadio :model-value="true" aria-label="Checked default" />
            <BaseRadio v-model="checked" aria-label="Checked focused" autofocus />
            <BaseRadio :model-value="false" aria-label="Unchecked default" />
            <BaseRadio :model-value="false" aria-label="Unchecked disabled" disabled />
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
