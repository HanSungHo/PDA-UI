import type { Meta, StoryObj } from '@storybook/vue3-vite';

import BaseLoading from './BaseLoading.vue';

const meta = {
  title: 'Base Components/Loading',
  component: BaseLoading,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['large', 'medium', 'small', 'xs'],
    },
  },
  args: {
    size: 'medium',
  },
} satisfies Meta<typeof BaseLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllSizes: Story = {
  render: () => ({
    components: { BaseLoading },
    template: `
      <div style="display: flex; flex-direction: column; gap: 32px; padding: 40px; font-family: sans-serif;">
        <!-- Large -->
        <div style="display: flex; align-items: center; gap: 40px;">
          <div style="width: 100px; text-align: right;">
            <div style="font-weight: 600; font-size: 16px; color: var(--ds-color-neutral-900);">Large</div>
            <div style="font-size: 13px; color: var(--ds-color-neutral-500);">40px</div>
          </div>
          <div style="display: flex; align-items: center; gap: 48px;">
            <BaseLoading size="large" />
          </div>
        </div>

        <!-- Medium -->
        <div style="display: flex; align-items: center; gap: 40px;">
          <div style="width: 100px; text-align: right;">
            <div style="font-weight: 600; font-size: 16px; color: var(--ds-color-neutral-900);">Medium</div>
            <div style="font-size: 13px; color: var(--ds-color-neutral-500);">32px</div>
          </div>
          <div style="display: flex; align-items: center; gap: 48px;">
            <BaseLoading size="medium" />
          </div>
        </div>

        <!-- Small -->
        <div style="display: flex; align-items: center; gap: 40px;">
          <div style="width: 100px; text-align: right;">
            <div style="font-weight: 600; font-size: 16px; color: var(--ds-color-neutral-900);">Small</div>
            <div style="font-size: 13px; color: var(--ds-color-neutral-500);">20px</div>
          </div>
          <div style="display: flex; align-items: center; gap: 48px;">
            <BaseLoading size="small" />
          </div>
        </div>

        <!-- ExtraSmall -->
        <div style="display: flex; align-items: center; gap: 40px;">
          <div style="width: 100px; text-align: right;">
            <div style="font-weight: 600; font-size: 16px; color: var(--ds-color-neutral-900);">ExtraSmall</div>
            <div style="font-size: 13px; color: var(--ds-color-neutral-500);">16px</div>
          </div>
          <div style="display: flex; align-items: center; gap: 48px;">
            <BaseLoading size="xs" />
          </div>
        </div>
      </div>
    `,
  }),
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'xs',
  },
};
