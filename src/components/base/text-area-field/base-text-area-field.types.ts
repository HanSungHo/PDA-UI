export type BaseTextAreaFieldLayout = 'vertical' | 'horizontal';
export type BaseTextAreaFieldState = 'default' | 'filled' | 'focus' | 'error' | 'disabled';

export interface BaseTextAreaFieldProps {
  modelValue?: string | undefined;
  layout?: BaseTextAreaFieldLayout | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  maxLength?: number | null | undefined;
  showCount?: boolean | undefined;
  id?: string | undefined;
}

export interface BaseTextAreaFieldEmits {
  'update:modelValue': [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export const baseTextAreaFieldDefaults = {
  disabled: false,
  errorMessage: '',
  hint: '',
  id: '',
  label: '',
  layout: 'vertical',
  maxLength: null,
  modelValue: '',
  placeholder: '',
  required: false,
  showCount: false,
} satisfies Required<
  Pick<
    BaseTextAreaFieldProps,
    | 'disabled'
    | 'errorMessage'
    | 'hint'
    | 'id'
    | 'label'
    | 'layout'
    | 'maxLength'
    | 'modelValue'
    | 'placeholder'
    | 'required'
    | 'showCount'
  >
>;
