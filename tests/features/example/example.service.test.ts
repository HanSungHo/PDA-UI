import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: { get },
}));

import { getExampleSummaries } from '../../../src/features/example/services/example.service';

describe('getExampleSummaries', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('returns the response payload without exposing AxiosResponse', async () => {
    const summaries = [{ id: 'example-1', name: 'Example', status: 'active' as const }];
    get.mockResolvedValue({
      config: {},
      data: summaries,
      headers: {},
      status: 200,
      statusText: 'OK',
    });

    await expect(getExampleSummaries()).resolves.toEqual(summaries);
  });
});
