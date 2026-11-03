import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { wetAutoApi } from 'src/features/wet-auto/services/wet-auto.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('wetAutoApi HTTP contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.mobileServerName = 'SERVER-01';
    mainStore.deviceName = 'DEVICE-01';
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the Android message routes, envelope and exact Wet request fields', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { RET: '0' } }),
      },
    } as never);

    await wetAutoApi.fetchEquipment({ EQPID: 'WET-EQP-01' });
    await wetAutoApi.fetchLot({ TYPE: 'MVIN', LOTID: '<LOT&01>', FACILITY: 'FAB-01' });
    await wetAutoApi.fetchRecipe({
      ISPHOTO: 'N',
      LOTID: 'LOT-01',
      OPERATION: 'OP-01',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT (JOB-01)',
      EQPID: 'EQP-MAIN',
      OPTYPE: 'N',
      FACILITY: 'FAB-01',
    });
    await wetAutoApi.fetchBays({ FACILITY: 'FAB-01' });
    await wetAutoApi.fetchStockers({ BAY: 'BAY-01', FACILITY: 'FAB-01' });
    await wetAutoApi.start({
      MACHINENAME: 'EQP-MAIN',
      MACHINENAME2: 'WET-EQP-01',
      MACHINETYPE: 'WET',
      AREANAME: 'WET-AREA',
      NUMCASS: '2',
      LOTNAME: 'LOT-01',
      LOTNAME2: 'LOT-02',
      RECIPENAME: 'RCP-01',
      JOBNAME: 'JOB-01',
      PRODUCTQTY: '20',
      PRODUCTQTY2: '18',
      OPERATION: 'OP-01-010',
      OPERATION2: 'OP-02-020',
      EVENTUSER: 'USER-01',
      ISCARRAY: 'Y',
      BAY: 'BAY-01',
      STOCKER: 'STK-01',
    });

    expect(post.mock.calls.map(([url]) => url)).toEqual([
      '/hifos/wetremoteeqpinfo',
      '/hifos/lotinfo',
      '/hifos/recipeinfo',
      '/hifos/areabayinfo',
      '/hifos/baystockerinfo',
      '/hifos/wetremotestart',
    ]);
    const messages = post.mock.calls.map(([, body]) => (body as { sMsg: string }).sMsg);
    expect(messages[0]).toContain('<MSGNAME>WETREMOTEEQPINFO</MSGNAME>');
    expect(messages[0]).toContain('<RECEIVER>SERVER-01</RECEIVER>');
    expect(messages[0]).toContain('<SENDER>DEVICE-01</SENDER>');
    expect(messages[1]).toContain('<LOTID>&lt;LOT&amp;01&gt;</LOTID>');
    expect(messages[2]).toContain('<ISPHOTO>N</ISPHOTO>');
    expect(messages[3]).toContain('<FACILITY>FAB-01</FACILITY>');
    expect(messages[4]).toContain('<BAY>BAY-01</BAY>');
    expect(messages[5]).toContain('<AREANAME>WET-AREA</AREANAME>');
    expect(messages[5]).toContain('<NUMCASS>2</NUMCASS>');
    expect(messages[5]).toContain('<ISCARRAY>Y</ISCARRAY>');
    expect(messages[5]).not.toContain('<EQPAREA>');
  });

  it('rejects unsuccessful, empty-body, malformed and transport responses', async () => {
    const post = vi.spyOn(apiClient, 'post');
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'backend failure' }),
      },
    } as never);
    expect(await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).toEqual({
      ok: false,
      message: 'backend failure',
    });

    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }) },
    } as never);
    expect((await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).ok).toBe(false);

    post.mockResolvedValueOnce({
      data: { statusCode: 500, result: 'server unavailable' },
    } as never);
    expect(await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).toEqual({
      ok: false,
      message: 'server unavailable',
    });

    post.mockResolvedValueOnce({
      data: { statusCode: 200, result: 'malformed response' },
    } as never);
    expect(await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).toEqual({
      ok: false,
      message: 'malformed response',
    });

    post.mockRejectedValueOnce(new Error('network failure'));
    expect(await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).toEqual({
      ok: false,
      message: 'network failure',
    });

    post.mockRejectedValueOnce('unexpected rejection');
    expect(await wetAutoApi.fetchEquipment({ EQPID: 'EQP' })).toEqual({
      ok: false,
      message: 'WETREMOTEEQPINFO request failed.',
    });

    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'start failure', MSGBODY: '' }),
      },
    } as never);
    expect(
      await wetAutoApi.start({
        MACHINENAME: 'MAIN',
        MACHINENAME2: 'EQP',
        MACHINETYPE: 'WET',
        AREANAME: 'AREA',
        NUMCASS: '1',
        LOTNAME: 'LOT',
        LOTNAME2: '',
        RECIPENAME: 'RCP',
        JOBNAME: 'JOB',
        PRODUCTQTY: '1',
        PRODUCTQTY2: '',
        OPERATION: 'OP-01',
        OPERATION2: '-',
        EVENTUSER: 'USER',
        ISCARRAY: 'N',
        BAY: '',
        STOCKER: '',
      }),
    ).toEqual({ ok: false, message: 'start failure' });
  });
});
