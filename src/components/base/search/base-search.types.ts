import type { BaseFieldProps } from '../shared/base-field.types';

export interface BaseSearchProps extends BaseFieldProps {
  modelValue?: string | undefined;
  clearable?: boolean | undefined;
  autofocus?: boolean | undefined;
  placeholder?: string | undefined;
  debounce?: number | undefined;
}

export interface BaseSearchEmits {
  'update:modelValue': [value: string];
  change: [value: string, event: Event];
  search: [value: string, event?: KeyboardEvent | MouseEvent];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
}

export const baseSearchDefaults = {
  ariaLabel: 'Search',
  autofocus: false,
  block: false,
  clearable: true,
  debounce: 300,
  disabled: false,
  error: false,
  loading: false,
  modelValue: '',
  readonly: false,
  required: false,
  size: 'medium',
  status: 'default',
} as const;
