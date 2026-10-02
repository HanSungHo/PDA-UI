import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useWaferSelectStore } from '~/features/move-out/stores/wafer-select.store';

describe('useWaferSelectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('normalizes SLOT intent extras and clears previous result', () => {
    const store = useWaferSelectStore();

    store.complete({
      sequence: 'OLD',
      selectedWaferList: 'OLD.01',
      selectedMachine: 'EQP01',
    });

    store.start({
      SEQUENCE: ' SEQ001 ',
      FIXEDCOUNT: '3',
      LOTID: ' LOT001 ',
      CATEGORY: 'SLOT',
      EDITABLE: 'N',
      AREA: ' DIFF ',
      EXISTWAFERLIST: 'LOT001.01',
      DISABLEWAFERLIST: 'LOT001.02',
      SELECTWAFERLIST: 'LOT001.01',
    });

    expect(store.input).toEqual({
      sequence: 'SEQ001',
      fixedCount: 3,
      lotId: 'LOT001',
      category: 'SLOT',
      editable: false,
      area: 'DIFF',
      existingWaferList: 'LOT001.01',
      disableWaferList: 'LOT001.02',
      selectWaferList: 'LOT001.01',
    });

    expect(store.result).toBeUndefined();
  });

  it('supports COUNT category', () => {
    const store = useWaferSelectStore();

    store.start({
      CATEGORY: 'COUNT',
      FIXEDCOUNT: '10',
    });

    expect(store.input?.category).toBe('COUNT');
    expect(store.input?.fixedCount).toBe(10);
  });

  it('uses defaults for invalid values', () => {
    const store = useWaferSelectStore();

    store.start({
      FIXEDCOUNT: 'not-a-number',
      CATEGORY: 'UNKNOWN',
      EDITABLE: 'Y',
    });

    expect(store.input).toEqual({
      sequence: '',
      fixedCount: 0,
      lotId: '',
      category: '',
      editable: true,
      area: '',
      existingWaferList: '',
      disableWaferList: '',
      selectWaferList: '',
    });
  });

  it('converts zero and negative fixedCount to 0', () => {
    const store = useWaferSelectStore();

    store.start({
      FIXEDCOUNT: '-5',
    });

    expect(store.input?.fixedCount).toBe(0);

    store.start({
      FIXEDCOUNT: '0',
    });

    expect(store.input?.fixedCount).toBe(0);
  });

  it('supports complete clear and clearResult', () => {
    const store = useWaferSelectStore();

    const result = {
      sequence: 'SEQ001',
      selectedWaferList: 'LOT001.01',
      selectedMachine: '',
    };

    store.start({ SEQUENCE: 'SEQ001' });

    store.complete(result);

    expect(store.result).toEqual(result);

    store.clear();

    expect(store.input).toBeUndefined();
    expect(store.result).toBeUndefined();

    store.clearResult();

    expect(store.result).toBeUndefined();
  });

  it('does not expose mock-data loader in production store API', () => {
    const store = useWaferSelectStore();

    expect('loadMock' in store).toBe(false);
  });
});
