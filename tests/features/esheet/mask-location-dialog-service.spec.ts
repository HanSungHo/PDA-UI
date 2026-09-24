import { describe, expect, it, vi } from 'vitest';

import { checkPhotoSample } from '~/features/esheet/services/mask-location-dialog.service';

describe('checkPhotoSample', () => {
  it('should return empty stop message', async () => {
    vi.useFakeTimers();

    const promise = checkPhotoSample('EQ001');

    vi.runAllTimers();

    const result = await promise;

    expect(result.stop).toBe('');

    vi.useRealTimers();
  });

  it('should return stop message when location contains STOP', async () => {
    vi.useFakeTimers();

    const promise = checkPhotoSample('STOP-EQ');

    vi.runAllTimers();

    const result = await promise;

    expect(result.stop).toContain('STOP-EQ');

    vi.useRealTimers();
  });
});
