export type BaseTableCellVariant = 'body' | 'empty-state' | 'heading';
export type BaseTableCellAlign = 'start' | 'center' | 'end';
export type BaseTableCellValue = string | number | null | undefined;

export interface BaseTableCellProps {
  variant?: BaseTableCellVariant | undefined;
  value?: BaseTableCellValue;
  truncate?: boolean | undefined;
  align?: BaseTableCellAlign | undefined;
}
