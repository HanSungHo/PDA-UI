import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import type { BaseDrawerItemValue } from './base-drawer-item.types';
import BaseDrawerItem from './BaseDrawerItem.vue';

const meta = {
  title: 'Base Components/Drawer Item',
  component: BaseDrawerItem,
  args: {
    disabled: false,
    label: 'Menu item',
    selected: false,
    value: 'menu-item',
  },
  decorators: [() => ({ template: '<div style="width: 196px"><story /></div>' })],
} satisfies Meta<typeof BaseDrawerItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseDrawerItem },
    setup() {
      const selectedValue = ref<BaseDrawerItemValue>('selected');
      const select = (value: BaseDrawerItemValue): void => {
        selectedValue.value = value;
      };

      return { select, selectedValue };
    },
    template: `
      <div style="display: flex; width: 636px; gap: 24px">
        <div style="width: 196px">
          <BaseDrawerItem
            label="Menu item"
            value="default"
            :selected="selectedValue === 'default'"
            @select="select"
          />
        </div>
        <div style="width: 196px">
          <BaseDrawerItem
            label="Menu item"
            value="selected"
            :selected="selectedValue === 'selected'"
            @select="select"
          />
        </div>
        <div style="width: 196px">
          <BaseDrawerItem disabled label="Menu item" value="disabled" />
        </div>
      </div>
    `,
  }),
};
