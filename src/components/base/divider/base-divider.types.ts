export type BaseDividerType = 'horizontal' | 'vertical';

export type BaseDividerTextOrientation = 'left' | 'right' | 'center';

export type BaseDividerVariant = 'solid' | 'dashed' | 'dotted';

export interface BaseDividerProps {
  type?: BaseDividerType;

  orientation?: BaseDividerTextOrientation;

  dashed?: boolean;

  variant?: BaseDividerVariant;

  plain?: boolean;
}
