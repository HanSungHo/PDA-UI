import type { BaseComponentSize } from '../shared/base-field.types';

export type BaseFilterValue = string | number;

export interface BaseFilterItem {
  id: string;
  key: string;
  value: BaseFilterValue;
  disabled?: boolean | undefined;
}

export interface BaseFilterProps {
  modelValue?: readonly BaseFilterItem[] | undefined;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  loading?: boolean | undefined;
  size?: BaseComponentSize | undefined;
  addable?: boolean | undefined;
  clearable?: boolean | undefined;
  addLabel?: string | undefined;
  clearLabel?: string | undefined;
  ariaLabel?: string | undefined;
}

export interface BaseFilterEmits {
  'update:modelValue': [value: BaseFilterItem[]];
  change: [value: BaseFilterItem[]];
  add: [];
  remove: [item: BaseFilterItem];
  clear: [];
}

export const baseFilterDefaults = {
  addLabel: 'Add filter',
  addable: true,
  ariaLabel: 'Active filters',
  clearLabel: 'Clear all',
  clearable: true,
  disabled: false,
  loading: false,
  modelValue: (): BaseFilterItem[] => [],
  readonly: false,
  size: 'small',
} as const;
