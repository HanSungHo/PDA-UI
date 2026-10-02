import router from 'src/router';
import { describe, expect, it } from 'vitest';
import type { RouteLocationNormalizedGeneric } from 'vue-router';

describe('application router', () => {
  it('resolves the home, nested, and catch-all routes from the exported router instance', () => {
    expect(router.resolve('/').matched).toHaveLength(2);
    expect(router.resolve('/second').matched).toHaveLength(2);
    expect(router.resolve('/batch-lot-list').name).toBe('batch-lot-list');
    expect(router.resolve('/batch-move-in').matched).toHaveLength(1);
    expect(router.resolve('/batch-move-out').matched).toHaveLength(1);
    expect(router.resolve('/comment-list').matched).toHaveLength(1);
    expect(router.resolve('/remote-ramco').matched).toHaveLength(1);
    expect(router.resolve('/een-setting').matched[0]?.path).toBe('/een-setting');
    expect(router.resolve('/een-modify').matched[0]?.path).toBe('/een-modify');
    expect(router.resolve('/een-delete').matched[0]?.path).toBe('/een-delete');
    expect(router.resolve('/een-add').matched[0]?.path).toBe('/een-add');

    const remoteRamcoMockRoute = router.resolve(
      '/remote-ramco?mock=remote-ramco&mockCase=lot-hold&lotId=LOT-DEMO',
    );
    expect(remoteRamcoMockRoute.path).toBe('/remote-ramco');
    expect(remoteRamcoMockRoute.query).toMatchObject({
      mock: 'remote-ramco',
      mockCase: 'lot-hold',
    });
    const routeProps = remoteRamcoMockRoute.matched[0]?.props;
    expect(routeProps).toHaveProperty('default');
    if (routeProps && typeof routeProps === 'object' && typeof routeProps.default === 'function') {
      const props = routeProps.default(
        remoteRamcoMockRoute as unknown as RouteLocationNormalizedGeneric,
      ) as { initialLotId: string };
      expect(props).toEqual({ initialLotId: 'LOT-DEMO' });
    } else {
      throw new Error('Remote Ramco route props callback was not registered');
    }

    const notFoundRoute = router.resolve('/missing-page');
    expect(notFoundRoute.path).toBe('/missing-page');
    expect(notFoundRoute.matched).toHaveLength(1);
  });
});
