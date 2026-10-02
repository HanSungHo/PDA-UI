import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getScopeLotInfoApi,
  getSlotInfoApi,
  inputScopeDataApi,
} from '~/features/input-scope-data/services/input-scope-data.api';
import {
  build25WaferSlots,
  parseWaferSlotNumbers,
} from '~/features/input-scope-data/services/input-scope-data.service';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
    interceptors: {
      request: {
        use: vi.fn(),
      },
    },
  },
}));

function xmlResponse(body: string): string {
  return `<BODY>${body}</BODY>`;
}

describe('input-scope-data.api & service utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getScopeLotInfoApi', () => {
    it('posts GETSCOPELOTINFO XML and returns parsed lot master data on SUCCESS', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>SUCCESS</RESULT>
          <LOTNAME>TESTLOT01</LOTNAME>
          <FACTORYNAME>FAB1</FACTORYNAME>
          <PROCESSOPERATIONNAME>102030</PROCESSOPERATIONNAME>
          <MACHINENAME>SCOPE-01</MACHINENAME>
          <LAYERID>PHOTO_01</LAYERID>
          <ISEXIST>Y</ISEXIST>
          <TYPEVALUE>PARTICLE</TYPEVALUE>
        `),
      });

      const res = await getScopeLotInfoApi('TESTLOT01');

      expect(res.success).toBe(true);
      expect(res.data?.lotName).toBe('TESTLOT01');
      expect(res.data?.factoryName).toBe('FAB1');
      expect(res.data?.processOperationName).toBe('102030');
      expect(res.data?.machineName).toBe('SCOPE-01');
      expect(res.data?.faultCategories).toContain('PARTICLE');
      expect(post).toHaveBeenCalledWith(
        '/hifos/message',
        expect.stringContaining('<LOTID>TESTLOT01</LOTID>'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            ACK: expect.any(String),
            MESSAGENAME: expect.any(String),
            ORIGIN: expect.any(String),
          }),
          responseType: 'text',
        }),
      );
    });

    it('returns error when API returns ERROR', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>ERROR</RESULT>
          <ERRORDESC>Lot not found in FAB.</ERRORDESC>
        `),
      });

      const res = await getScopeLotInfoApi('UNKNOWN_LOT');
      expect(res.success).toBe(false);
      expect(res.errorMessage).toBe('Lot not found in FAB.');
    });
  });

  describe('getSlotInfoApi', () => {
    it('posts SLOTINFO XML and returns wafer list string on SUCCESS', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>SUCCESS</RESULT>
          <WAFERLIST>TESTLOT01.01,TESTLOT01.02</WAFERLIST>
        `),
      });

      const res = await getSlotInfoApi('TESTLOT01');
      expect(res.success).toBe(true);
      expect(res.waferList).toContain('TESTLOT01.01');
      expect(post).toHaveBeenCalledWith(
        '/hifos/slotinfo',
        expect.stringContaining('<FACILITY>FAB1</FACILITY>'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            ACK: expect.any(String),
            MESSAGENAME: expect.any(String),
            ORIGIN: expect.any(String),
          }),
        }),
      );
    });

    it('returns error when API returns ERROR', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>ERROR</RESULT>
          <ERRORDESC>Slot info not available.</ERRORDESC>
        `),
      });

      const res = await getSlotInfoApi('TESTLOT01');
      expect(res.success).toBe(false);
      expect(res.errorMessage).toBe('Slot info not available.');
    });
  });

  describe('inputScopeDataApi', () => {
    it('posts INPUTSCOPEDATA XML and returns success message', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>SUCCESS</RESULT>
          <MESSAGE>데이터가 저장 되었습니다.</MESSAGE>
        `),
      });

      const res = await inputScopeDataApi({
        factoryName: 'FAB1',
        lotId: 'TESTLOT01',
        processOperationName: '102030',
        machineName: 'SCOPE-01',
        layerId: 'PHOTO_01',
        sideRinse: '2.5',
        weeWidth: '3.0',
        logo: 'KF_LOGO',
        slotList: '01,02',
        faultCategory: 'PARTICLE',
        inputUser: 'OP10023',
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe('데이터가 저장 되었습니다.');
      expect(post).toHaveBeenCalledWith(
        '/hifos/message',
        expect.stringContaining('<FAULTCATEGORY>PARTICLE</FAULTCATEGORY>'),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            ACK: expect.any(String),
            MESSAGENAME: expect.any(String),
            ORIGIN: expect.any(String),
          }),
        }),
      );
    });

    it('handles failure when server returns ERROR', async () => {
      post.mockResolvedValueOnce({
        data: xmlResponse(`
          <RESULT>ERROR</RESULT>
          <ERRORDESC>Database connection failed.</ERRORDESC>
        `),
      });

      const res = await inputScopeDataApi({
        factoryName: 'FAB1',
        lotId: 'TESTLOT01',
        processOperationName: '102030',
        machineName: 'SCOPE-01',
        layerId: 'PHOTO_01',
        sideRinse: '',
        weeWidth: '',
        logo: '',
        slotList: '',
        faultCategory: '',
        inputUser: 'OP10023',
      });

      expect(res.success).toBe(false);
      expect(res.errorMessage).toBe('Database connection failed.');
    });
  });

  describe('parseWaferSlotNumbers and build25WaferSlots', () => {
    it('parses regex slot numbers correctly', () => {
      const raw = 'WA24.01,WA24.03,WA24.25';
      const slots = parseWaferSlotNumbers(raw);
      expect(slots).toEqual(['01', '03', '25']);
    });

    it('builds 25 slots marking only present ones', () => {
      const available = ['01', '05'];
      const slots = build25WaferSlots(available);
      expect(slots.length).toBe(25);
      expect(slots[0].slotNumber).toBe('01');
      expect(slots[0].isPresent).toBe(true);
      expect(slots[1].slotNumber).toBe('02');
      expect(slots[1].isPresent).toBe(false);
      expect(slots[4].slotNumber).toBe('05');
      expect(slots[4].isPresent).toBe(true);
    });
  });
});
