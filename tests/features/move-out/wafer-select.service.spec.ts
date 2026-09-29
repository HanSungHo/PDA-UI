import { beforeEach, describe, expect, it, vi } from 'vitest';

import { waferSelectMock } from '~/features/move-out/mocks/wafer-select.mock';
import { waferSelectService } from '~/features/move-out/services/wafer-select.service';

vi.mock('~/features/move-out/mocks/wafer-select.mock', () => ({
  waferSelectMock: {
    dummyEqpInfo: vi.fn(),
    lotLastEventCount: vi.fn(),
    lotLastEventSlot: vi.fn(),
    dummyEqpInput: vi.fn(),
  },
}));

describe('WaferSelectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(waferSelectMock.dummyEqpInfo).mockImplementation((eqpId: string) => ({
      EQPID: eqpId,
    }));

    vi.mocked(waferSelectMock.lotLastEventCount).mockReturnValue({
      CREATECATEGORY: 'COUNT',
      LASTEVENTCOMMENT: 'COUNT:12',
    });

    vi.mocked(waferSelectMock.lotLastEventSlot).mockReturnValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: 'SLOT : 01(EQP01),02(EQP01),06(EQP02)',
    });

    vi.mocked(waferSelectMock.dummyEqpInput).mockImplementation((comment: string) => ({
      LOTCOMMENT: comment,
      MSG: '',
    }));

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('getDummyEqpInfo', () => {
    it('returns equipment information', async () => {
      const result = await waferSelectService.getDummyEqpInfo('EQP01', 'LOT001');

      expect(result).toEqual({
        EQPID: 'EQP01',
      });

      expect(waferSelectMock.dummyEqpInfo).toHaveBeenCalledWith('EQP01');
    });
  });

  describe('getLotLastEvent', () => {
    it('returns COUNT response when category is COUNT', async () => {
      const result = await waferSelectService.getLotLastEvent('LOT001', 'ETCH', 'COUNT');

      expect(result).toEqual({
        CREATECATEGORY: 'COUNT',
        LASTEVENTCOMMENT: 'COUNT:12',
      });

      expect(waferSelectMock.lotLastEventCount).toHaveBeenCalledOnce();
      expect(waferSelectMock.lotLastEventSlot).not.toHaveBeenCalled();
    });

    it('returns SLOT response when category is SLOT', async () => {
      const result = await waferSelectService.getLotLastEvent('LOT001', 'ETCH', 'SLOT');

      expect(result).toEqual({
        CREATECATEGORY: 'SLOT',
        LASTEVENTCOMMENT: 'SLOT : 01(EQP01),02(EQP01),06(EQP02)',
      });

      expect(waferSelectMock.lotLastEventSlot).toHaveBeenCalledOnce();
      expect(waferSelectMock.lotLastEventCount).not.toHaveBeenCalled();
    });

    it('returns SLOT response for non-COUNT category', async () => {
      const result = await waferSelectService.getLotLastEvent('LOT001', 'ETCH', 'OTHER');

      expect(result.CREATECATEGORY).toBe('SLOT');
      expect(waferSelectMock.lotLastEventSlot).toHaveBeenCalledOnce();
    });
  });

  describe('dummyEqpInput', () => {
    it('returns submit result', async () => {
      const result = await waferSelectService.dummyEqpInput('LOT001', 'SLOT', 'LOT001.01');

      expect(result).toEqual({
        LOTCOMMENT: 'LOT001.01',
        MSG: '',
      });

      expect(waferSelectMock.dummyEqpInput).toHaveBeenCalledWith('LOT001.01');
    });

    it('supports empty comment', async () => {
      const result = await waferSelectService.dummyEqpInput('LOT001', 'SLOT', '');

      expect(result).toEqual({
        LOTCOMMENT: '',
        MSG: '',
      });
    });
  });
});
