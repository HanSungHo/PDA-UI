import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { waferSelectMocks } from '~/features/move-out/mocks/wafer-select.mock';
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

  it('loads basic mock scenario', () => {
    const store = useWaferSelectStore();

    store.complete(completedResult);

    store.loadMock('basic');

    const basic = waferSelectMocks.basic();
    expect(store.input).toEqual({
      sequence: 'SEQ001',
      fixedCount: 3,
      lotId: 'LOT001',
      category: 'SLOT',
      editable: true,
      area: 'ETCH',
      existingWaferList: basic.EXISTWAFERLIST,
      disableWaferList: '',
      selectWaferList: '',
    });
    expect(store.result).toBeUndefined();
  });

  it('loads diffArea mock scenario', () => {
    const store = useWaferSelectStore();

    store.loadMock('diffArea');

    const diffArea = waferSelectMocks.diffArea();
    expect(store.input).toEqual({
      sequence: 'SEQ002',
      fixedCount: 5,
      lotId: 'LOT002',
      category: 'SLOT',
      editable: true,
      area: 'DIFF',
      existingWaferList: diffArea.EXISTWAFERLIST,
      disableWaferList: diffArea.DISABLEWAFERLIST,
      selectWaferList: diffArea.SELECTWAFERLIST,
    });
  });

  it('loads readonly mock scenario', () => {
    const store = useWaferSelectStore();

    store.loadMock('readonly');

    const readonly = waferSelectMocks.readonly();
    expect(store.input).toEqual({
      sequence: 'SEQ003',
      fixedCount: 5,
      lotId: 'LOT003',
      category: 'SLOT',
      editable: false,
      area: 'DIFF',
      existingWaferList: readonly.EXISTWAFERLIST,
      disableWaferList: '',
      selectWaferList: '',
    });
  });

  it('loads count mock scenario', () => {
    const store = useWaferSelectStore();

    store.loadMock('count');

    expect(store.input).toEqual({
      sequence: 'SEQ004',
      fixedCount: 0,
      lotId: 'LOT004',
      category: 'COUNT',
      editable: true,
      area: 'ETCH',
      existingWaferList: '',
      disableWaferList: '',
      selectWaferList: '',
    });
  });

  it('loads disabled mock scenario', () => {
    const store = useWaferSelectStore();

    store.loadMock('disabled');

    const disabled = waferSelectMocks.disabled();
    expect(store.input).toEqual({
      sequence: 'SEQ005',
      fixedCount: 10,
      lotId: 'LOT005',
      category: 'SLOT',
      editable: true,
      area: 'ETCH',
      existingWaferList: disabled.EXISTWAFERLIST,
      disableWaferList: disabled.DISABLEWAFERLIST,
      selectWaferList: '',
    });
  });

  it('creates isolated input objects when loading mocks repeatedly', () => {
    const store = useWaferSelectStore();

    store.loadMock('basic');

    if (store.input) {
      store.input.lotId = 'MODIFIED';
    }

    store.loadMock('basic');

    expect(store.input?.lotId).toBe('LOT001');
  });
});
