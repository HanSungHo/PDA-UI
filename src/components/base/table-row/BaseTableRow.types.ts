import type { TableColumnsType } from 'ant-design-vue';

export type BaseTableRowKey = string | number;

export interface BaseTableRowTag {
  label: string;
}

export interface BaseTableRowRecord {
  key?: BaseTableRowKey | undefined;

  title?: string | undefined;

  description?: string | undefined;

  tags?: BaseTableRowTag[] | undefined;

  lastModified?: Date | undefined;
}

export type BaseTableRowColumn = TableColumnsType<BaseTableRowRecord>[number];

export interface BaseTableRowProps {
  columns: BaseTableRowColumn[];

  dataSource: BaseTableRowRecord[];
}
