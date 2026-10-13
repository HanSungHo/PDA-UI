import { createPinia, setActivePinia } from 'pinia';
import { useRemoteFurnaceKjStore } from 'src/features/remote-furnace-kj';
import { beforeEach, describe, expect, it } from 'vitest';

describe('useRemoteFurnaceKjStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('consumes the successful LOT return exactly once', () => {
    const store = useRemoteFurnaceKjStore();
    store.setReturnLotId('LOT-KJ-RETURN');

    expect(store.consumeReturnLotId()).toBe('LOT-KJ-RETURN');
    expect(store.consumeReturnLotId()).toBe('');
  });

  it('restores an in-progress KJ draft only for its originating LOT', () => {
    const store = useRemoteFurnaceKjStore();
    const draft = {
      lotId: 'LOT-KJ-001',
      batchId: 'BATCH-KJ-01',
      batchRows: [],
      equipmentInput: 'KJ-01',
      standardMachine: 'KJ-01',
      externalMachine: '',
      recipeOptions: ['RCP-KJ-01'],
      selectedRecipe: 'RCP-KJ-01',
      portOptions: ['1', '2'],
      selectedPort: '2',
      portStatus: 'IDLE',
      dummyMode: 'F' as const,
      isReserved: false,
      isLotEligible: true,
      isInterlocked: false,
      startEnabled: false,
      restartEnabled: false,
      clearPortEnabled: false,
    };
    store.setDraft(draft);

    expect(store.consumeDraft('OTHER-LOT')).toBeUndefined();
    store.setDraft(draft);
    expect(store.consumeDraft('LOT-KJ-001')).toEqual(draft);
    expect(store.consumeDraft('LOT-KJ-001')).toBeUndefined();
  });
});
