import { createPinia, setActivePinia } from 'pinia';
import { useWetAutoStore } from 'src/features/wet-auto/stores/wet-auto.store';
import type { WetAutoSessionState } from 'src/features/wet-auto/types/wet-auto.types';
import { describe, expect, it } from 'vitest';

const emptySession: WetAutoSessionState = {
  machineInput: '',
  frontInput: '',
  rearInput: '',
  reservationTime: '',
  recipe: '',
  frontLot: {
    product: '',
    operation: '',
    quantity: '',
    operationCode: '',
    subOperation: '',
    processStep: '',
    opType: '',
    operSequence: '',
  },
  rearLot: {
    product: '',
    operation: '',
    quantity: '',
    operationCode: '',
    subOperation: '',
    processStep: '',
    opType: '',
    operSequence: '',
  },
  frontLotEnabled: false,
  rearLotEnabled: false,
  carryEnabled: false,
  frontCommentEnabled: false,
  rearCommentEnabled: false,
  startEnabled: true,
  carryChecked: false,
  bayOptions: [],
  stockerOptions: [],
  selectedBay: '',
  selectedStocker: '',
  bayEnabled: true,
  stockerEnabled: true,
  cachedBay: '',
  cachedStocker: '',
  focusTarget: 'machine',
};

describe('WetAutoStore', () => {
  it('copies optional equipment state, consumes once, and clears snapshots', () => {
    setActivePinia(createPinia());
    const store = useWetAutoStore();
    store.saveSessionState(emptySession);
    expect(store.consumeSessionState()).toEqual(emptySession);
    expect(store.consumeSessionState()).toBeUndefined();

    store.saveSessionState({ ...emptySession, equipment: { MAINEQPID: 'MAIN' } });
    expect(store.consumeSessionState()?.equipment).toEqual({ MAINEQPID: 'MAIN' });
    store.saveSessionState(emptySession);
    store.clearSessionState();
    expect(store.consumeSessionState()).toBeUndefined();
  });
});
