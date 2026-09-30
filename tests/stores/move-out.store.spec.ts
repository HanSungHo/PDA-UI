import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMoveOutStore } from '~/features/move-out/stores/move-out.store';

describe('useMoveOutStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stores and consumes pending Input Scope result once', () => {
    const store = useMoveOutStore();

    store.setPendingInputScopeResult({
      lotId: 'LOT-A',
      logo: 'LOGO-1',
      waferList: '01,05',
    });

    expect(store.pendingInputScopeResult?.lotId).toBe('LOT-A');

    const consumed = store.consumePendingInputScopeResult();
    expect(consumed).toEqual({
      lotId: 'LOT-A',
      logo: 'LOGO-1',
      waferList: '01,05',
    });
    expect(store.pendingInputScopeResult).toBeNull();
    expect(store.consumePendingInputScopeResult()).toBeNull();
  });
});
