import type { Meta, StoryObj } from '@storybook/vue3-vite';

import BaseStepProgress from './BaseStepProgress.vue';

const sampleHorizontalItems = [
  { label: 'Loading', status: 'loading' as const },
  { label: 'Success', status: 'success' as const },
  { label: 'Error', status: 'error' as const },
  { label: 'Warning', status: 'warning' as const },
  { label: 'Pending', status: 'pending' as const },
];

const sampleVerticalItems = [
  { label: 'Label', status: 'pending' as const },
  { label: 'Label', status: 'loading' as const },
  { label: 'Label', status: 'success' as const },
  { label: 'Label', status: 'warning' as const },
  { label: 'Label', status: 'error' as const },
];

const meta = {
  title: 'Base Components/Step Progress',
  component: BaseStepProgress,
  argTypes: {
    direction: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    direction: 'horizontal',
    items: sampleHorizontalItems,
  },
} satisfies Meta<typeof BaseStepProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllInOne: Story = {
  render: () => ({
    components: { BaseStepProgress },
    setup() {
      return { sampleVerticalItems, sampleHorizontalItems };
    },
    template: `
      <div style="display: flex; align-items: center; gap: 80px; padding: 60px; justify-content: center; background: #ffffff;">
        <!-- Left: Vertical States in Dashed Border (matching mockup) -->
        <div style="border: 1.5px dashed #a855f7; border-radius: 16px; padding: 32px 24px; width: 100px;">
          <BaseStepProgress
            direction="vertical"
            :items="sampleVerticalItems"
          />
        </div>

        <!-- Right: Horizontal Flow with Connectors (matching mockup) -->
        <div style="width: 440px;">
          <BaseStepProgress
            direction="horizontal"
            :items="sampleHorizontalItems"
          />
        </div>
      </div>
    `,
  }),
};

export const Horizontal: Story = {
  args: {
    direction: 'horizontal',
    items: sampleHorizontalItems,
  },
  render: (args) => ({
    components: { BaseStepProgress },
    setup() {
      return { args };
    },
    template: `
      <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
        <BaseStepProgress v-bind="args" />
      </div>
    `,
  }),
};
