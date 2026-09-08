import './base-table-cell.stories.css';

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { h, ref } from 'vue';

import { BaseButton } from '../button';
import { BaseInputField } from '../input-field';
import { BaseToggle } from '../toggle';
import BaseTableCell from './BaseTableCell.vue';

const meta = {
  title: 'Base Components/Table Cell',
  component: BaseTableCell,
  argTypes: {
    align: {
      control: 'inline-radio',
      options: ['start', 'center', 'end'],
    },
    truncate: { control: 'boolean' },
    value: { control: 'text' },
    variant: {
      control: 'inline-radio',
      options: ['body', 'heading', 'empty-state'],
    },
  },
  args: {
    align: 'start',
    truncate: false,
    value: 'Resource name',
    variant: 'body',
  },
} satisfies Meta<typeof BaseTableCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const DesignStates: Story = {
  render: () => ({
    components: {
      BaseButton,
      BaseInputField,
      BaseTableCell,
      BaseToggle,
      DeleteOutlined,
      EditOutlined,
      EyeOutlined,
      FileTextOutlined,
      MoreOutlined,
      StopOutlined,
      WarningOutlined,
    },
    setup() {
      return { inputValue: ref(''), toggleValue: ref(true) };
    },
    template: `
      <div class="table-cell-story-viewport">
        <div class="table-cell-story">
        <div class="table-cell-story__row">
          <strong>Heading</strong><BaseTableCell variant="heading" value="Content" />
        </div>
        <div class="table-cell-story__row">
          <strong>Heading checkbox</strong><BaseTableCell variant="heading"><input type="checkbox" aria-label="Select all resources" /></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Null</strong><BaseTableCell :value="null" />
        </div>
        <div class="table-cell-story__row">
          <strong>404</strong><BaseTableCell variant="empty-state" align="center"><span class="table-cell-story__empty-state"><span class="table-cell-story__empty-icon" aria-hidden="true"><WarningOutlined /></span><strong>404</strong><small>No results.</small></span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Data</strong><BaseTableCell value="Content" />
        </div>
        <div class="table-cell-story__row">
          <strong>Name</strong><BaseTableCell><a href="/details">Content</a></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Data-lv2</strong><BaseTableCell><template #prefix><span aria-hidden="true">&#8226;</span></template>Content</BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Status</strong><BaseTableCell><span style="color: var(--ds-color-success)">&#10003; Completed</span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Badge</strong><BaseTableCell><span>GET</span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Icon</strong><BaseTableCell><span class="table-cell-story__icon-actions"><BaseButton icon-only aria-label="Edit" size="xs" variant="tertiary"><EditOutlined /></BaseButton><BaseButton icon-only aria-label="Delete" size="xs" variant="tertiary"><DeleteOutlined /></BaseButton><BaseButton icon-only aria-label="More actions" size="xs" variant="tertiary"><MoreOutlined /></BaseButton></span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Button</strong><BaseTableCell><span class="table-cell-story__button-actions"><BaseButton class="table-cell-story__danger" label="Stop" size="small" variant="primary"><template #icon><StopOutlined /></template></BaseButton><BaseButton label="Restart" size="small" variant="primary"><template #icon><EyeOutlined /></template></BaseButton><BaseButton label="Delete" size="small" variant="secondary"><template #icon><DeleteOutlined /></template></BaseButton></span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Toggle</strong><BaseTableCell><BaseToggle v-model="toggleValue" label="Text" /></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Checkbox</strong><BaseTableCell><input type="checkbox" aria-label="Select row" /></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Image</strong><BaseTableCell><span style="display: block; width: 100%; height: 32px; background: var(--ds-color-bg-disabled); border-radius: var(--ds-radius-sm)" /></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Progress</strong><BaseTableCell><span style="color: var(--ds-color-success)">60% <progress value="60" max="100" /></span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Date</strong><BaseTableCell value="2025.06.23 17:26:25  dev.kim" />
        </div>
        <div class="table-cell-story__row">
          <strong>Group tags</strong><BaseTableCell value="US East: N.Virginia  Environment: Production" truncate />
        </div>
        <div class="table-cell-story__row">
          <strong>Single tag</strong><BaseTableCell><span>Tag</span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Code</strong><BaseTableCell><template #default><span class="table-cell-story__code-content"><span>[</span><span>  &#123;</span><span>    <em>"id"</em>: 0,</span><span>    <em>"category"</em>: &#123; <em>"name"</em>: <i>"string"</i> &#125;,</span><span>    <em>"name"</em>: <i>"doggie"</i>,</span><span>    <em>"status"</em>: <i>"available"</i></span><span>  &#125;</span><span>]</span></span></template></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Avatar</strong><BaseTableCell><span>ATOP26 - Platform team</span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Version</strong><BaseTableCell value="V9  2023.12.15 17:42:33  By Kildong Hong" truncate />
        </div>
        <div class="table-cell-story__row">
          <strong>File</strong><BaseTableCell><span class="table-cell-story__file"><FileTextOutlined /><span><strong>Q3_Financial_Report.pdf</strong><small>2.1 MB · Uploaded on Aug 28, 2025</small></span></span></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Input</strong><BaseTableCell><BaseInputField v-model="inputValue" placeholder="Enter user name" aria-label="Enter user name" /></BaseTableCell>
        </div>
        <div class="table-cell-story__row">
          <strong>Healthy</strong><BaseTableCell value="Healthy">
          <template #prefix><span aria-hidden="true">●</span></template>
          <template #suffix><span>Ready</span></template>
          </BaseTableCell>
        </div>
        </div>
      </div>
    `,
  }),
};

export const WithSlots: Story = {
  render: () => ({
    setup() {
      return () =>
        h(
          BaseTableCell,
          { value: 'Healthy' },
          {
            prefix: () => h('span', { 'aria-hidden': 'true' }, '●'),
            suffix: () => h('span', 'Ready'),
          },
        );
    },
  }),
};
