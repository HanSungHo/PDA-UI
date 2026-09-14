export type BaseDatePickerLayout = 'vertical' | 'horizontal';
export type BaseDatePickerSize = 'small' | 'medium';
export type BaseDatePickerState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';
export type BaseDatePickerValue = string | null;

export interface BaseDatePickerProps {
  modelValue?: BaseDatePickerValue | undefined;
  layout?: BaseDatePickerLayout | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  size?: BaseDatePickerSize | undefined;
  format?: string | undefined;
  valueFormat?: string | undefined;
  inputReadOnly?: boolean | undefined;
  id?: string | undefined;
}

export interface BaseDatePickerEmits {
  'update:modelValue': [value: BaseDatePickerValue];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseDatePickerDefaults = {
  disabled: false,
  errorMessage: '',
  format: 'MM/DD/YYYY',
  hint: '',
  id: '',
  inputReadOnly: true,
  label: '',
  layout: 'vertical',
  modelValue: null,
  placeholder: 'Select Date',
  required: false,
  size: 'medium',
  valueFormat: 'YYYY-MM-DD',
} satisfies Required<BaseDatePickerProps>;
