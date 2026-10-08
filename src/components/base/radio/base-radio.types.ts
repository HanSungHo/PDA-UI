import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseRadioValue = string | number;

export interface BaseRadioOption {
  label: string;
  value: BaseRadioValue;
  disabled?: boolean | undefined;
}

export interface BaseRadioProps extends Omit<BaseFieldProps, 'size'> {
  autofocus?: boolean | undefined;
  /** Boolean selection state for one radio; use BaseRadioGroup for scalar option values. */
  modelValue?: boolean | undefined;
  name?: string | undefined;
}

export interface BaseRadioEmits {
  'update:modelValue': [value: boolean];
  change: [value: boolean, event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export interface BaseRadioGroupProps extends Omit<BaseFieldProps, 'size'> {
  autofocus?: boolean | undefined;
  layout?: 'vertical' | 'horizontal' | undefined;
  modelValue?: BaseRadioValue | undefined;
  name?: string | undefined;
  options?: BaseRadioOption[] | undefined;
}

export interface BaseRadioGroupEmits {
  'update:modelValue': [value: BaseRadioValue];
  change: [value: BaseRadioValue, event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseRadioDefaults = {
  ariaLabel: 'Radio',
  autofocus: false,
  block: false,
  disabled: false,
  error: false,
  loading: false,
  modelValue: false,
  readonly: false,
  required: false,
  status: 'default',
} as const;

export const baseRadioGroupDefaults = {
  ariaLabel: 'Radio group',
  autofocus: false,
  block: false,
  disabled: false,
  error: false,
  layout: 'vertical',
  loading: false,
  modelValue: undefined,
  name: undefined,
  options: (): BaseRadioOption[] => [],
  readonly: false,
  required: false,
  status: 'default',
} as const;
