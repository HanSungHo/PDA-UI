import { createPinia, setActivePinia } from 'pinia';
import { machineStatusDetailService } from 'src/features/machine-status-detail/services/machine-status-detail.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('machineStatusDetailService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const main = useMainStore();
    main.deviceName = 'PDA-TEST';
    main.mobileServerName = 'HIFOS-TEST';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('eqpStatus', () => {
    it('calls API and returns parsed response body', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              FACILITY: 'FAB1',
              MAINSTATUS: 'RUN',
              SUBSTATUS: 'NORMAL',
              FINALWORKTIME: '2026-10-26 10:00:00',
              FDCDOWN: 'OK',
              EQPSTATUSCODE: 'R',
              EQPSTATUSDESC: '가동중',
              DOWNCODE: 'RN001',
              DOWNDESC: '정상가동',
            },
          }),
        },
      });

      const res = await machineStatusDetailService.eqpStatus('MC01', 'FAB1');
      expect(res.ok).toBe(true);
      expect(res.data?.MAINSTATUS).toBe('RUN');
      expect(res.data?.EQPSTATUSCODE).toBe('R');
    });

    it('handles API failure response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: '장비 정보가 존재하지 않습니다.',
          }),
        },
      });

      const res = await machineStatusDetailService.eqpStatus('INVALID', 'FAB1');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('장비 정보가 존재하지 않습니다.');
    });

    it('handles network exception gracefully', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error'));
      const res = await machineStatusDetailService.eqpStatus('MC01', 'FAB1');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Network error');
    });
  });

  describe('eqpDownCode', () => {
    it('calls EQPDOWNCODE endpoint and returns response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              DOWNCODEITEMS: {
                ITEM: [{ EQPDOWNCODE: 'CA001', EQPDOWNDESC: 'LOT 대기' }],
              },
            },
          }),
        },
      });

      const res = await machineStatusDetailService.eqpDownCode('FAB1', 'C', 'MC01');
      expect(res.ok).toBe(true);
      expect(res.data?.DOWNCODEITEMS).toBeDefined();
    });
  });

  describe('eqpDownComment', () => {
    it('calls EQPDOWNCOMMENT endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              DOWNCOMMENTITEMS: {
                ITEM: [{ DOWNCOMMENT: 'PM 완료' }],
              },
            },
          }),
        },
      });

      const res = await machineStatusDetailService.eqpDownComment('FAB1', 'PM001');
      expect(res.ok).toBe(true);
    });
  });

  describe('checkChamber', () => {
    it('calls CHECKCHAMBER endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              RMAG: '',
              CMAG: 'Chamber 일괄변경?',
              CHANGEFLAG: 'Y',
              CHAMBER: 'CH1',
            },
          }),
        },
      });

      const res = await machineStatusDetailService.checkChamber('FAB1', 'MC01', 'RUN');
      expect(res.ok).toBe(true);
      expect(res.data?.CHAMBER).toBe('CH1');
    });
  });

  describe('checkNonLot', () => {
    it('calls CHECKNONLOT endpoint', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              NONLOTCHECK: 'Y',
              NONLOTRESULT: 'N',
              NONLOTMESSGE: '비작업 LOT 확인 필요',
              NONLOTHMESSGE: '경고',
            },
          }),
        },
      });

      const res = await machineStatusDetailService.checkNonLot({
        eqpId: 'MC01',
        facility: 'FAB1',
        finalTime: '2026-10-26 09:00:00',
        operatorId: 'OP01',
        downCode: 'CA001  LOT 대기',
      });
      expect(res.ok).toBe(true);
      expect(res.data?.NONLOTCHECK).toBe('Y');
    });
  });

  describe('changeEqpStatus', () => {
    it('calls CHANGEEQPSTATUS endpoint with exact XML tags including LOGINGUSERID1', async () => {
      let capturedMsg = '';
      vi.spyOn(apiClient, 'post').mockImplementationOnce((_url, body) => {
        capturedMsg = (body as { sMsg: string }).sMsg;
        return Promise.resolve({
          status: 200,
          data: {
            statusCode: 200,
            result: JSON.stringify({
              STATUS: 'PASS',
              MSGBODY: {
                VAILOADING: 'CHAMBER_A',
              },
            }),
          },
        });
      });

      const res = await machineStatusDetailService.changeEqpStatus({
        eqpId: 'MC01',
        facility: 'FAB1',
        eqpStatusCode: 'C  비부하(LOAD DOWN)',
        eqpDownCode: 'CA001',
        comment: 'TEST COMMENT & <XML>',
        operatorId: 'OP01',
        operatorName: '홍길동',
        changeChamber: 'CH1,CH2',
      });

      expect(res.ok).toBe(true);
      expect(res.data?.VAILOADING).toBe('CHAMBER_A');
      expect(capturedMsg).toContain('<LOGINGUSERID1>홍길동</LOGINGUSERID1>');
      expect(capturedMsg).toContain('<CHANGECHAMBER>CH1,CH2</CHANGECHAMBER>');
      expect(capturedMsg).toContain('<COMMENT>TEST COMMENT &amp; &lt;XML&gt;</COMMENT>');
    });
  });

  describe('message header fallbacks', () => {
    it('uses L4-DEVICE and ANDROID_000 as fallback header when mainStore values are unset', async () => {
      const main = useMainStore();
      main.mobileServerName = '';
      main.deviceName = '';

      let capturedPayload = '';
      vi.spyOn(apiClient, 'post').mockImplementationOnce((_url, body) => {
        capturedPayload = (body as { sMsg: string }).sMsg;
        return Promise.resolve({
          status: 200,
          data: {
            statusCode: 200,
            result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }),
          },
        });
      });

      await machineStatusDetailService.eqpStatus('MC01', 'FAB1');
      expect(capturedPayload).toContain('<RECEIVER>L4-DEVICE</RECEIVER>');
      expect(capturedPayload).toContain('<SENDER>ANDROID_000</SENDER>');
    });
  });
});
