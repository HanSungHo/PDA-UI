import type { BasePaginationProps } from './base-pagination.types';

export const basePaginationDefaults = {
  modelValue: 1,
  total: 0,
  pageSize: 10,
  pageSizeOptions: (): Array<string | number> => [],
  showSizeChanger: false,
  showQuickJumper: false,
  disabled: false,
  loading: false,
  simple: false,
  size: 'default',
  ariaLabel: 'Pagination',
} satisfies Omit<
  Required<
    Pick<
      BasePaginationProps,
      | 'modelValue'
      | 'total'
      | 'pageSize'
      | 'showSizeChanger'
      | 'showQuickJumper'
      | 'disabled'
      | 'loading'
      | 'simple'
      | 'size'
      | 'ariaLabel'
    >
  >,
  never
> & { pageSizeOptions: () => Array<string | number> };
