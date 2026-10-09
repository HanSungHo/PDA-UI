export type BaseDatePickerSize = 'small' | 'medium';
export type BaseDatePickerMode = 'single' | 'range';
export type BaseDatePickerState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';
export type BaseDatePickerSingleValue = string | null;

export interface BaseDatePickerRangeValue {
  from: string;
  to: string;
}

export type BaseDatePickerValue = BaseDatePickerSingleValue | BaseDatePickerRangeValue;

export interface BaseDatePickerProps {
  modelValue?: BaseDatePickerValue | undefined;
  mode?: BaseDatePickerMode | undefined;
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
  withSeconds?: boolean | undefined;
  withTime?: boolean | undefined;
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
  inputReadOnly: false,
  label: '',
  mode: 'single',
  modelValue: null,
  placeholder: 'Select Date',
  required: false,
  size: 'medium',
  valueFormat: 'YYYY-MM-DD',
  withSeconds: false,
  withTime: false,
} satisfies Required<BaseDatePickerProps>;
