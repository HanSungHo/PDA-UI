import type { AutoSizeColumnConfig, ColumnRegular } from '@revolist/revogrid';

export type BaseRevoGridKey = string | number;

export type BaseRevoGridColumnAlign = 'left' | 'center' | 'right';

export type BaseRevoGridColumn = ColumnRegular & {
  /** Aligns the header and data cells of the column. The default is left, as in Figma. */
  align?: BaseRevoGridColumnAlign;
};

export interface BaseRevoGridProps<TRow extends object> {
  rows: TRow[];
  columns: BaseRevoGridColumn[];
  rowKey?: keyof TRow | ((row: TRow) => BaseRevoGridKey);
  selectedRowKey?: BaseRevoGridKey;
  rowSize?: number;
  resize?: boolean;
  filter?: boolean;
  readonly?: boolean;
  stretch?: boolean | string;
  autoSizeColumn?: boolean | AutoSizeColumnConfig;
  /** Accessible name of the RevoGrid treegrid. */
  accessibleLabel?: string;
  /** Class added to the row whose key equals `selectedRowKey`. */
  selectedRowClass?: string;
}

export interface BaseRevoGridCellFocusDetail<TRow> {
  model: TRow;
  type: string;
  prop?: string;
}
export interface BaseRevoGridAfterEditDetail<TRow> {
  model: TRow;
  prop: string;
  val: unknown;
}
export interface BaseRevoGridScrollDetail {
  axis: 'x' | 'y';
  position: number;
  max: number;
}
