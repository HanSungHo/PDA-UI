import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useWaferSelectAitStore } from '~/features/waferselect-ait/stores/waferselect-ait.store';

describe('AIT session handoff', () => {
  beforeEach(() => setActivePinia(createPinia()));
  const result = { SEQUENCE: '1', SELECTEDWAFERLIST: 'W.01', SELECTEDMACHINE: '' };

  it('starts with raw extras and clears any old result', () => {
    const store = useWaferSelectAitStore();
    store.complete(result);
    const input = { CATEGORY: 'ETC', LOTID: ' LOT ', SEQUENCE: ' SEQ ' };
    store.start(input);
    expect(store.input).toEqual(input);
    expect(store.input).not.toBe(input);
    expect(store.result).toBeUndefined();
  });

  it('publishes a confirmed result for consumption once', () => {
    const store = useWaferSelectAitStore();
    store.complete(result);
    expect(store.consumeResult()).toEqual(result);
    expect(store.consumeResult()).toBeUndefined();
  });

  it('cancellation discards input and stale result', () => {
    const store = useWaferSelectAitStore();
    store.start({ LOTID: 'LOT' });
    store.complete(result);
    store.cancel();
    expect(store.input).toBeUndefined();
    expect(store.result).toBeUndefined();
  });
});
