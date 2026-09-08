import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BasePagination from './BasePagination.vue';

const meta = {
  title: 'Base Components/Pagination',
  component: BasePagination,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['default', 'small'],
    },
    modelValue: { control: 'number' },
    total: { control: 'number' },
    pageSize: { control: 'number' },
    disabled: { control: 'boolean' },
    simple: { control: 'boolean' },
  },
  args: {
    ariaLabel: 'Pagination',
    modelValue: 1,
    pageSize: 10,
    showSizeChanger: false,
    showQuickJumper: false,
    total: 85,
  },
  render: (args) => ({
    components: { BasePagination },
    setup() {
      const page = ref(args.modelValue);
      const pageSize = ref(args.pageSize);

      watch(
        () => args.modelValue,
        (nextPage) => {
          page.value = nextPage;
        },
      );
      watch(
        () => args.pageSize,
        (nextPageSize) => {
          pageSize.value = nextPageSize;
        },
      );

      return { args, page, pageSize };
    },
    template: `
      <BasePagination
        v-bind="{ ...args, modelValue: page, pageSize }"
        @update:model-value="page = $event"
        @update:page-size="pageSize = $event"
      />
    `,
  }),
} satisfies Meta<typeof BasePagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const WithPageSizeChanger: Story = {
  args: {
    pageSizeOptions: [10, 20, 50],
    showSizeChanger: true,
    total: 240,
  },
};

export const Simple: Story = {
  args: {
    simple: true,
    total: 120,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const total = 85;
      const pageSizeOptions = [10, 20, 50];
      const defaultPage = ref(1);
      const defaultPageSize = ref(10);
      const quickJumperPage = ref(2);
      const smallPage = ref(3);
      const simplePage = ref(2);
      const disabledPage = ref(1);
      const summary = (totalCount: number, range: [number, number]) =>
        `${range[0]}-${range[1]} of ${totalCount} items`;

      return {
        defaultPage,
        defaultPageSize,
        disabledPage,
        pageSizeOptions,
        quickJumperPage,
        simplePage,
        smallPage,
        summary,
        total,
      };
    },
    template: `
      <div style="box-sizing: border-box; display: grid; gap: 16px; width: 100%; max-width: 960px; padding: 24px">
        <section v-for="item in ['Default', 'Quick Jumper', 'Small Size', 'Simple', 'Disabled']" :key="item" style="box-sizing: border-box; padding: 16px 20px; border: 1px solid #d9d9d9; border-radius: 6px">
          <strong style="display: block; margin-bottom: 16px">{{ item }}</strong>
          <BasePagination
            v-if="item === 'Default'"
            v-model="defaultPage"
            v-model:page-size="defaultPageSize"
            :total="total"
            :page-size-options="pageSizeOptions"
            show-size-changer
            :show-total="summary"
          />
          <BasePagination
            v-else-if="item === 'Quick Jumper'"
            v-model="quickJumperPage"
            :total="total"
            show-quick-jumper
            :show-total="summary"
          />
          <BasePagination
            v-else-if="item === 'Small Size'"
            v-model="smallPage"
            :total="total"
            size="small"
            :show-total="summary"
          />
          <BasePagination
            v-else-if="item === 'Simple'"
            v-model="simplePage"
            :total="total"
            simple
            :show-total="summary"
          />
          <BasePagination
            v-else
            v-model="disabledPage"
            :total="total"
            disabled
            :show-total="summary"
          />
        </section>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
  },
};
