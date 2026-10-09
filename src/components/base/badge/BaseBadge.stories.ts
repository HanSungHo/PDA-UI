import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

import BaseBadge from './BaseBadge.vue';

const meta = {
  title: 'Base Components/Badge',
  component: BaseBadge,
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['blue', 'red', 'green', 'yellow', 'cyan', 'neutral', 'brand'],
    },
  },
  args: {
    ariaLabel: undefined,
    color: 'blue',
    label: 'TEXT',
  },
} satisfies Meta<typeof BaseBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LabelOnly: Story = {};

export const Colors: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 20px; padding: 20px">
        <BaseBadge color="blue" label="TEXT" />
        <BaseBadge color="red" label="TEXT" />
        <BaseBadge color="green" label="TEXT" />
        <BaseBadge color="yellow" label="TEXT" />
        <BaseBadge color="cyan" label="TEXT" />
        <BaseBadge color="neutral" label="TEXT" />
        <BaseBadge color="brand" label="TEXT" />
      </div>
    `,
  }),
};

export const WithDefaultSlot: Story = {
  args: {
    label: 'Ignored',
  },
  render: (args) => ({
    components: { BaseBadge },
    setup() {
      return { args };
    },
    template: '<BaseBadge v-bind="args">CUSTOM SLOT</BaseBadge>',
  }),
};

export const WithIcon: Story = {
  args: {
    color: 'green',
    label: 'ACTIVE',
  },
  render: (args) => ({
    components: { BaseBadge, CheckCircleOutlined },
    setup() {
      return { args };
    },
    template: `
      <BaseBadge v-bind="args">
        <template #icon>
          <CheckCircleOutlined />
        </template>
      </BaseBadge>
    `,
  }),
};

export const WithSuffix: Story = {
  args: {
    color: 'red',
    label: 'FAILED',
  },
  render: (args) => ({
    components: { BaseBadge, CloseCircleOutlined },
    setup() {
      return { args };
    },
    template: `
      <BaseBadge v-bind="args">
        <template #suffix>
          <CloseCircleOutlined />
        </template>
      </BaseBadge>
    `,
  }),
};
