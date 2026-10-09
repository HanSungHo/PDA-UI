import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { BaseButton } from '../button';
import BaseToast from './BaseToast.vue';

const message = '토스트 메시지의 설명';

const meta = {
  title: 'Base Components/Toast',
  component: BaseToast,
  argTypes: {
    closable: { control: 'boolean' },
    description: { control: 'text' },
    duration: { control: 'number' },
    title: { control: 'text' },
    type: {
      control: 'inline-radio',
      options: ['success', 'error', 'info', 'warning'],
    },
  },
  args: {
    closable: true,
    description: message,
    duration: 0,
    title: '',
    type: 'success',
  },
} satisfies Meta<typeof BaseToast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => ({
    components: { BaseToast },
    setup() {
      const types = ['warning', 'info', 'error', 'success'] as const;
      return { message, types };
    },
    template: `
      <div style="position: fixed; inset: 0; background: #fff;" aria-hidden="true"></div>
      <template v-for="type in types" :key="type">
        <BaseToast
          :type="type"
          :description="message"
          :duration="0"
        />
      </template>
    `,
  }),
};

export const AutoClose: Story = {
  render: () => ({
    components: { BaseToast, BaseButton },
    setup() {
      const visible = ref(false);

      function showToast() {
        visible.value = true;
      }

      function handleClose() {
        visible.value = false;
      }

      return { visible, showToast, handleClose, message };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
        <BaseButton variant="primary" @click="showToast">Show toast (3s)</BaseButton>
        <BaseToast
          v-if="visible"
          type="success"
          :description="message"
          :duration="3000"
          @close="handleClose"
        />
      </div>
    `,
  }),
};

export const Success: Story = { args: { type: 'success' } };
export const Error: Story = {
  args: {
    type: 'error',
    duration: 0,
  },
};
export const Info: Story = { args: { type: 'info' } };
export const Warning: Story = { args: { type: 'warning' } };
export const WithTitle: Story = {
  args: { title: 'Toast title', description: 'Additional detail', duration: 0 },
};
export const NonClosable: Story = {
  args: { type: 'info', closable: false, duration: 0 },
};
