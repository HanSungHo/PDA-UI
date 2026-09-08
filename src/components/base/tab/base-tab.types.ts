import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseTabValue = string | number;
export type BaseTabSize = 'small' | 'medium' | 'large';
export interface BaseTabItem {
  key: BaseTabValue;
  label: string;
  disabled?: boolean | undefined;
}

export interface BaseTabProps extends BaseFieldProps {
  items: BaseTabItem[];
  modelValue: BaseTabValue;
  size?: BaseTabSize | undefined;
}

export interface BaseTabEmits {
  'update:modelValue': [value: BaseTabValue];
  change: [value: BaseTabValue];
}
