import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import { BaseButton } from '../button';
import BaseToast from './BaseToast.vue';

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
    description: '토스트 메시지의 설명',
    duration: 3000,
    title: '토스트 메시지',
    type: 'success',
  },
} satisfies Meta<typeof BaseToast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => ({
    components: { BaseToast },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; width: 320px;">
        <BaseToast
          type="success"
          title="토스트 메시지"
          description="토스트 메시지의 설명"
          :duration="0"
        />
        <BaseToast
          type="error"
          title="토스트 메시지"
          description="토스트 메시지의 설명"
          :duration="0"
        />
        <BaseToast
          type="info"
          title="토스트 메시지"
          description="토스트 메시지의 설명"
          :duration="0"
        />
        <BaseToast
          type="warning"
          title="토스트 메시지"
          description="토스트 메시지의 설명"
          :duration="0"
        />
      </div>
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

      return { visible, showToast, handleClose };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
        <BaseButton variant="primary" @click="showToast">
          Show Auto-Close Toast (3s)
        </BaseButton>
        <BaseToast
          v-if="visible"
          type="success"
          title="Auto-Close Toast"
          description="This toast will automatically disappear in 3 seconds (pauses on hover)."
          :duration="3000"
          @close="handleClose"
        />
      </div>
    `,
  }),
};

export const Success: Story = {
  args: {
    type: 'success',
    title: '토스트 메시지',
    description: '토스트 메시지의 설명',
    duration: 0,
  },
};

export const Error: Story = {
  args: {
    type: 'error',
    title: '토스트 메시지',
    description: '토스트 메시지의 설명',
    duration: 0,
  },
};

export const Info: Story = {
  args: {
    type: 'info',
    title: '토스트 메시지',
    description: '토스트 메시지의 설명',
    duration: 0,
  },
};

export const Warning: Story = {
  args: {
    type: 'warning',
    title: '토스트 메시지',
    description: '토스트 메시지의 설명',
    duration: 0,
  },
};

export const WithoutDescription: Story = {
  args: {
    type: 'success',
    title: '토스트 메시지',
    description: '',
    duration: 0,
  },
};

export const NonClosable: Story = {
  args: {
    type: 'info',
    title: '토스트 메시지',
    description: '토스트 메시지의 설명',
    closable: false,
    duration: 3000,
  },
};
