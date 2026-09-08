import type { Meta, StoryObj } from '@storybook/vue3-vite';

import type { BaseBreadcrumbItem } from './base-breadcrumb.types';
import BaseBreadcrumb from './BaseBreadcrumb.vue';

const items: BaseBreadcrumbItem[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Settings', to: '/settings' },
  { label: 'Profile' },
];

const meta = {
  title: 'Base Components/Breadcrumb',
  component: BaseBreadcrumb,
  argTypes: {
    items: { control: false },
    showHomeIcon: { control: 'boolean' },
    separator: { control: 'text' },
    ariaLabel: { control: 'text' },
  },
  args: {
    ariaLabel: 'Breadcrumb',
    items,
    separator: '/',
    showHomeIcon: true,
  },
  render: (args) => ({
    components: { BaseBreadcrumb },
    setup() {
      return { args };
    },
    template: `
      <BaseBreadcrumb v-bind="args" />
    `,
  }),
} satisfies Meta<typeof BaseBreadcrumb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithoutHomeIcon: Story = {
  args: {
    showHomeIcon: false,
  },
};

export const CustomSeparator: Story = {
  args: {
    separator: '>',
  },
};

export const DisabledItem: Story = {
  args: {
    items: [
      { label: 'Dashboard', to: '/' },
      { label: 'Settings', disabled: true },
      { label: 'Profile' },
    ],
  },
};
