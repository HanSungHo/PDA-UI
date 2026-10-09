export type BaseBadgeColor = 'blue' | 'red' | 'green' | 'yellow' | 'cyan' | 'neutral' | 'brand';

export interface BaseBadgeProps {
  label?: string | undefined;
  color?: BaseBadgeColor | undefined;
  ariaLabel?: string | undefined;
}

export const baseBadgeDefaults = {
  color: 'blue',
} as const;
