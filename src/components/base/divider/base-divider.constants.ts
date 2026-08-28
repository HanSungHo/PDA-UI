import type { BaseDividerProps, BaseDividerVariant } from './base-divider.types';

export const baseDividerDefaults: Required<
  Pick<BaseDividerProps, 'type' | 'orientation' | 'dashed' | 'plain'>
> = {
  type: 'horizontal',
  orientation: 'center',
  dashed: false,
  plain: false,
};

export function resolveDividerVariant(
  dashed: boolean | undefined,
  variant: BaseDividerVariant | undefined,
): BaseDividerVariant {
  if (variant !== undefined) {
    return variant;
  }

  if (dashed) {
    return 'dashed';
  }

  return 'solid';
}
