import '@quasar/extras/material-icons-outlined/material-icons-outlined.css';

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { QIcon } from 'quasar';

import type { BaseButtonProps, BaseButtonSize, BaseButtonVariant } from './base-button.types';
import BaseButton from './BaseButton.vue';

const variants: BaseButtonVariant[] = ['primary', 'secondary', 'tertiary', 'link', 'neutro'];
const sizes: BaseButtonSize[] = ['large', 'medium', 'small', 'xs'];

const meta = {
  title: 'Base Components/Button',
  component: BaseButton as unknown as Meta<BaseButtonProps>['component'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: variants,
    },
    size: {
      control: 'inline-radio',
      options: sizes,
    },
    htmlType: {
      control: 'inline-radio',
      options: ['button', 'submit', 'reset'],
    },
    target: {
      control: 'inline-radio',
      options: [undefined, '_self', '_blank'],
    },
  },
  args: {
    ariaLabel: undefined,
    block: false,
    disabled: false,
    href: undefined,
    htmlType: 'button',
    iconOnly: false,
    label: 'Button',
    loading: false,
    size: 'medium',
    target: undefined,
    variant: 'primary',
  },
  render: (args: BaseButtonProps) => ({
    components: { BaseButton },
    setup() {
      return { args };
    },
    template: '<BaseButton v-bind="args" />',
  }),
} satisfies Meta<BaseButtonProps>;

export default meta;

type Story = StoryObj<BaseButtonProps>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => ({
    components: { BaseButton },
    setup() {
      return { variants };
    },
    template: `
      <div style="display: flex; align-items: center; gap: 16px; padding: 24px;">
        <BaseButton
          v-for="variant in variants"
          :key="variant"
          :variant="variant"
          label="Button"
        />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { BaseButton },
    setup() {
      return { sizes };
    },
    template: `
      <div style="display: flex; align-items: center; gap: 16px; padding: 24px;">
        <BaseButton
          v-for="size in sizes"
          :key="size"
          :size="size"
          label="Button"
        />
      </div>
    `,
  }),
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

export const IconOnly: Story = {
  args: {
    ariaLabel: 'Search',
    iconOnly: true,
  },
  render: (args: BaseButtonProps) => ({
    components: { BaseButton, QIcon },
    setup() {
      return { args };
    },
    template: `
      <BaseButton v-bind="args">
        <QIcon name="o_search" />
      </BaseButton>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    components: { BaseButton, QIcon },
    template: `
      <div style="display: flex; align-items: center; gap: 16px; padding: 24px;">
        <BaseButton label="Confirm">
          <template #icon>
            <QIcon name="o_check_circle" />
          </template>
        </BaseButton>
        <BaseButton label="Cancel" variant="secondary">
          <template #suffix>
            <QIcon name="o_cancel" />
          </template>
        </BaseButton>
      </div>
    `,
  }),
};

export const Block: Story = {
  args: {
    block: true,
    label: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
  render: (args: BaseButtonProps) => ({
    components: { BaseButton },
    setup() {
      return { args };
    },
    template: '<div style="width: 360px;"><BaseButton v-bind="args" /></div>',
  }),
};
