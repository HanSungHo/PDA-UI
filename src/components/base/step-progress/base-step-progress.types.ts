export type BaseStepStatus = 'pending' | 'loading' | 'success' | 'error' | 'warning';

export type BaseStepDirection = 'horizontal' | 'vertical';

export interface BaseStepItem {
  label: string;
  status?: BaseStepStatus;
}

export interface BaseStepProgressProps {
  items: BaseStepItem[];
  direction?: BaseStepDirection;
}

export const baseStepProgressDefaults = {
  direction: 'horizontal',
} as const;
