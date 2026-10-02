import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useWaferSkipStore } from '~/features/move-out/stores/wafer-skip.store';

describe('useWaferSkipStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('accepts legacy uppercase TYPEVALUE reason keys from LOTINFO', () => {
    const store = useWaferSkipStore();

    store.start({
      waferQty: '25',
      machineQty: '20',
      reasonList: JSON.stringify([{ TYPEVALUE: 'REWORK' }, { TYPEVALUE: 'EQUIPMENT ERROR' }]),
    });

    expect(store.input?.reasonList).toEqual(['REWORK', 'EQUIPMENT ERROR']);
  });

  it('ignores camelCase reason keys because WaferSkipActivity reads TYPEVALUE only', () => {
    const store = useWaferSkipStore();

    store.start({
      waferQty: '25',
      machineQty: '20',
      reasonList: JSON.stringify([{ typeValue: 'REWORK' }]),
    });

    expect(store.input?.reasonList).toEqual([]);
  });

  it('does not expose mock-data loader in production store API', () => {
    const store = useWaferSkipStore();

    expect('loadMock' in store).toBe(false);
  });
});
