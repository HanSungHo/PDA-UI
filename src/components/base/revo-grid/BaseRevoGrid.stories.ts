import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { BaseRevoGridColumn, BaseRevoGridKey } from './base-revo-grid.types';
import BaseRevoGrid from './BaseRevoGrid.vue';

const columns: BaseRevoGridColumn[] = [
  { prop: 'name', name: 'Process', size: 140, pin: 'colPinStart' },
  { prop: 'count', name: 'C', size: 48 },
  { prop: 'description', name: 'Description', size: 220 },
];

const rows = Array.from({ length: 30 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `PROCESS ${index + 1}`,
  count: index % 3,
  description: `Step ${index + 1} description`,
}));

const meta = {
  title: 'Base Components/RevoGrid',
  component: BaseRevoGrid,
  argTypes: {
    rowSize: { control: 'number' },
    stretch: { control: 'boolean' },
  },
  args: {
    rows,
    columns,
    rowSize: 40,
    stretch: false,
    accessibleLabel: 'Process grid',
  },
  render: (args) => ({
    components: { BaseRevoGrid },
    setup() {
      const selectedRowKey = ref<BaseRevoGridKey>();
      const lastEvent = ref('Tap or double-tap a cell.');

      function handleRowSelect(rowKey: BaseRevoGridKey): void {
        selectedRowKey.value = rowKey;
      }

      // wasSelected reports whether the row was already selected when the tap started, so a
      // consumer can open row actions only on a second tap of the selected row.
      function handleCellClick(detail: {
        rowKey: BaseRevoGridKey;
        prop?: string;
        wasSelected: boolean;
      }): void {
        lastEvent.value = `cellClick: ${detail.rowKey} / ${detail.prop} / wasSelected=${detail.wasSelected}`;
      }

      function handleCellDoubleClick(detail: { rowKey: BaseRevoGridKey; prop?: string }): void {
        lastEvent.value = `cellDoubleClick: ${detail.rowKey} / ${detail.prop}`;
      }

      return {
        args,
        selectedRowKey,
        lastEvent,
        handleRowSelect,
        handleCellClick,
        handleCellDoubleClick,
      };
    },
    template: `
      <div style="width: 320px; height: 360px;">
        <BaseRevoGrid
          v-bind="args"
          :selected-row-key="selectedRowKey"
          @row-select="handleRowSelect"
          @cell-click="handleCellClick"
          @cell-double-click="handleCellDoubleClick"
        />
      </div>
      <output aria-live="polite">{{ lastEvent }}</output>
    `,
  }),
} satisfies Meta<typeof BaseRevoGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CellInteractions: Story = {};

export const Stretched: Story = {
  args: { stretch: true },
};
