import type { Meta, StoryObj } from '@storybook/vue3-vite';

import type { MachineSelectParams } from '../types/machine-select-dialog.types';
import MachineSelectDialog from './MachineSelectDialog.vue';

const baseParams: MachineSelectParams = {
  identCodeList: '',
  isExposure: 'N',
  eqpGroup: 'EQP-A',
  expEqpGroup: '',
  operation: '1100',
  subOperation: '00',
  product: 'PRODUCT-A',
  lotId: 'LOT-A260915-018',
  facility: 'KFAB',
};

const meta = {
  title: 'Features/Machine Select/Machine Select Dialog',
  component: MachineSelectDialog,
  args: { params: baseParams },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MachineSelectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start machine only. Type `EQP-A1` in 선택장비 and press Enter to fill RECIPE. */
export const Default: Story = {};

/** Start and exposure machines, which makes the dialog taller. */
export const WithExposureMachine: Story = {
  args: {
    params: { ...baseParams, isExposure: 'Y', expEqpGroup: 'EQP-B' },
  },
};
