import { normalizeLotInput } from 'src/features/esheet/utils/normalize-lot-input';
import { describe, expect, it } from 'vitest';

describe('normalizeLotInput', () => {
  it('normalizes manually entered LOT values', () => {
    expect(normalizeLotInput('wp00001')).toBe('WP00001');
    expect(normalizeLotInput('wp00001  ')).toBe('WP00001');
  });

  it('removes the scanner prefix and trailing control character', () => {
    expect(normalizeLotInput(' WP00001X')).toBe('WP00001');
    expect(normalizeLotInput(' $WP00001X')).toBe('WP00001');
  });

  it('returns an empty string for an empty scanner payload', () => {
    expect(normalizeLotInput(' ')).toBe('');
  });
});
