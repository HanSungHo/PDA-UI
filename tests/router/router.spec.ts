import router from 'src/router';
import { describe, expect, it } from 'vitest';

describe('application router', () => {
  it('resolves the home, nested, and catch-all routes from the exported router instance', () => {
    expect(router.resolve('/').matched).toHaveLength(2);
    expect(router.resolve('/second').matched).toHaveLength(2);
    expect(router.resolve('/batch-lot-list').name).toBe('batch-lot-list');
    expect(router.resolve('/batch-move-in').matched).toHaveLength(1);
    expect(router.resolve('/batch-move-out').matched).toHaveLength(1);
    expect(router.resolve('/comment-list').matched).toHaveLength(1);

    const notFoundRoute = router.resolve('/missing-page');
    expect(notFoundRoute.path).toBe('/missing-page');
    expect(notFoundRoute.matched).toHaveLength(1);
  });
});
