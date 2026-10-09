import type { ColumnRegular } from '@revolist/revogrid';

export type BaseRevoGridKey = string | number;

export type BaseRevoGridColumn = ColumnRegular;

export interface BaseRevoGridProps<TRow extends object> {
  rows: TRow[];
  columns: BaseRevoGridColumn[];
  rowKey?: keyof TRow | ((row: TRow) => BaseRevoGridKey);
  selectedRowKey?: BaseRevoGridKey;
  rowSize?: number;
  resize?: boolean;
  readonly?: boolean;
  stretch?: boolean | string;
}

export interface BaseRevoGridCellFocusDetail<TRow> {
  model: TRow;
  type: string;
  prop?: string;
}

export interface BaseRevoGridScrollDetail {
  axis: 'x' | 'y';
  position: number;
  max: number;
}
