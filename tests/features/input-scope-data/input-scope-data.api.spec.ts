import { build25WaferSlots, parseWaferSlotNumbers } from 'src/services/input-scope-data.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resetAllScopeMocks,
  setMockGetScopeLotInfoOverride,
  setMockInputScopeDataOverride,
  setMockSlotInfoOverride,
} from '~/features/input-scope-data/mocks/input-scope-data.mock';
import {
  getScopeLotInfoApi,
  getSlotInfoApi,
  inputScopeDataApi,
} from '~/features/input-scope-data/services/input-scope-data.api';

describe('input-scope-data.api & service utilities', () => {
  beforeEach(() => {
    resetAllScopeMocks();
  });

  afterEach(() => {
    resetAllScopeMocks();
  });

  describe('getScopeLotInfoApi', () => {
    it('returns parsed lot master data on SUCCESS', async () => {
      const res = await getScopeLotInfoApi('TESTLOT01');
      expect(res.success).toBe(true);
      expect(res.data?.lotName).toBe('TESTLOT01');
      expect(res.data?.factoryName).toBe('FAB1');
      expect(res.data?.processOperationName).toBe('102030');
      expect(res.data?.machineName).toBe('SCOPE-01');
      expect(res.data?.faultCategories).toContain('PARTICLE');
    });

    it('returns error when API returns ERROR', async () => {
      setMockGetScopeLotInfoOverride({
        result: 'ERROR',
        errorMessage: 'Lot not found in FAB.',
      });

      const res = await getScopeLotInfoApi('UNKNOWN_LOT');
      expect(res.success).toBe(false);
      expect(res.errorMessage).toBe('Lot not found in FAB.');
    });
  });

  describe('getSlotInfoApi', () => {
    it('returns wafer list string on SUCCESS', async () => {
      const res = await getSlotInfoApi('TESTLOT01');
      expect(res.success).toBe(true);
      expect(res.waferList).toContain('TESTLOT01.01');
    });

    it('returns error when API returns ERROR', async () => {
      setMockSlotInfoOverride({
        result: 'ERROR',
        errorMessage: 'Slot info not available.',
      });

      const res = await getSlotInfoApi('TESTLOT01');
      expect(res.success).toBe(false);
      expect(res.errorMessage).toBe('Slot info not available.');
    });
  });

  describe('inputScopeDataApi', () => {
    it('returns success message on successful submit', async () => {
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
    });

    it('handles failure when server returns ERROR', async () => {
      setMockInputScopeDataOverride({
        result: 'ERROR',
        errorMessage: 'Database connection failed.',
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
