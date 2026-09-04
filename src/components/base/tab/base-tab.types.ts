import type { Component } from 'vue';

import type { BaseFieldProps } from '../shared/base-field.types';

export type BaseTabValue = string | number;
export type BaseTabSize = 'small' | 'medium' | 'large';
export type BaseTabContent = string | Component;

export interface BaseTabItem {
  key: BaseTabValue;
  label: string;
  disabled?: boolean | undefined;
  content?: BaseTabContent | undefined;
}

export interface BaseTabProps extends BaseFieldProps {
  items: BaseTabItem[];
  modelValue?: BaseTabValue | undefined;
  size?: BaseTabSize | undefined;
}

export interface BaseTabEmits {
  'update:modelValue': [value: BaseTabValue];
  change: [value: BaseTabValue];
}
