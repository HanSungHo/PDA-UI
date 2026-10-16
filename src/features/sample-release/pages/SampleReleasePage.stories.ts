import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { createPinia } from 'pinia';
import { getCurrentInstance } from 'vue';

import SampleReleasePage from './SampleReleasePage.vue';

const meta = {
  title: 'Features/Sample Release/Sample Release Page',
  component: SampleReleasePage,
  decorators: [
    (story) => ({
      components: { story },
      template: '<story />',
      setup() {
        getCurrentInstance()?.appContext.app.use(createPinia());
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SampleReleasePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
