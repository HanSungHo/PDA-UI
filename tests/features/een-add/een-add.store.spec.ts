import { createPinia, setActivePinia } from 'pinia';
import { useEenAddStore } from 'src/features/een-add/stores/een-add.store';
import { beforeEach, describe, expect, it } from 'vitest';

describe('useEenAddStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('publishes LOTID once for the screen returning from EEN Add', () => {
    const store = useEenAddStore();

    expect(store.consumeReturnLotId()).toBe('');
    store.setReturnLotId('LOT-123');

    expect(store.consumeReturnLotId()).toBe('LOT-123');
    expect(store.consumeReturnLotId()).toBe('');
  });
});
