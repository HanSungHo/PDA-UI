import {
  extractPrInfo,
  isValidDateLength,
  isValidPrLength,
  stripPumpBarcode,
} from 'src/features/pr-change/utils/pr-change.util';
import { describe, expect, it } from 'vitest';

describe('pr-change.util (PRChangeActivity helpers)', () => {
  describe('stripPumpBarcode', () => {
    it('rejects values of 2 characters or fewer', () => {
      expect(stripPumpBarcode('')).toBeNull();
      expect(stripPumpBarcode('ab')).toBeNull();
    });

    it('drops the scanner prefix and check character', () => {
      expect(stripPumpBarcode('$PUMP-001#')).toBe('PUMP-001');
      expect(stripPumpBarcode('abc')).toBe('b');
    });
  });

  describe('isValidPrLength', () => {
    it.each([25, 28, 29])('accepts a %i character barcode', (length) => {
      expect(isValidPrLength('x'.repeat(length))).toBe(true);
    });

    it.each([0, 24, 26, 27, 30])('rejects a %i character barcode', (length) => {
      expect(isValidPrLength('x'.repeat(length))).toBe(false);
    });
  });

  describe('isValidDateLength', () => {
    it('only accepts 12 characters', () => {
      expect(isValidDateLength('202610270900')).toBe(true);
      expect(isValidDateLength('20261027090')).toBe(false);
      expect(isValidDateLength('2026102709000')).toBe(false);
    });
  });

  describe('extractPrInfo', () => {
    it('parses a 25 character barcode', () => {
      expect(extractPrInfo('1001' + '0450' + 'ABCDEF' + 'LT123' + '261231')).toEqual({
        PRID: '1001',
        VISCOSITY: '0450',
        PRLOTNO: 'LT123',
        VALIDATE: '261231',
      });
    });

    it('parses a 28 character barcode and appends the sub lot with a dash', () => {
      expect(extractPrInfo('1001' + '0450' + 'ABCDEF' + 'LT123' + '456' + '261231')).toEqual({
        PRID: '1001',
        VISCOSITY: '0450',
        PRLOTNO: 'LT123-456',
        VALIDATE: '261231',
      });
    });

    it('parses a 29 character barcode with the legacy offsets', () => {
      const barcode = '1001' + '0450' + 'ABCDEF' + 'LT1234' + '56' + '0' + '261231';
      expect(barcode).toHaveLength(29);
      expect(extractPrInfo(barcode)).toEqual({
        PRID: '1001',
        VISCOSITY: '0450',
        PRLOTNO: `${barcode.substring(14, 20)}-${barcode.substring(19, 22)}`,
        VALIDATE: barcode.substring(23),
      });
    });

    it('returns empty values for unsupported lengths', () => {
      expect(extractPrInfo('short')).toEqual({
        PRID: '',
        VISCOSITY: '',
        PRLOTNO: '',
        VALIDATE: '',
      });
    });
  });
});
