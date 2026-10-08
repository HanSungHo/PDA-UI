import type { BaseToggleProps, ToggleCheckedValue } from './base-toggle.types';

export const baseToggleDefaults: Required<
  Pick<
    BaseToggleProps,
    | 'modelValue'
    | 'checkedValue'
    | 'uncheckedValue'
    | 'variant'
    | 'ariaLabel'
    | 'disabled'
    | 'readonly'
    | 'loading'
    | 'required'
    | 'size'
    | 'status'
    | 'error'
    | 'block'
    | 'labelPlacement'
  >
> = {
  modelValue: false,
  checkedValue: true,
  uncheckedValue: false,
  variant: 'text',
  ariaLabel: 'Toggle',
  disabled: false,
  readonly: false,
  loading: false,
  required: false,
  size: 'medium',
  status: 'default',
  error: false,
  block: false,
  labelPlacement: 'end',
};

export function normalizeCheckedValue(
  value: ToggleCheckedValue,
  checkedValue: ToggleCheckedValue = true,
): boolean {
  return value === checkedValue;
}
