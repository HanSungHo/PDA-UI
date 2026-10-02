import { beforeEach, describe, expect, it, vi } from 'vitest';

import { waferSelectService } from '~/features/move-out/services/wafer-select.service';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

describe('WaferSelectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDummyEqpInfo', () => {
    it('posts DUMMYEQPINFO to the message endpoint', async () => {
      post.mockResolvedValueOnce({
        data: {
          result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { EQPID: 'EQP01' } }),
        },
      });

      const result = await waferSelectService.getDummyEqpInfo('EQP01', 'LOT001');

      expect(result).toEqual({
        EQPID: 'EQP01',
      });
      expect(post).toHaveBeenCalledWith('/hifos/DUMMYEQPINFO', {
        EQPID: 'EQP01',
        LOTNO: 'LOT001',
      });
    });
  });

  describe('getLotLastEvent', () => {
    it('posts LOTLSATEVENT and parses COUNT response', async () => {
      post.mockResolvedValueOnce({
        data: {
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: { CREATECATEGORY: 'COUNT', LASTEVENTCOMMENT: 'COUNT:12' },
          }),
        },
      });

      const result = await waferSelectService.getLotLastEvent('LOT001', 'ETCH', 'COUNT');

      expect(result).toEqual({
        CREATECATEGORY: 'COUNT',
        LASTEVENTCOMMENT: 'COUNT:12',
      });
      expect(post).toHaveBeenCalledWith('/hifos/LOTLSATEVENT', {
        LOTNAME: 'LOT001',
        AREA: 'ETCH',
      });
    });

    it('does not branch to static FE mocks for SLOT category', async () => {
      post.mockResolvedValueOnce({
        data: {
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              CREATECATEGORY: 'SLOT',
              LASTEVENTCOMMENT: 'SLOT : 01(EQP01),02(EQP01),06(EQP02)',
            },
          }),
        },
      });

      const result = await waferSelectService.getLotLastEvent('LOT001', 'ETCH', 'SLOT');

      expect(result).toEqual({
        CREATECATEGORY: 'SLOT',
        LASTEVENTCOMMENT: 'SLOT : 01(EQP01),02(EQP01),06(EQP02)',
      });
      expect(post).toHaveBeenCalledTimes(1);
    });
  });

  describe('dummyEqpInput', () => {
    it('posts DUMMYEQPINPUT and returns submit result', async () => {
      post.mockResolvedValueOnce({
        data: {
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: { LOTCOMMENT: 'LOT001.01', MSG: '' },
          }),
        },
      });

      const result = await waferSelectService.dummyEqpInput('LOT001', 'SLOT', 'LOT001.01');

      expect(result).toEqual({
        LOTCOMMENT: 'LOT001.01',
        MSG: '',
      });
      expect(post).toHaveBeenCalledWith('/hifos/DUMMYEQPINPUT', {
        LOTNAME: 'LOT001',
        LOTLASTEVENT: 'LOT001.01',
        CATEGORY: 'SLOT',
      });
    });

    it('throws the server error message on FAIL response', async () => {
      post.mockResolvedValueOnce({
        data: {
          result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'DUMMY input failed.' }),
        },
      });

      await expect(waferSelectService.dummyEqpInput('LOT001', 'SLOT', '')).rejects.toThrow(
        'DUMMY input failed.',
      );
    });
  });
});
