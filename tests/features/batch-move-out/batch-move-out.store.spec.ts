import { createPinia, setActivePinia } from 'pinia';
import { useBatchMoveOutStore } from 'src/features/batch-move-out/stores/batch-move-out.store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('batch move out store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps the completed result until it is cleared', () => {
    const store = useBatchMoveOutStore();

    expect(store.result).toBeUndefined();

    store.complete({ ok: true, lotId: 'LOT-001' });
    expect(store.result).toEqual({ ok: true, lotId: 'LOT-001' });

    store.clearResult();
    expect(store.result).toBeUndefined();
  });
});
