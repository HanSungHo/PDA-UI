export type BaseInputFieldLayout = 'vertical' | 'horizontal';
export type BaseInputFieldType = 'text' | 'password';
export type BaseInputFieldState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';
export type BaseInputFieldIcon = object;

export interface BaseInputFieldProps {
  modelValue?: string | undefined;
  layout?: BaseInputFieldLayout | undefined;
  type?: BaseInputFieldType | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  allowClear?: boolean | undefined;
  prefixIcon?: BaseInputFieldIcon | null | undefined;
  maxLength?: number | null | undefined;
  showCount?: boolean | undefined;
  id?: string | undefined;
}

export interface BaseInputFieldEmits {
  'update:modelValue': [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
}

export const baseInputFieldDefaults = {
  allowClear: false,
  disabled: false,
  errorMessage: '',
  hint: '',
  id: '',
  label: '',
  layout: 'vertical',
  maxLength: null,
  modelValue: '',
  placeholder: '',
  prefixIcon: null,
  required: false,
  showCount: false,
  type: 'text',
} satisfies Required<
  Pick<
    BaseInputFieldProps,
    | 'allowClear'
    | 'disabled'
    | 'errorMessage'
    | 'hint'
    | 'id'
    | 'label'
    | 'layout'
    | 'maxLength'
    | 'modelValue'
    | 'placeholder'
    | 'prefixIcon'
    | 'required'
    | 'showCount'
    | 'type'
  >
>;
