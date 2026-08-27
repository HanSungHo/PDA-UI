import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseSliderMark = string | { label: string; style?: Record<string, string> };

export type BaseSliderMarks = Record<number, BaseSliderMark>;

export interface BaseSliderProps extends BaseFieldProps {
  modelValue: number;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  dots?: boolean | undefined;
  included?: boolean | undefined;
  marks?: BaseSliderMarks | undefined;
  tooltipOpen?: boolean | undefined;
  showValue?: boolean | undefined;
  valuePrefix?: string | undefined;
  valueSuffix?: string | undefined;
}

export interface BaseSliderEmits {
  'update:modelValue': [value: number];
  change: [value: number];
  afterChange: [value: number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

/**
 * Ant Design Vue's `<a-slider>` value type supports single-value and
 * range mode (`number | [number, number]`). BaseSlider only operates in
 * single-value mode — range payloads are silently ignored by
 * {@link isSingleSliderValue}. Implement `BaseRangeSlider` separately
 * if dual-thumb selection is ever required.
 */
export type AntSliderValue = number | [number, number];

export const baseSliderDefaults: Required<
  Pick<
    BaseSliderProps,
    | 'ariaLabel'
    | 'min'
    | 'max'
    | 'step'
    | 'disabled'
    | 'readonly'
    | 'loading'
    | 'required'
    | 'size'
    | 'status'
    | 'error'
    | 'block'
    | 'dots'
    | 'included'
    | 'tooltipOpen'
    | 'showValue'
    | 'valuePrefix'
    | 'valueSuffix'
  >
> = {
  ariaLabel: 'Slider',
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  readonly: false,
  loading: false,
  required: false,
  size: 'medium',
  status: 'default',
  error: false,
  block: true,
  dots: false,
  included: true,
  tooltipOpen: false,
  showValue: false,
  valuePrefix: '',
  valueSuffix: '',
};

export function isSingleSliderValue(value: AntSliderValue): value is number {
  return typeof value === 'number';
}
