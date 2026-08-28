import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseOptionValue = string | number;

export interface BaseOption {
  label: string;
  value: BaseOptionValue;
  disabled?: boolean | undefined;
}

export type BaseDropdownValue = BaseOptionValue | BaseOptionValue[] | undefined;

export interface BaseDropdownListProps extends BaseFieldProps {
  modelValue?: BaseDropdownValue;
  clearable?: boolean | undefined;
  autofocus?: boolean | undefined;
  placeholder?: string | undefined;
  options?: BaseOption[] | undefined;
  multiple?: boolean | undefined;
  /** Enables case-insensitive filtering by option label while the field is interactive. */
  searchable?: boolean | undefined;
}

export interface BaseDropdownListEmits {
  'update:modelValue': [value: BaseDropdownValue];
  change: [value: BaseDropdownValue];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
}

export const baseDropdownListDefaults = {
  ariaLabel: 'Dropdown list',
  autofocus: false,
  block: true,
  clearable: false,
  disabled: false,
  error: false,
  loading: false,
  modelValue: undefined,
  multiple: false,
  options: (): BaseOption[] => [],
  readonly: false,
  required: false,
  searchable: false,
  size: 'medium',
  status: 'default',
} as const;
