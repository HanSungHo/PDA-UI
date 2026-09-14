import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseRangeSliderLayout = 'horizontal' | 'vertical';

export interface BaseRangeSliderProps extends BaseFieldProps {
  modelValue: number;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  layout?: BaseRangeSliderLayout | undefined;
}

export interface BaseRangeSliderEmits {
  'update:modelValue': [value: number];
  change: [value: number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseRangeSliderDefaults = {
  ariaLabel: 'Range slider',
  block: true,
  disabled: false,
  error: false,
  layout: 'vertical',
  loading: false,
  max: 100,
  min: 0,
  readonly: false,
  required: false,
  size: 'medium',
  status: 'default',
  step: 1,
} as const;
