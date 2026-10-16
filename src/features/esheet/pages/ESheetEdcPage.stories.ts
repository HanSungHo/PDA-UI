import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { createPinia } from 'pinia';
import { getCurrentInstance } from 'vue';

import ESheetEdcPage from './ESheetEdcPage.vue';

const meta = {
  title: 'Features/ESheet/EDC Data Screen',
  component: ESheetEdcPage,
  args: {
    lotId: 'LOT-DEMO-01',
    operation: '1000',
    subOperation: '00',
    processStep: 'PHOTO',
    realRecipe: 'RCP-THK-01',
  },
  decorators: [
    (story) => ({
      components: { story },
      setup() {
        const app = getCurrentInstance()?.appContext.app;
        app?.use(createPinia());
      },
      template: '<story />',
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ESheetEdcPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Thick: Story = {};
