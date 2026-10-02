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

  it('publishes the created setting record once for its matching LOT', () => {
    const store = useEenAddStore();
    const result = {
      lotId: 'LOT-123',
      facility: 'GUMI',
      product: 'HIFI',
      route: 'PHOTO',
      operation: '1300',
      poDesc: 'Exposure',
      actionPoint: 'MOVEIN',
      tagId: 'TAG-001',
      tagComment: 'Added comment',
    };

    store.setSettingResult(result);

    expect(store.consumeSettingResult('LOT-123')).toEqual(result);
    expect(store.consumeSettingResult('LOT-123')).toBeNull();
  });
});
