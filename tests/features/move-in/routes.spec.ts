import routes from 'src/router/routes';
import { describe, expect, it } from 'vitest';

describe('Move In routes', () => {
  it('mounts Move In Inline as a child route so the parent state stays alive', () => {
    const moveInRoute = routes.find((route) => route.name === 'move-in');
    const inlineRoute = moveInRoute?.children?.find((route) => route.name === 'move-in-inline');

    expect(inlineRoute).toMatchObject({ path: 'inline', name: 'move-in-inline' });
  });

  it('mounts the merged Batch LOT, Batch Move In, and Comment List screens as parent children', () => {
    const moveInRoute = routes.find((route) => route.name === 'move-in');
    const childNames = moveInRoute?.children?.map((route) => route.name);

    expect(childNames).toEqual(
      expect.arrayContaining([
        'move-in-batch-lot-list',
        'move-in-batch-move-in',
        'move-in-comment-list',
      ]),
    );
  });
});
