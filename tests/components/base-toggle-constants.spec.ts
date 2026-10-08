import { describe, expect, it } from 'vitest';

import {
  baseToggleDefaults,
  normalizeCheckedValue,
} from '../../src/components/base/toggle/base-toggle.constants';

describe('base-toggle.constants', () => {
  describe('baseToggleDefaults', () => {
    it('matches the documented default contract', () => {
      expect(baseToggleDefaults).toEqual({
        modelValue: false,
        variant: 'text',
        checkedValue: true,
        uncheckedValue: false,
        ariaLabel: 'Toggle',
        disabled: false,
        readonly: false,
        loading: false,
        required: false,
        size: 'medium',
        status: 'default',
        error: false,
        block: false,
        labelPlacement: 'end',
      });
    });
  });

  describe('normalizeCheckedValue', () => {
    it('returns true only for the strict boolean true', () => {
      expect(normalizeCheckedValue(true)).toBe(true);
    });

    it('returns false for the strict boolean false', () => {
      expect(normalizeCheckedValue(false)).toBe(false);
    });

    it('returns false for a truthy string because the public model is boolean', () => {
      expect(normalizeCheckedValue('true')).toBe(false);
    });

    it('returns false for a non-zero number', () => {
      expect(normalizeCheckedValue(1)).toBe(false);
    });

    it('normalizes a custom checked value', () => {
      expect(normalizeCheckedValue('Y', 'Y')).toBe(true);
      expect(normalizeCheckedValue('N', 'Y')).toBe(false);
    });
  });
});
