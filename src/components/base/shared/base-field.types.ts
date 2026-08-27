export type BaseComponentSize = 'small' | 'medium' | 'large';
export type BaseComponentStatus = 'default' | 'success' | 'warning' | 'error';

export interface BaseFieldProps {
  id?: string | undefined;
  label?: string | undefined;
  ariaLabel?: string | undefined;
  hint?: string | undefined;
  error?: boolean | undefined;
  errorMessage?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readonly?: boolean | undefined;
  loading?: boolean | undefined;
  size?: BaseComponentSize | undefined;
  status?: BaseComponentStatus | undefined;
  block?: boolean | undefined;
}
