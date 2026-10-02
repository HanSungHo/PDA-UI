import { queryString, routeString } from 'src/features/move-out/utils/route-query';
import { describe, expect, it } from 'vitest';

describe('move-out route query utilities', () => {
  it('returns a string query value and ignores repeated query values', () => {
    expect(queryString({ query: { lotId: 'LOT-001' } }, 'lotId')).toBe('LOT-001');
    expect(queryString({ query: { lotId: ['LOT-001', 'LOT-002'] } }, 'lotId')).toBe('');
  });

  it('uses fallback when the query value is missing', () => {
    expect(queryString({ query: {} }, 'lotId', 'DEFAULT')).toBe('DEFAULT');
    expect(queryString(null, 'lotId', 'DEFAULT')).toBe('DEFAULT');
  });

  it('falls back to params for routes that support a path lot id', () => {
    expect(routeString({ query: {}, params: { lotId: 'LOT-PARAM-001' } }, 'lotId')).toBe(
      'LOT-PARAM-001',
    );
    expect(
      routeString(
        { query: { lotId: 'LOT-QUERY-001' }, params: { lotId: 'LOT-PARAM-001' } },
        'lotId',
      ),
    ).toBe('LOT-QUERY-001');
  });
});
