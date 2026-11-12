import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { remoteRamcoApi } from 'src/features/remote-ramco/services/remote-ramco.service';
import { REMOTE_RAMCO_MESSAGES } from 'src/features/remote-ramco/types/remote-ramco.types';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteRamcoApi HTTP transport', () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const mainStore = useMainStore();
    mainStore.mobileServerName = 'SERVER-01';
    mainStore.deviceName = 'DEVICE-01';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts all legacy messages with their AIFMSG envelope and field names', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { statusCode: 200, result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { RET: '0' } }) },
    } as never);

    await remoteRamcoApi.fetchEquipmentInfo({ EQPID: 'EQP-01' });
    await remoteRamcoApi.fetchLotInfo({ TYPE: 'MVIN', LOTID: '<LOT&1>', FACILITY: 'FAC-01' });
    await remoteRamcoApi.fetchRecipeInfo({
      ISPHOTO: 'N',
      LOTID: 'LOT-01',
      OPERATION: 'OP',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT',
      EQPID: 'EQP-01',
      OPTYPE: 'N',
      FACILITY: 'FAC-01',
      CHMEQPID: 'CH-01',
    });
    await remoteRamcoApi.fetchPortStatus({
      EQPID: 'EQP-01',
      PORTNAME: '1',
      LOTID: 'LOT-01',
      RECIPE: '',
    });
    await remoteRamcoApi.clearPort({ MACHINENAME: 'EQP-01', PORTNAME: '1' });
    await remoteRamcoApi.cancelJobs({
      MACHINETYPE: 'ETCH',
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      EVENTUSER: 'USER-01',
      JOBNAME1: '',
      JOBNAME2: '',
    });
    await remoteRamcoApi.startRemote({
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      MACHINETYPE: 'ETCH',
      AREANAME: 'AREA-01',
      NUMCASS: '1',
      LOTNAME: 'LOT-01',
      LOTNAME2: '',
      RECIPENAME: 'RCP-01',
      JOBNAME: 'JOB-01',
      PRODUCTQTY: '25',
      PRODUCTQTY2: '',
      OPERATION: 'OP-010',
      OPERATION2: '-',
      EVENTUSER: 'USER-01',
      ISCARRAY: '',
      BAY: '',
      STOCKER: '',
    });

    expect(post.mock.calls.map(([url]) => url)).toEqual([
      '/hifos/wetremoteeqpinfo',
      '/hifos/lotinfo',
      '/hifos/recipeinfo',
      '/hifos/machineportstatus',
      '/hifos/machineportclear',
      '/hifos/ramjobcancel',
      '/hifos/wetremotestart',
    ]);
    const messages = post.mock.calls.map(([, payload]) => (payload as { sMsg: string }).sMsg);
    expect(messages[0]).toContain('<MSGNAME>WETREMOTEEQPINFO</MSGNAME>');
    expect(messages[0]).toContain('<RECEIVER>SERVER-01</RECEIVER>');
    expect(messages[0]).toContain('<SENDER>DEVICE-01</SENDER>');
    expect(messages[1]).toContain('<LOTID>&lt;LOT&amp;1&gt;</LOTID>');
    expect(messages[2]).toContain('<CHMEQPID>CH-01</CHMEQPID>');
    expect(messages[3]).toContain('<RECIPE></RECIPE>');
    expect(messages[5]).toContain('<EVENTUSER>USER-01</EVENTUSER>');
    expect(messages[6]).toContain('<NUMCASS>1</NUMCASS>');
    expect(messages[6]).toContain('<STOCKER></STOCKER>');
  });

  it('normalizes backend failures and network exceptions', async () => {
    const post = vi.spyOn(apiClient, 'post');
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'backend failure' }),
      },
    } as never);
    expect(await remoteRamcoApi.fetchEquipmentInfo({ EQPID: 'EQP-01' })).toEqual({
      ok: false,
      message: 'backend failure',
    });

    post.mockRejectedValueOnce(new Error('network failure'));
    expect(await remoteRamcoApi.fetchEquipmentInfo({ EQPID: 'EQP-01' })).toEqual({
      ok: false,
      message: 'network failure',
    });
  });
});

describe('remoteRamcoApi messages', () => {
  it('uses the hifos2 RemoteRamcoActivity message names', () => {
    expect(Object.values(REMOTE_RAMCO_MESSAGES)).toEqual([
      'WETREMOTEEQPINFO',
      'LOTINFO',
      'RECIPEINFO',
      'MACHINEPORTSTATUS',
      'MACHINEPORTCLEAR',
      'RAMJOBCANCEL',
      'WETREMOTESTART',
    ]);
  });
});
