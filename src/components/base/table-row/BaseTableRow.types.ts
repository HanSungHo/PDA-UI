import type { TableColumnsType, TableProps } from 'ant-design-vue';

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

export type BaseTableRowColumn<T = BaseTableRowRecord> = TableColumnsType<T>[number];

export interface BaseTableRowScroll {
  x?: string | number | true | undefined;
  y?: string | number | undefined;
  scrollToFirstRowOnChange?: boolean | undefined;
}

export interface BaseTableRowProps<T = BaseTableRowRecord> {
  columns: BaseTableRowColumn<T>[] | TableColumnsType<T>;

  dataSource: T[];

  scroll?: BaseTableRowScroll | undefined;

  rowSelection?: TableProps['rowSelection'] | undefined;
}
