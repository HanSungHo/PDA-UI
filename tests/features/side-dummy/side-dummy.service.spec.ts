import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  isSideDummyMockMode,
  setSideDummyMockMode,
  sideDummyService,
} from 'src/features/side-dummy/services/side-dummy.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sideDummyService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setSideDummyMockMode(false);

    const main = useMainStore();
    main.deviceName = 'PDA-TEST';
    main.mobileServerName = 'HIFOS-TEST';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSideDummyMockMode(false);
  });

  describe('mock mode toggle', () => {
    it('toggles mock mode correctly', () => {
      expect(isSideDummyMockMode()).toBe(false);
      setSideDummyMockMode(true);
      expect(isSideDummyMockMode()).toBe(true);
      setSideDummyMockMode(false);
      expect(isSideDummyMockMode()).toBe(false);
    });
  });

  describe('selectEqp', () => {
    it('returns mock data with lot when mock mode is enabled', async () => {
      setSideDummyMockMode(true);
      const res = await sideDummyService.selectEqp('EQP-01');
      expect(res.ok).toBe(true);
      expect(res.data?.LOTNAME).toBe('DUMMY-LOT-01');
      expect(res.data?.PROCESSOPERATIONNAME).toBe('2000');
    });

    it('returns mock data without lot when eqp is EQP-EMPTY in mock mode', async () => {
      setSideDummyMockMode(true);
      const res = await sideDummyService.selectEqp('EQP-EMPTY');
      expect(res.ok).toBe(true);
      expect(res.data?.LOTNAME).toBe('');
      expect(res.data?.PROCESSOPERATIONNAME).toBe('1000');
    });

    it('calls API and returns successful response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              LOTNAME: 'DMM-99',
              PROCESSOPERATIONNAME: '2100',
              PODESC: 'TEST DESC',
              IN_TIME: '2026-10-22 10:00:00',
              IN_USER: 'USER99',
            },
          }),
        },
      });

      const res = await sideDummyService.selectEqp('EQP-REAL');
      expect(res.ok).toBe(true);
      expect(res.data?.LOTNAME).toBe('DMM-99');
      expect(res.data?.PODESC).toBe('TEST DESC');
    });

    it('handles API failure properly', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'Equipment not found',
          }),
        },
      });

      const res = await sideDummyService.selectEqp('EQP-INVALID');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Equipment not found');
    });

    it('handles network exceptions gracefully', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network disconnected'));

      const res = await sideDummyService.selectEqp('EQP-ERR');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Network disconnected');
    });
  });

  describe('selectLot', () => {
    it('returns mock lot info when in mock mode', async () => {
      setSideDummyMockMode(true);
      const res = await sideDummyService.selectLot('LOT-01', 'EQP-01');
      expect(res.ok).toBe(true);
      expect(res.data?.PROCESSOPERATIONNAME).toBe('3000');
    });

    it('calls API and returns lot data', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              PROCESSOPERATIONNAME: '3500',
              PODESC: 'LOT DESC',
            },
          }),
        },
      });

      const res = await sideDummyService.selectLot('LOT-VALID', 'EQP-VALID');
      expect(res.ok).toBe(true);
      expect(res.data?.PROCESSOPERATIONNAME).toBe('3500');
    });

    it('handles lot lookup failure', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'Lot not registered',
          }),
        },
      });

      const res = await sideDummyService.selectLot('LOT-FAIL', 'EQP-01');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Lot not registered');
    });
  });

  describe('insertInOut', () => {
    it('returns mock insert success when in mock mode', async () => {
      setSideDummyMockMode(true);
      const res = await sideDummyService.insertInOut({
        eventName: 'IN',
        eqpId: 'EQP-01',
        lotId: 'LOT-01',
        operId: '1000',
        operDesc: 'DESC',
        inUser: 'OPER01',
      });
      expect(res.ok).toBe(true);
      expect(res.data?.RET).toBe('정상 처리 되었습니다.');
    });

    it('calls API and returns insert response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              RET: 'OUT 처리 완료',
            },
          }),
        },
      });

      const res = await sideDummyService.insertInOut({
        eventName: 'OUT',
        eqpId: 'EQP-01',
        lotId: 'LOT-01',
        operId: '1000',
        operDesc: 'DESC',
        inUser: 'OPER01',
      });
      expect(res.ok).toBe(true);
      expect(res.data?.RET).toBe('OUT 처리 완료');
    });

    it('handles insert failure', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'Device interlock error',
          }),
        },
      });

      const res = await sideDummyService.insertInOut({
        eventName: 'IN',
        eqpId: 'EQP-01',
        lotId: 'LOT-01',
        operId: '1000',
        operDesc: 'DESC',
        inUser: 'OPER01',
      });
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Device interlock error');
    });
  });

  describe('message header fallbacks', () => {
    it('uses L4-DEVICE and ANDROID_000 as fallback header when mainStore values are unset', async () => {
      const main = useMainStore();
      main.mobileServerName = '';
      main.deviceName = '';

      let capturedPayload = '';
      vi.spyOn(apiClient, 'post').mockImplementationOnce(async (_url, body) => {
        capturedPayload = (body as { sMsg: string }).sMsg;
        return {
          status: 200,
          data: {
            statusCode: 200,
            result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }),
          },
        };
      });

      await sideDummyService.selectEqp('EQP-TEST');
      expect(capturedPayload).toContain('<RECEIVER>L4-DEVICE</RECEIVER>');
      expect(capturedPayload).toContain('<SENDER>ANDROID_000</SENDER>');
    });
  });
});
