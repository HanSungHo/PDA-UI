export interface BaseEmptyStateProps {
  title?: string | undefined;
  message?: string | undefined;
  iconVariant?: 'outlined' | 'filled' | undefined;
}

export const baseEmptyStateDefaults = {
  title: 'EMPTY',
  message: '해당 결과가 없습니다',
  iconVariant: 'outlined',
} as const;
