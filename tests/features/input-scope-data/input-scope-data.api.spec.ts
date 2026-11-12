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

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: unknown) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

const savePayload = {
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
};

describe('input-scope-data.api & service utilities (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  describe('getScopeLotInfoApi', () => {
    it('sends GETSCOPELOTINFO and maps the lot master data and FAULTS list', async () => {
      postAifMessage.mockResolvedValue(
        pass({
          ISEXIST: 'Y',
          LOTNAME: 'TESTLOT01',
          FACTORYNAME: 'FAB1',
          PROCESSOPERATIONNAME: '102030',
          MACHINENAME: 'SCOPE-01',
          LAYERID: 'PHOTO_01',
          FAULTS: { FAULT: [{ TYPEVALUE: 'PARTICLE' }, { TYPEVALUE: 'SCRATCH' }] },
        }),
      );

      const res = await getScopeLotInfoApi('TESTLOT01');

      expect(postAifMessage).toHaveBeenCalledWith('message', 'GETSCOPELOTINFO', [
        ['LOTID', 'TESTLOT01'],
      ]);
      expect(res.success).toBe(true);
      expect(res.data).toEqual({
        lotName: 'TESTLOT01',
        factoryName: 'FAB1',
        processOperationName: '102030',
        machineName: 'SCOPE-01',
        layerId: 'PHOTO_01',
        isExist: true,
        faultCategories: ['PARTICLE', 'SCRATCH'],
      });
    });

    it('accepts a single FAULT object', async () => {
      postAifMessage.mockResolvedValue(pass({ FAULTS: { FAULT: { TYPEVALUE: 'BRIDGE' } } }));

      const res = await getScopeLotInfoApi('LOT');
      expect(res.data?.faultCategories).toEqual(['BRIDGE']);
      expect(res.data?.lotName).toBe('LOT');
    });

    it('returns the server error message on FAIL', async () => {
      postAifMessage.mockResolvedValue(fail('Lot not found in FAB.'));

      expect(await getScopeLotInfoApi('UNKNOWN_LOT')).toEqual({
        success: false,
        errorMessage: 'Lot not found in FAB.',
      });
    });

    it('turns a transport error into a failed result', async () => {
      postAifMessage.mockRejectedValue(new Error('Network Error'));

      expect(await getScopeLotInfoApi('LOT')).toEqual({
        success: false,
        errorMessage: 'Network Error',
      });
    });
  });

  describe('getSlotInfoApi', () => {
    it('sends SLOTINFO and returns the wafer list string', async () => {
      postAifMessage.mockResolvedValue(pass({ WAFERLIST: 'TESTLOT01.01,TESTLOT01.02' }));

      const res = await getSlotInfoApi('TESTLOT01');

      expect(postAifMessage).toHaveBeenCalledWith('slotinfo', 'SLOTINFO', [
        ['LOTID', 'TESTLOT01'],
        ['FACILITY', 'FAB1'],
      ]);
      expect(res).toEqual({ success: true, waferList: 'TESTLOT01.01,TESTLOT01.02' });
    });

    it('returns the server error message on FAIL', async () => {
      postAifMessage.mockResolvedValue(fail('Slot info not available.'));

      expect(await getSlotInfoApi('TESTLOT01')).toEqual({
        success: false,
        errorMessage: 'Slot info not available.',
      });
    });
  });

  describe('inputScopeDataApi', () => {
    it('sends INPUTSCOPEDATA with the legacy request tags and returns the fixed success text', async () => {
      postAifMessage.mockResolvedValue(pass({}));

      const res = await inputScopeDataApi(savePayload);

      expect(res).toEqual({ success: true, message: '데이터가 저장 되었습니다.' });
      expect(postAifMessage).toHaveBeenCalledWith('message', 'INPUTSCOPEDATA', [
        ['FACTORYNAME', 'FAB1'],
        ['LOTID', 'TESTLOT01'],
        ['PROCESSOPERATIONNAME', '102030'],
        ['MACHINENAME', 'SCOPE-01'],
        ['LAYERID', 'PHOTO_01'],
        ['SIDERINSE', '2.5'],
        ['WEE', '3.0'],
        ['LOGO', 'KF_LOGO'],
        ['SLOTLIST', '01,02'],
        ['FAULTCATEGORY', 'PARTICLE'],
        ['INPUTUSER', 'OP10023'],
      ]);
    });

    it('returns the server error message when saving fails', async () => {
      postAifMessage.mockResolvedValue(fail('Database connection failed.'));

      expect(await inputScopeDataApi(savePayload)).toEqual({
        success: false,
        errorMessage: 'Database connection failed.',
      });
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
