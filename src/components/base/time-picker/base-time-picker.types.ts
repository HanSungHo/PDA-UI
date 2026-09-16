export type BaseTimePickerLayout = 'vertical' | 'horizontal';
export type BaseTimePickerSize = 'small' | 'medium';
export type BaseTimePickerState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';
export type BaseTimePickerValue = string | null;

export interface BaseTimePickerProps {
  modelValue?: BaseTimePickerValue | undefined;
  layout?: BaseTimePickerLayout | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  size?: BaseTimePickerSize | undefined;
  format?: string | undefined;
  valueFormat?: string | undefined;
  inputReadOnly?: boolean | undefined;
  id?: string | undefined;
}

export interface BaseTimePickerEmits {
  'update:modelValue': [value: BaseTimePickerValue];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseTimePickerDefaults = {
  disabled: false,
  errorMessage: '',
  format: 'HH:mm:ss',
  hint: '',
  id: '',
  inputReadOnly: true,
  label: '',
  layout: 'vertical',
  modelValue: null,
  placeholder: 'Select Time',
  required: false,
  size: 'medium',
  valueFormat: 'HH:mm:ss',
} satisfies Required<BaseTimePickerProps>;
