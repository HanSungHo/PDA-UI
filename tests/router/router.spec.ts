import { createPinia } from 'pinia';
import createAppRouter from 'src/router';
import { describe, expect, it } from 'vitest';

describe('application router', () => {
  it('creates a router that resolves and navigates all declared route types', async () => {
    const router = await createAppRouter({
      store: createPinia(),
    });

    await router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.matched).toHaveLength(2);

    await router.push('/second');
    expect(router.currentRoute.value.path).toBe('/second');
    expect(router.currentRoute.value.matched).toHaveLength(2);

    await router.push('/missing-page');
    expect(router.currentRoute.value.path).toBe('/missing-page');
    expect(router.currentRoute.value.matched).toHaveLength(1);
  });
});
