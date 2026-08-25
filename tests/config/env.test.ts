import { describe, expect, it } from 'vitest';

import { getRequiredEnv } from '../../src/config/env';

describe('getRequiredEnv', () => {
  it('returns a trimmed required environment value', () => {
    expect(
      getRequiredEnv('VITE_API_BASE_URL', {
        VITE_API_BASE_URL: ' https://api.example.com ',
      }),
    ).toBe('https://api.example.com');
  });

  it.each([undefined, '', '   '])('rejects a missing required environment value: %s', (value) => {
    expect(() =>
      getRequiredEnv('VITE_API_BASE_URL', {
        VITE_API_BASE_URL: value,
      }),
    ).toThrow('Missing required environment variable: VITE_API_BASE_URL');
  });
});
