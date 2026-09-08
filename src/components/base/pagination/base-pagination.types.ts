import type { VNodeChild } from 'vue';

export type BasePaginationSize = 'small' | 'default';

export interface BasePaginationProps {
  modelValue?: number | undefined;
  total?: number | undefined;
  pageSize?: number | undefined;
  pageSizeOptions?: Array<string | number> | undefined;
  showSizeChanger?: boolean | undefined;
  showQuickJumper?: boolean | undefined;
  showTotal?: ((total: number, range: [number, number]) => VNodeChild) | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  simple?: boolean | undefined;
  size?: BasePaginationSize | undefined;
  ariaLabel?: string | undefined;
}

export interface BasePaginationEmits {
  'update:modelValue': [page: number];
  'update:pageSize': [pageSize: number];
  change: [page: number, pageSize: number];
  pageSizeChange: [pageSize: number, page: number];
}
