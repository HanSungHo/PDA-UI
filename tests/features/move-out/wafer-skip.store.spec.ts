import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useWaferSelectStore } from '~/features/move-out/stores/wafer-select.store';
import type { WaferSelectResult } from '~/features/move-out/types/wafer-select.types';

const completedResult: WaferSelectResult = {
  sequence: 'SEQ001',
  selectedWaferList: 'LOT001.01',
  selectedMachine: 'EQP01',
};

describe('useWaferSelectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const store = useWaferSelectStore();
    store.clear();
    store.clearResult();
  });

  it('maps Android intent extras correctly', () => {
    const store = useWaferSelectStore();

    store.start({
      SEQUENCE: ' 10 ',
      FIXEDCOUNT: '25',
      LOTID: ' LOT001 ',
      CATEGORY: 'COUNT',
      EDITABLE: 'Y',
      AREA: ' ETCH ',
      EXISTWAFERLIST: '01,02,03',
      DISABLEWAFERLIST: '02',
      SELECTWAFERLIST: '01',
    });

    expect(store.input).toEqual({
      sequence: '10',
      fixedCount: 25,
      lotId: 'LOT001',
      category: 'COUNT',
      editable: true,
      area: 'ETCH',
      existingWaferList: '01,02,03',
      disableWaferList: '02',
      selectWaferList: '01',
    });
  });

  it('defaults invalid values', () => {
    const store = useWaferSelectStore();

    store.start({
      CATEGORY: 'INVALID',
      FIXEDCOUNT: '-1',
      LOTID: '',
    });

    expect(store.input?.category).toBe('');
    expect(store.input?.fixedCount).toBe(0);
  });

  it('supports SLOT category', () => {
    const store = useWaferSelectStore();

    store.start({
      CATEGORY: 'SLOT',
    });

    expect(store.input?.category).toBe('SLOT');
  });

  it('sets editable false when EDITABLE is N', () => {
    const store = useWaferSelectStore();

    store.start({
      EDITABLE: 'N',
    });

    expect(store.input?.editable).toBe(false);
  });

  it('defaults editable to true', () => {
    const store = useWaferSelectStore();

    store.start({});

    expect(store.input?.editable).toBe(true);
  });

  it('uses 0 when fixedCount is invalid', () => {
    const store = useWaferSelectStore();

    store.start({
      FIXEDCOUNT: 'abc',
    });

    expect(store.input?.fixedCount).toBe(0);
  });

  it('stores result until cleared', () => {
    const store = useWaferSelectStore();

    store.complete(completedResult);

    expect(store.result).toEqual(completedResult);
  });

  it('clears input and result', () => {
    const store = useWaferSelectStore();

    store.start({
      LOTID: 'LOT001',
    });

    store.complete(completedResult);

    store.clear();

    expect(store.input).toBeUndefined();
    expect(store.result).toBeUndefined();
  });

  it('clears result only', () => {
    const store = useWaferSelectStore();

    store.complete(completedResult);

    store.clearResult();

    expect(store.result).toBeUndefined();
  });

  it('does not expose mock-data loader in production store API', () => {
    const store = useWaferSelectStore();

    expect('loadMock' in store).toBe(false);
  });
});
