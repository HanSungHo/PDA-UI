import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type {
  BaseTableRowColumn,
  BaseTableRowRecord,
} from '~/components/base/table-row/BaseTableRow.types';
import BaseTableRow from '~/components/base/table-row/BaseTableRow.vue';

const mockColumns: BaseTableRowColumn[] = [
  {
    title: 'Project',
    dataIndex: 'project',
    key: 'project',
    sorter: true,
    width: '25%',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    sorter: true,
    width: '25%',
  },
  {
    title: 'Last modified',
    dataIndex: 'lastModified',
    key: 'lastModified',
    sorter: true,
    width: '25%',
  },
  {
    title: 'Actions',
    dataIndex: 'actions',
    key: 'actions',
    sorter: true,
    width: '25%',
  },
];

const mockData: BaseTableRowRecord[] = [
  {
    key: 1,
    title: 'Analytics MCP',
    description: 'Content',
    tags: [
      {
        label: 'US East : N.Virginia',
      },
      {
        label: 'US East : N.Virginia',
      },
    ],
    lastModified: new Date('2025-06-23T17:26:25'),
  },
];

const createWrapper = (data = mockData) =>
  mount(BaseTableRow, {
    props: {
      columns: mockColumns,
      dataSource: data,
    },
  });

describe('BaseTable', () => {
  it('renders table', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.ds-table').exists()).toBe(true);
  });

  it('renders project title', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('Analytics MCP');
  });

  it('renders project description', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('Content');
  });

  it('renders status tags', () => {
    const wrapper = createWrapper();

    const tags = wrapper.findAll('.ds-status-tag');

    expect(tags).toHaveLength(2);

    expect(tags[0].text()).toBe('US East : N.Virginia');
  });

  it('renders formatted last modified date', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('2025.06.23 17:26:25');
  });

  it('renders fallback when status tags are missing', () => {
    const wrapper = createWrapper([
      {
        key: 1,
        title: 'Analytics MCP',
        description: 'Content',
        lastModified: new Date('2025-06-23T17:26:25'),
      },
    ]);

    expect(wrapper.find('.ds-status-cell').text()).toBe('-');
  });

  it('renders fallback when last modified is missing', () => {
    const wrapper = createWrapper([
      {
        key: 1,
        title: 'Analytics MCP',
        description: 'Content',
        tags: [{ label: 'US East : N.Virginia' }],
      },
    ]);

    expect(wrapper.find('.ds-last-modified').text()).toBe('-');
  });

  it('renders actions column', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.ds-actions-cell').exists()).toBe(true);
  });

  it('renders checkbox selection column', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.ant-table-selection-column').exists()).toBe(true);
  });

  it('renders sortable headers', () => {
    const wrapper = createWrapper();

    expect(wrapper.findAll('.ant-table-column-sorters').length).toBeGreaterThan(0);
  });

  it('renders empty state when dataSource is empty', () => {
    const wrapper = createWrapper([]);

    expect(wrapper.text()).toContain('404');

    expect(wrapper.text()).toContain('No results.');
  });

  it('does not render empty state when data exists', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).not.toContain('No results.');
  });
});
