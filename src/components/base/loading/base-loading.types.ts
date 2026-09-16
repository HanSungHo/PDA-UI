export type BaseLoadingSize = 'large' | 'medium' | 'small' | 'xs';

export interface BaseLoadingProps {
  size?: BaseLoadingSize;
}

export const baseLoadingDefaults = {
  size: 'medium',
} as const;
