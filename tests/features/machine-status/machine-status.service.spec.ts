import { createPinia, setActivePinia } from 'pinia';
import { machineStatusService } from 'src/features/machine-status/services/machine-status.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('machineStatusService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const main = useMainStore();
    main.deviceName = 'PDA-TEST';
    main.mobileServerName = 'HIFOS-TEST';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('areaBayInfo returns BAYS from a successful response', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { BAYS: { ITEM: [{ BAY: 'BAY-A' }, { BAY: 'BAY-B' }] } },
        }),
      },
    });

    const res = await machineStatusService.areaBayInfo('AREA1', 'FAB1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect((res.data.BAYS?.ITEM as Array<{ BAY: string }>).map((item) => item.BAY)).toEqual([
        'BAY-A',
        'BAY-B',
      ]);
    }
  });

  it('bayEqpInfo returns EQPITEMS from a successful response', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { EQPITEMS: { ITEM: [{ EQPID: 'EQP-001' }] } },
        }),
      },
    });

    const res = await machineStatusService.bayEqpInfo('BAY-A', 'FAB1');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect((res.data.EQPITEMS?.ITEM as Array<{ EQPID: string }>)[0]?.EQPID).toBe('EQP-001');
    }
  });

  it('returns failure when the response status is FAIL', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'BAY 정보가 없습니다.' }),
      },
    });

    const res = await machineStatusService.bayEqpInfo('BAY-X', 'FAB1');
    expect(res.ok).toBe(false);
  });
});
