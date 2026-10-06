import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useBatchsubStore } from '../../../src/features/batchsub/stores/batchsub.store';

describe('batchsub.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('stores selected JALOTNAME and clears it', () => {
    const store = useBatchsubStore();

    store.complete({ JALOTNAME: 'LOT2026092201 01' });
    expect(store.result).toEqual({ JALOTNAME: 'LOT2026092201 01' });

    store.clearResult();
    expect(store.result).toBeUndefined();
  });

  it('stores empty JALOTNAME on cancel', () => {
    const store = useBatchsubStore();

    store.cancel();
    expect(store.result).toEqual({ JALOTNAME: '' });
  });
});
