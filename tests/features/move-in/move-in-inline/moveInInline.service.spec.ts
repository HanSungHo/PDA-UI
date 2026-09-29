import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockInlineInfo,
  mockInlineSet,
  mockMaskLocation,
} from '~/features/move-in/mocks/move-in-inline.mocks';
import { moveInInlineService } from '~/features/move-in/services/move-in-inline.service';

async function resolveAfterDelay<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(220);
  return promise;
}

describe('moveInInlineService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInlineInfo', () => {
    it('Wait 220ms before returning the result.', async () => {
      const spy = vi.fn();
      moveInInlineService.getInlineInfo('LOT001', '1200').then(spy);

      await vi.advanceTimersByTimeAsync(219);
      expect(spy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns the correct mock data', async () => {
      const result = await resolveAfterDelay(moveInInlineService.getInlineInfo('LOT001', '1200'));

      expect(result).toEqual(mockInlineInfo);
    });

    it('returns an independent copy; modifying the result does not affect the original mock.', async () => {
      const result = await resolveAfterDelay(moveInInlineService.getInlineInfo('LOT001', '1200'));
      const originalProduct = mockInlineInfo.info.product;

      result.info.product = 'CHANGED';

      expect(mockInlineInfo.info.product).toBe(originalProduct);
    });

    it('It does not depend on the passed-in `lotId` or `operation` because a hardcoded mock is being used.', async () => {
      const result = await resolveAfterDelay(
        moveInInlineService.getInlineInfo('LOT_BAT_KY', 'OP_BAT_KY'),
      );

      expect(result).toEqual(mockInlineInfo);
    });
  });

  describe('getMaskLocationInfo', () => {
    it('Wait 220ms before returning the result.', async () => {
      const spy = vi.fn();
      moveInInlineService.getMaskLocationInfo('MT001').then(spy);

      await vi.advanceTimersByTimeAsync(219);
      expect(spy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('Return mock data but override `maskTag` based on the passed parameter.', async () => {
      const result = await resolveAfterDelay(moveInInlineService.getMaskLocationInfo('MT999'));

      expect(result).toEqual({ ...mockMaskLocation, maskTag: 'MT999' });
    });

    it('returns an independent copy; modifying the result does not affect the original mock.', async () => {
      const result = await resolveAfterDelay(moveInInlineService.getMaskLocationInfo('MT001'));
      const originalProduct = mockMaskLocation.product;

      result.product = 'CHANGED';

      expect(mockMaskLocation.product).toBe(originalProduct);
    });
  });

  describe('inlineSet', () => {
    const baseParams = {
      lotId: 'LOT001',
      operation: '1200',
      maskTag: 'MT001',
      quantity: '25',
      isFullInline: 'Y' as const,
      items: [
        { subOperation: '01', identCode: 'C' },
        { subOperation: '02', identCode: 'E' },
        { subOperation: '03', identCode: 'D' },
      ],
    };

    it('Wait 220ms before returning the result.', async () => {
      const spy = vi.fn();
      moveInInlineService.inlineSet(baseParams).then(spy);

      await vi.advanceTimersByTimeAsync(219);
      expect(spy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('returns the correct mock data', async () => {
      const result = await resolveAfterDelay(moveInInlineService.inlineSet(baseParams));

      expect(result).toEqual(mockInlineSet);
    });

    it('returns an independent copy; modifying the result does not affect the original mock.', async () => {
      const result = await resolveAfterDelay(moveInInlineService.inlineSet(baseParams));
      const originalEqpGroup = mockInlineSet.eqpGroup;

      result.eqpGroup = 'CHANGED';

      expect(mockInlineSet.eqpGroup).toBe(originalEqpGroup);
    });

    it('It does not depend on the passed parameters because it uses hardcoded mock data.', async () => {
      const result = await resolveAfterDelay(
        moveInInlineService.inlineSet({ ...baseParams, isFullInline: 'N', items: [] }),
      );

      expect(result).toEqual(mockInlineSet);
    });
  });
});
