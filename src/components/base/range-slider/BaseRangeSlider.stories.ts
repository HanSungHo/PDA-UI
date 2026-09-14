import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseRangeSlider from './BaseRangeSlider.vue';

const meta = {
  title: 'Base Components/Range Slider',
  component: BaseRangeSlider,
  args: {
    ariaLabel: 'Replica count',
    block: true,
    disabled: false,
    error: false,
    hint: 'Helper Text',
    label: 'Replica Count',
    layout: 'vertical',
    loading: false,
    max: 100,
    min: 0,
    modelValue: 25,
    readonly: false,
    required: false,
    size: 'medium',
    status: 'default',
    step: 1,
  },
  render: (args) => ({
    components: { BaseRangeSlider },
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
      <div
        :style="{
          width:
            args.layout === 'horizontal'
              ? 'var(--ds-range-slider-demo-horizontal-width)'
              : 'var(--ds-range-slider-demo-vertical-width)',
        }"
      >
        <BaseRangeSlider
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseRangeSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Horizontal: Story = {
  args: { layout: 'horizontal' },
};

export const Readonly: Story = {
  args: { readonly: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Error: Story = {
  args: { errorMessage: 'Value must be within the allowed range.' },
};

export const DesignLayouts: Story = {
  render: () => ({
    components: { BaseRangeSlider },
    setup() {
      const horizontalValue = ref(25);
      const verticalValue = ref(25);
      return { horizontalValue, verticalValue };
    },
    template: `
      <div
        style="display: flex; flex-direction: column; gap: var(--ds-range-slider-demo-layout-gap)"
      >
        <div style="width: var(--ds-range-slider-demo-horizontal-width)">
          <BaseRangeSlider
            v-model="horizontalValue"
            hint="Helper Text"
            label="Replica Count"
            layout="horizontal"
          />
        </div>
        <div style="width: var(--ds-range-slider-demo-vertical-width)">
          <BaseRangeSlider
            v-model="verticalValue"
            hint="Helper Text"
            label="Replica Count"
          />
        </div>
      </div>
    `,
  }),
};
