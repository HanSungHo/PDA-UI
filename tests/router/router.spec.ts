import router from 'src/router';
import { describe, expect, it } from 'vitest';

describe('application router', () => {
  it('resolves the home, nested, and catch-all routes from the exported router instance', async () => {
    expect(router.resolve('/').matched).toHaveLength(2);
    expect(router.resolve('/second').matched).toHaveLength(2);
    expect(router.resolve('/batch-lot-list').name).toBe('batch-lot-list');
    expect(router.resolve('/batch-move-in').matched).toHaveLength(1);
    expect(router.resolve('/batch-move-out').matched).toHaveLength(1);
    expect(router.resolve('/comment-list').matched).toHaveLength(1);
    expect(router.resolve('/remote-ramco').matched).toHaveLength(1);

    const remoteRamcoMockRoute = router.resolve(
      '/remote-ramco?mock=remote-ramco&mockCase=lot-hold&lotId=LOT-DEMO',
    );
    expect(remoteRamcoMockRoute.path).toBe('/remote-ramco');
    expect(remoteRamcoMockRoute.query).toMatchObject({
      mock: 'remote-ramco',
      mockCase: 'lot-hold',
    });
    await router.push(remoteRamcoMockRoute.fullPath);
    const routeProps = router.currentRoute.value.matched[0]?.props;
    expect(routeProps).toHaveProperty('default');
    if (routeProps && typeof routeProps === 'object' && typeof routeProps.default === 'function') {
      const props = routeProps.default(router.currentRoute.value) as { initialLotId: string };
      expect(props).toEqual({ initialLotId: 'LOT-DEMO' });
    } else {
      throw new Error('Remote Ramco route props callback was not registered');
    }
    await router.push('/');

    const notFoundRoute = router.resolve('/missing-page');
    expect(notFoundRoute.path).toBe('/missing-page');
    expect(notFoundRoute.matched).toHaveLength(1);
  });
});
