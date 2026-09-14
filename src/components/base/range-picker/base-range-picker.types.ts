import type { SharedTimeProps } from 'ant-design-vue/es/vc-picker/panels/TimePanel';
import type { Dayjs } from 'dayjs';

export type BaseRangePickerLayout = 'vertical' | 'horizontal';
export type BaseRangePickerSize = 'small' | 'medium';
export type BaseRangePickerState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';
export type BaseRangePickerValue = [string, string] | null;
export type BaseRangePickerPlaceholder = [string, string];
export type BaseRangePickerShowTime =
  | boolean
  | (Omit<SharedTimeProps<Dayjs>, 'defaultValue'> & {
      defaultValue?: Dayjs[];
    });

export interface BaseRangePickerProps {
  modelValue?: BaseRangePickerValue | undefined;
  layout?: BaseRangePickerLayout | undefined;
  label?: string | undefined;
  placeholder?: BaseRangePickerPlaceholder | undefined;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  size?: BaseRangePickerSize | undefined;
  format?: string | undefined;
  valueFormat?: string | undefined;
  showTime?: BaseRangePickerShowTime | undefined;
  inputReadOnly?: boolean | undefined;
  id?: string | undefined;
}

export interface BaseRangePickerEmits {
  'update:modelValue': [value: BaseRangePickerValue];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseRangePickerDefaults = {
  disabled: false,
  errorMessage: '',
  format: 'MM/DD/YYYY',
  hint: '',
  id: '',
  inputReadOnly: true,
  label: '',
  layout: 'vertical',
  modelValue: null,
  placeholder: ['Select Date', 'Select Date'],
  required: false,
  showTime: false,
  size: 'medium',
  valueFormat: 'YYYY-MM-DD',
} satisfies Required<BaseRangePickerProps>;
