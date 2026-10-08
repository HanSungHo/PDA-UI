import type { BaseFieldProps } from '../shared/base-field.types';

/**
 * Framework-independent contract for a single boolean checkbox.
 * The control has one fixed visual size in the current design specification,
 * so the shared `size` prop is intentionally not exposed.
 */
export interface BaseCheckboxProps extends Omit<BaseFieldProps, 'size'> {
  autofocus?: boolean | undefined;
  indeterminate?: boolean | undefined;
  modelValue?: boolean | undefined;
}

export interface BaseCheckboxEmits {
  'update:modelValue': [value: boolean];
  change: [value: boolean, event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseCheckboxDefaults = {
  ariaLabel: 'Checkbox',
  autofocus: false,
  block: false,
  disabled: false,
  error: false,
  indeterminate: false,
  loading: false,
  modelValue: false,
  readonly: false,
  required: false,
  status: 'default',
} as const;
