import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useWaferSkipStore } from '~/features/move-out/stores/wafer-skip.store';

describe('useWaferSkipStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const store = useWaferSkipStore();
    store.clear();
    store.clearResult();
  });

  it('maps Android intent extras and limits reasons to the first eleven values', () => {
    const store = useWaferSkipStore();
    const reasonList = Array.from({ length: 12 }, (_, index) => ({ typeValue: `REASON-${index}` }));

    store.start({
      waferQty: '25',
      machineQty: '20',
      reasonList: JSON.stringify(reasonList),
    });

    expect(store.input).toEqual({
      waferQty: '25',
      machineQty: '20',
      reasonList: Array.from({ length: 11 }, (_, index) => `REASON-${index}`),
    });
  });

  it('ignores malformed, non-array, and invalid reason entries', () => {
    const store = useWaferSkipStore();

    store.start({ waferQty: '25', machineQty: '20', reasonList: '{invalid-json' });
    expect(store.input?.reasonList).toEqual([]);

    store.start({
      waferQty: '25',
      machineQty: '20',
      reasonList: JSON.stringify({ typeValue: 'REWORK' }),
    });
    expect(store.input?.reasonList).toEqual([]);

    store.start({
      waferQty: '25',
      machineQty: '20',
      reasonList: JSON.stringify([null, { typeValue: 123 }, {}, { typeValue: 'REWORK' }]),
    });
    expect(store.input?.reasonList).toEqual(['REWORK']);
  });

  it('retains the correction result until the flow is cleared', () => {
    const store = useWaferSkipStore();

    store.start({ waferQty: '25', machineQty: '20', reasonList: '[]' });
    store.complete({ skipWafer: '5', reason: 'REWORK', minusString: '' });

    expect(store.result).toEqual({ skipWafer: '5', reason: 'REWORK', minusString: '' });

    store.clear();
    store.clearResult();

    expect(store.input).toBeUndefined();
    expect(store.result).toBeUndefined();
  });

  it('loads isolated mock data for test scenarios', () => {
    const store = useWaferSkipStore();

    store.complete({ skipWafer: '5', reason: 'REWORK', minusString: '' });
    store.loadMock();

    expect(store.input).toEqual({
      waferQty: '25.5',
      machineQty: '20.0',
      reasonList: ['REWORK', 'EQUIPMENT ERROR', 'PROCESS CHANGE'],
    });
    expect(store.result).toBeUndefined();

    store.input?.reasonList.push('CHANGED');
    store.loadMock();

    expect(store.input?.reasonList).toEqual(['REWORK', 'EQUIPMENT ERROR', 'PROCESS CHANGE']);
  });
});
