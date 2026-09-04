import type { BaseTabProps } from './base-tab.types';

export const BASE_TAB_SIZES = ['small', 'medium', 'large'] as const;

export const baseTabDefaults: Required<
  Pick<
    BaseTabProps,
    | 'ariaLabel'
    | 'disabled'
    | 'readonly'
    | 'loading'
    | 'required'
    | 'size'
    | 'status'
    | 'error'
    | 'block'
  >
> = {
  ariaLabel: 'Tab list',
  disabled: false,
  readonly: false,
  loading: false,
  required: false,
  size: 'medium',
  status: 'default',
  error: false,
  block: false,
};
