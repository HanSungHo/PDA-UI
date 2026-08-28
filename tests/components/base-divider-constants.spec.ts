import { describe, expect, it } from 'vitest';

import {
  baseDividerDefaults,
  resolveDividerVariant,
} from '../../src/components/base/divider/base-divider.constants';

describe('base-divider.constants', () => {
  describe('baseDividerDefaults', () => {
    it('matches the documented default contract', () => {
      expect(baseDividerDefaults).toEqual({
        type: 'horizontal',
        orientation: 'center',
        dashed: false,
        plain: false,
      });
    });
  });

  describe('resolveDividerVariant', () => {
    it('returns solid when neither dashed nor variant is set', () => {
      expect(resolveDividerVariant(undefined, undefined)).toBe('solid');
    });

    it('returns dashed when dashed is true and variant is not set', () => {
      expect(resolveDividerVariant(true, undefined)).toBe('dashed');
    });

    it('returns solid when dashed is false and variant is not set', () => {
      expect(resolveDividerVariant(false, undefined)).toBe('solid');
    });

    it('returns the explicit variant when variant is set and dashed is not', () => {
      expect(resolveDividerVariant(undefined, 'dotted')).toBe('dotted');
    });

    it('variant takes precedence over dashed when both are set (dashed=true, variant=dotted)', () => {
      expect(resolveDividerVariant(true, 'dotted')).toBe('dotted');
    });

    it('variant takes precedence over dashed even when they conflict (dashed=true, variant=solid)', () => {
      expect(resolveDividerVariant(true, 'solid')).toBe('solid');
    });

    it('variant takes precedence over dashed when dashed=false and variant=dashed', () => {
      expect(resolveDividerVariant(false, 'dashed')).toBe('dashed');
    });
  });
});
