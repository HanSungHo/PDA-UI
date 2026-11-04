import { postAifMessage } from 'src/services/aif-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  remoteXrfRecipeService,
  ResponseDataToJsonUtil,
} from '../../../src/features/recipe-setting/services/remote-xrf-recipe-set.service';

vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: vi.fn(),
}));

// Helpers to build mock MessageResponseData as aif-message.service returns it
function makePassResponse(msgBody: Record<string, unknown>) {
  return {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'PASS', MSGBODY: msgBody }),
  };
}

function makeFailResponse(errmsg: string) {
  return {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: errmsg }),
  };
}

describe('remote-xrf-recipe-set.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ResponseDataToJsonUtil', () => {
    describe('getMessageBodyList', () => {
      it('should return empty array when result is null or undefined', () => {
        expect(ResponseDataToJsonUtil.getMessageBodyList(null, 'BAYS')).toEqual([]);
        expect(ResponseDataToJsonUtil.getMessageBodyList(undefined, 'BAYS')).toEqual([]);
      });

      it('should extract ITEM array from BAYS object', () => {
        const payload = { BAYS: { ITEM: [{ BAY: 'ITEM_A' }] } };
        expect(ResponseDataToJsonUtil.getMessageBodyList(payload, 'BAYS')).toEqual([
          { BAY: 'ITEM_A' },
        ]);
      });

      it('should wrap single ITEM object in array (server returns object when one result)', () => {
        const payload = { BAYS: { ITEM: { BAY: 'ONLY_ITEM' } } };
        expect(ResponseDataToJsonUtil.getMessageBodyList(payload, 'BAYS')).toEqual([
          { BAY: 'ONLY_ITEM' },
        ]);
      });

      it('should return empty array when BAYS has no ITEM', () => {
        expect(ResponseDataToJsonUtil.getMessageBodyList({ BAYS: {} }, 'BAYS')).toEqual([]);
      });

      it('should return empty array when key does not exist', () => {
        expect(ResponseDataToJsonUtil.getMessageBodyList({ other: {} }, 'BAYS')).toEqual([]);
      });

      it('should return empty array when result is primitive', () => {
        expect(ResponseDataToJsonUtil.getMessageBodyList('primitive', 'BAYS')).toEqual([]);
      });
    });

    describe('getErrorMessage', () => {
      it('should return empty string if result is falsy', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage(null)).toBe('');
        expect(ResponseDataToJsonUtil.getErrorMessage(undefined)).toBe('');
      });

      it('should return string directly if result is a string', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage('Direct Error')).toBe('Direct Error');
      });

      it('should return ERRMSG property first', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage({ ERRMSG: 'Error from ERRMSG' })).toBe(
          'Error from ERRMSG',
        );
      });

      it('should fall back to errorMessage property', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage({ errorMessage: 'Error from backend' })).toBe(
          'Error from backend',
        );
      });

      it('should fall back to message property', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage({ message: 'General message error' })).toBe(
          'General message error',
        );
      });

      it('should return empty string if object has no error fields', () => {
        expect(ResponseDataToJsonUtil.getErrorMessage({})).toBe('');
      });
    });
  });

  describe('remoteXrfRecipeService endpoints', () => {
    it('should return isSuccessFul=true on PASS status with BAYS.ITEM in MSGBODY', async () => {
      vi.mocked(postAifMessage).mockResolvedValueOnce(
        makePassResponse({ BAYS: { ITEM: [{ BAY: 'ITEM_1' }] } }),
      );

      const res = await remoteXrfRecipeService.getXrfItem('FAC1', 'AREA1');

      expect(postAifMessage).toHaveBeenCalledWith('XRFITEMINFO', 'XRFITEMINFO', [
        ['FACILITY', 'FAC1'],
        ['AREA', 'AREA1'],
      ]);
      expect(res.isSuccessFul).toBe(true);
      expect(ResponseDataToJsonUtil.getMessageBodyList(res.result, 'BAYS')).toEqual([
        { BAY: 'ITEM_1' },
      ]);
    });

    it('should return empty MSGBODY result when PASS but no MSGBODY', async () => {
      vi.mocked(postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS' }),
      });

      const res = await remoteXrfRecipeService.getXrfProdeqp('FAC1', 'AREA1', 'ITEM1');

      expect(postAifMessage).toHaveBeenCalledWith('XRFEQPINFO', 'XRFEQPINFO', [
        ['FACILITY', 'FAC1'],
        ['AREA', 'AREA1'],
        ['ITEM', 'ITEM1'],
      ]);
      expect(res.isSuccessFul).toBe(true);
      expect(res.result).toEqual({});
    });

    it('should return isSuccessFul=false with ERRMSG on failure status', async () => {
      vi.mocked(postAifMessage).mockResolvedValueOnce(makeFailResponse('Category query rejected'));

      const res = await remoteXrfRecipeService.getXrfCategory('FAC1', 'AREA1', 'ITEM1', 'EQP1');

      expect(postAifMessage).toHaveBeenCalledWith('XRFCATEGORYINFO', 'XRFCATEGORYINFO', [
        ['FACILITY', 'FAC1'],
        ['AREA', 'AREA1'],
        ['ITEM', 'ITEM1'],
        ['PRODEQP', 'EQP1'],
      ]);
      expect(res.isSuccessFul).toBe(false);
      expect(res.errorMessage).toBe('Category query rejected');
    });

    it('should return ERRMSG string as errorMessage on FAIL without ERRMSG value', async () => {
      vi.mocked(postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL' }),
      });

      const res = await remoteXrfRecipeService.getXrfSample(
        'FAC1',
        'AREA1',
        'ITEM1',
        'EQP1',
        'CAT1',
      );

      expect(postAifMessage).toHaveBeenCalledWith('XRFSAMPLEINFO', 'XRFSAMPLEINFO', [
        ['FACILITY', 'FAC1'],
        ['AREA', 'AREA1'],
        ['ITEM', 'ITEM1'],
        ['PRODEQP', 'EQP1'],
        ['CATEGORY', 'CAT1'],
      ]);
      expect(res.isSuccessFul).toBe(false);
      // getResponseErrorMessage falls back to the raw result string when ERRMSG is missing
      expect(typeof res.errorMessage).toBe('string');
    });

    it('should handle thrown Error and use its message', async () => {
      vi.mocked(postAifMessage).mockRejectedValueOnce(new Error('Network timeout'));

      const res = await remoteXrfRecipeService.getXrfPara(
        'FAC1',
        'AREA1',
        'ITEM1',
        'EQP1',
        'CAT1',
        'SMP1',
      );

      expect(res.isSuccessFul).toBe(false);
      expect(res.errorMessage).toBe('Network timeout');
    });

    it('should handle non-Error thrown value via String()', async () => {
      vi.mocked(postAifMessage).mockRejectedValueOnce('plain string error');

      const res = await remoteXrfRecipeService.getXrfRecipe(
        'FAC1',
        'AREA1',
        'ITEM1',
        'EQP1',
        'CAT1',
        'SMP1',
        'PARA1',
      );

      expect(res.isSuccessFul).toBe(false);
      expect(res.errorMessage).toBe('plain string error');
    });

    it('should send PARAMETER field for getXrfRecipe', async () => {
      vi.mocked(postAifMessage).mockResolvedValueOnce(
        makePassResponse({ BAYS: { ITEM: [{ BAY: 'RCP001', CONTEXT01: 'Y' }] } }),
      );

      await remoteXrfRecipeService.getXrfRecipe(
        'FAC1',
        'AREA1',
        'ITEM1',
        'EQP1',
        'CAT1',
        'SMP1',
        'PARA1',
      );

      expect(postAifMessage).toHaveBeenCalledWith('XRFRECIPEINFO', 'XRFRECIPEINFO', [
        ['FACILITY', 'FAC1'],
        ['AREA', 'AREA1'],
        ['ITEM', 'ITEM1'],
        ['PRODEQP', 'EQP1'],
        ['CATEGORY', 'CAT1'],
        ['SAMPLE', 'SMP1'],
        ['PARAMETER', 'PARA1'],
      ]);
    });
  });
});
