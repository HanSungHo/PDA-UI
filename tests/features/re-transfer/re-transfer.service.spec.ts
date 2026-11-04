import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  extractItemList,
  reTransferService,
} from 'src/features/re-transfer/services/re-transfer.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('reTransferService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const main = useMainStore();
    main.deviceName = 'ANDROID_000';
    main.mobileServerName = 'L4-DEVICE';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractItemList', () => {
    it('normalizes null, array, single object, and ITEM container', () => {
      expect(extractItemList(null)).toEqual([]);
      expect(extractItemList([{ FAB: 'FAB4' }])).toEqual([{ FAB: 'FAB4' }]);
      expect(extractItemList({ ITEM: { FAB: 'FAB4' } })).toEqual([{ FAB: 'FAB4' }]);
      expect(extractItemList({ item: [{ FAB: 'FAB5' }] })).toEqual([{ FAB: 'FAB5' }]);
      expect(extractItemList({})).toEqual([]);
    });
  });

  describe('getCarryInfo', () => {
    it('calls API via postAifMessage and returns parsed carry info with single item structures', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              CURRENTSTK: 'STK02',
              FABS: { ITEM: { FAB: 'FAB4' } },
              PORTS: { ITEM: { PORT: 'OUT', PORTDESC: '출고 1' } },
            },
          }),
        },
      });

      const res = await reTransferService.getCarryInfo('LOT002', 'F2');
      expect(res.ok).toBe(true);
      expect(res.data?.currentStk).toBe('STK02');
      expect(res.data?.fabs).toEqual(['FAB4']);
      expect(res.data?.ports).toEqual(['OUT  출고 1']);
      expect(res.data?.outPortIndex).toBe(0);
      expect(postSpy).toHaveBeenCalledWith(
        '/hifos/carryinfo',
        expect.objectContaining({
          sMsg: expect.stringContaining('<MSGNAME>CARRYINFO</MSGNAME>'),
        }),
      );
    });

    it('preserves exact port string interpolation without trimming trailing spaces when PORTDESC is empty', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              CURRENTSTK: 'STK02',
              FABS: { ITEM: [{ FAB: 'FAB4' }] },
              PORTS: { ITEM: [{ PORT: 'OUT', PORTDESC: '' }] },
            },
          }),
        },
      });

      const res = await reTransferService.getCarryInfo('LOT002');
      expect(res.ok).toBe(true);
      expect(res.data?.ports).toEqual(['OUT  ']);
    });

    it('calls API and returns parsed carry info with empty items when fields missing', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              CURRENTSTK: '',
            },
          }),
        },
      });

      const res = await reTransferService.getCarryInfo('LOT003');
      expect(res.ok).toBe(true);
      expect(res.data?.fabs).toEqual([]);
      expect(res.data?.ports).toEqual([]);
      expect(res.data?.outPortIndex).toBeUndefined();
    });

    it('returns failure when response is PASS but MSGBODY is missing or empty string (ResponseDataToJsonUtil.isMessageBodyCheck parity)', async () => {
      vi.spyOn(apiClient, 'post')
        .mockResolvedValueOnce({
          status: 200,
          data: {
            statusCode: 200,
            result: JSON.stringify({
              STATUS: 'PASS',
            }),
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            statusCode: 200,
            result: JSON.stringify({
              STATUS: 'PASS',
              MSGBODY: '',
            }),
          },
        });

      const resMissing = await reTransferService.getCarryInfo('LOT001');
      expect(resMissing.ok).toBe(false);
      expect(resMissing.message).toBe('BODY가 존재하지 않습니다');

      const resEmptyStr = await reTransferService.getCarryInfo('LOT001');
      expect(resEmptyStr.ok).toBe(false);
      expect(resEmptyStr.message).toBe('BODY가 존재하지 않습니다');
    });

    it('accepts empty object MSGBODY without failing (ResponseDataToJsonUtil.isMessageBodyCheck parity)', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {},
          }),
        },
      });

      const res = await reTransferService.getCarryInfo('LOT001');
      expect(res.ok).toBe(true);
      expect(res.data?.currentStk).toBe('');
      expect(res.data?.fabs).toEqual([]);
      expect(res.data?.ports).toEqual([]);
    });

    it('handles API error failure response', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 500,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'LOT not found',
          }),
        },
      });

      const res = await reTransferService.getCarryInfo('INVALID');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('LOT not found');
    });

    it('catches network exceptions', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error'));
      const res = await reTransferService.getCarryInfo('LOT001');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Network error');
    });
  });

  describe('getFabBayInfo', () => {
    it('calls API and returns bay list', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              BAYS: {
                ITEM: [{ BAY: 'BAY10' }, { BAY: 'BAY20' }],
              },
            },
          }),
        },
      });

      const res = await reTransferService.getFabBayInfo('FAB4');
      expect(res.ok).toBe(true);
      expect(res.data?.bays).toEqual(['BAY10', 'BAY20']);
    });

    it('handles failure in getFabBayInfo', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 400,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'FAB invalid',
          }),
        },
      });

      const res = await reTransferService.getFabBayInfo('UNKNOWN');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('FAB invalid');
    });
  });

  describe('getBayStockerInfo', () => {
    it('calls API and returns stocker list', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              STOCKERS: {
                ITEM: [{ STOCKER: 'STK_A' }, { STOCKER: 'STK_B' }],
              },
            },
          }),
        },
      });

      const res = await reTransferService.getBayStockerInfo('BAY01', 'FAB4');
      expect(res.ok).toBe(true);
      expect(res.data?.stockers).toEqual(['STK_A', 'STK_B']);
    });

    it('handles failure in getBayStockerInfo', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 400,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'Stocker query failed',
          }),
        },
      });

      const res = await reTransferService.getBayStockerInfo('BAY01', 'FAB4');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Stocker query failed');
    });
  });

  describe('getPdaList', () => {
    it('calls API and formats PDA items with 지정안함 at index 0', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {
              PDAS: {
                ITEM: [{ PDACODE: 'P100', USERNAME: '김철수', USERID: 'U100' }],
              },
            },
          }),
        },
      });

      const res = await reTransferService.getPdaList('BAY01');
      expect(res.ok).toBe(true);
      expect(res.data?.pdas[0]).toBe('지정안함');
      expect(res.data?.pdas[1]).toBe('P100  김철수(U100)');
    });

    it('handles failure in getPdaList', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 400,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'PDA query failed',
          }),
        },
      });

      const res = await reTransferService.getPdaList('BAY01');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('PDA query failed');
    });
  });

  describe('executeCarry', () => {
    const payload = {
      lotId: 'LOT001',
      facility: 'MNP',
      nextFab: 'FAB4',
      nextBay: 'BAY01',
      nextStocker: 'STK01',
      port: 'OUT',
      pda: 'PDA01',
      currentStk: 'STK01',
    };

    it('calls API and returns ok: true on success', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 200,
          result: JSON.stringify({
            STATUS: 'PASS',
            MSGBODY: {},
          }),
        },
      });

      const res = await reTransferService.executeCarry(payload);
      expect(res.ok).toBe(true);
    });

    it('handles failure in executeCarry', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        status: 200,
        data: {
          statusCode: 400,
          result: JSON.stringify({
            STATUS: 'FAIL',
            ERRMSG: 'Carry execution failed',
          }),
        },
      });

      const res = await reTransferService.executeCarry(payload);
      expect(res.ok).toBe(false);
      expect(res.message).toBe('Carry execution failed');
    });
  });
});
