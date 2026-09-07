import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseInputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url';
export type BaseInputMode = 'input' | 'textarea';
export type BaseInputResize = 'none' | 'vertical';
export type BaseInputValue = string | number | undefined;
export type BaseInputTextType = Exclude<BaseInputType, 'password'>;

interface BaseInputCommonProps extends BaseFieldProps {
  modelValue?: BaseInputValue;
  placeholder?: string | undefined;
  name?: string | undefined;
  autocomplete?: string | undefined;
  autofocus?: boolean | undefined;
  clearable?: boolean | undefined;
  maxLength?: number | undefined;
  showCount?: boolean | undefined;
}

export type BaseInputProps =
  | (BaseInputCommonProps & {
      mode?: 'input' | undefined;
      type?: BaseInputTextType | undefined;
      rows?: never;
      resize?: never;
      showPasswordToggle?: never;
    })
  | (BaseInputCommonProps & {
      mode?: 'input' | undefined;
      type: 'password';
      rows?: never;
      resize?: never;
      showPasswordToggle?: boolean | undefined;
    })
  | (BaseInputCommonProps & {
      mode: 'textarea';
      type?: never;
      rows?: number | undefined;
      resize?: BaseInputResize | undefined;
      showPasswordToggle?: never;
    });

export interface BaseInputEmits {
  'update:modelValue': [value: BaseInputValue];
  input: [value: BaseInputValue, event: Event];
  change: [value: BaseInputValue, event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
  resize: [height: number];
}

export const baseInputDefaults = {
  ariaLabel: 'Input',
  autofocus: false,
  block: true,
  clearable: false,
  disabled: false,
  error: false,
  loading: false,
  mode: 'input',
  modelValue: undefined,
  readonly: false,
  required: false,
  showCount: false,
  size: 'medium',
  status: 'default',
  type: 'text',
} as const;
