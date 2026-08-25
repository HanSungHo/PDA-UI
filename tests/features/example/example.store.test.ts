import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../src/services/api-error';

const { getExampleSummaries } = vi.hoisted(() => ({
  getExampleSummaries: vi.fn(),
}));

vi.mock('../../../src/features/example/services/example.service', () => ({
  getExampleSummaries,
}));

import { useExampleStore } from '../../../src/features/example/stores/example.store';

describe('useExampleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getExampleSummaries.mockReset();
  });

  it('loads summaries and clears a previous error', async () => {
    const summaries = [{ id: 'example-1', name: 'Example', status: 'active' as const }];
    getExampleSummaries.mockResolvedValue(summaries);
    const store = useExampleStore();
    store.error = new ApiError('Previous error');

    const request = store.fetchSummaries();

    expect(store.loading).toBe(true);
    await request;
    expect(store.items).toEqual(summaries);
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('stores a normalized error and always stops loading', async () => {
    const failure = new Error('Network unavailable');
    getExampleSummaries.mockRejectedValue(failure);
    const store = useExampleStore();

    await store.fetchSummaries();

    expect(store.items).toEqual([]);
    expect(store.error).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'Network unavailable',
      status: null,
    });
    expect(store.loading).toBe(false);
  });
});
