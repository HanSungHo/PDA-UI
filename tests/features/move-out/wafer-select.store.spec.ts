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

  it('loads basic mock', () => {
    const store = useWaferSelectStore();

    store.complete({
      sequence: 'OLD',
      selectedWaferList: '',
      selectedMachine: '',
    });

    store.loadMock('basic');

    expect(store.result).toBeUndefined();
    expect(store.input).toBeDefined();
  });

  it('loads diffArea mock', () => {
    const store = useWaferSelectStore();

    store.loadMock('diffArea');

    expect(store.input).toBeDefined();
  });

  it('loads readonly mock', () => {
    const store = useWaferSelectStore();

    store.loadMock('readonly');

    expect(store.input).toBeDefined();
  });

  it('loads count mock', () => {
    const store = useWaferSelectStore();

    store.loadMock('count');

    expect(store.input).toBeDefined();
    expect(store.input?.category).toBe('COUNT');
  });

  it('loads disabled mock', () => {
    const store = useWaferSelectStore();

    store.loadMock('disabled');

    expect(store.input).toBeDefined();
  });

  it('creates a fresh input object when loadMock is called repeatedly', () => {
    const store = useWaferSelectStore();

    store.loadMock('basic');

    const original = store.input;

    if (store.input) {
      store.input.sequence = 'MODIFIED';
    }

    store.loadMock('basic');

    expect(store.input).not.toBe(original);
    expect(store.input?.sequence).not.toBe('MODIFIED');
  });
});
