export interface BaseEmptyStateProps {
  title?: string | undefined;
  message?: string | undefined;
}

export const baseEmptyStateDefaults = {
  title: 'EMPTY',
  message: '해당 결과가 없습니다',
} as const;
