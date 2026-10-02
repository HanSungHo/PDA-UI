import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  createRemoteRamcoMockApi,
  REMOTE_RAMCO_MOCK_CASES,
} from 'src/features/remote-ramco/mocks/remote-ramco.mock';
import { remoteRamcoApi } from 'src/features/remote-ramco/services/remote-ramco.service';
import { REMOTE_RAMCO_MESSAGES } from 'src/features/remote-ramco/types/remote-ramco.types';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteRamcoApi mock boundary', () => {
  it('returns typed development responses for each legacy message service', async () => {
    const mockApi = createRemoteRamcoMockApi();
    const equipment = await mockApi.fetchEquipmentInfo({ EQPID: 'EQP-01' });
    const lot = await mockApi.fetchLotInfo({
      TYPE: 'MVIN',
      LOTID: 'LOT-01',
      FACILITY: 'FAC',
    });
    const recipe = await mockApi.fetchRecipeInfo({
      ISPHOTO: 'N',
      LOTID: 'LOT-01',
      OPERATION: 'OP',
      SUBOPERATION: '10',
      PRODUCT: 'PROD',
      EQPID: 'EQP-01',
      OPTYPE: 'N',
      FACILITY: 'FAC',
    });
    const port = await mockApi.fetchPortStatus({
      EQPID: 'EQP-01',
      PORTNAME: '1',
      LOTID: 'LOT-01',
      RECIPE: '',
    });
    const clear = await mockApi.clearPort({ MACHINENAME: 'EQP-01', PORTNAME: '1' });
    const cancel = await mockApi.cancelJobs({
      MACHINETYPE: 'ETCH',
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      EVENTUSER: 'USER',
      JOBNAME1: '',
      JOBNAME2: '',
    });
    const start = await mockApi.startRemote({
      MACHINENAME: 'EQP-01',
      MACHINENAME2: 'EQP-01',
      MACHINETYPE: 'ETCH',
      AREANAME: 'AREA',
      NUMCASS: '1',
      LOTNAME: 'LOT-01',
      LOTNAME2: '',
      RECIPENAME: 'RCP',
      JOBNAME: 'JOB',
      PRODUCTQTY: '25',
      PRODUCTQTY2: '',
      OPERATION: 'OP-10',
      OPERATION2: '-',
      EVENTUSER: 'USER',
      ISCARRAY: '',
      BAY: '',
      STOCKER: '',
    });

    expect(equipment).toMatchObject({ ok: true, data: { EQPTYPE: 'ETCH' } });
    expect(lot).toMatchObject({ ok: true, data: { STATE: 'WIP' } });
    expect(recipe).toMatchObject({ ok: true, data: { RECIPE: 'RCP-DEMO-01' } });
    expect(port).toMatchObject({ ok: true, data: { PORTSTATENAME: 'READY' } });
    expect(clear).toEqual({ ok: true, data: null });
    expect(cancel).toMatchObject({ ok: true, data: { RET: '0' } });
    expect(start).toEqual({ ok: true, data: null });
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

  it.each([
    ['equipment-error', 'fetchEquipmentInfo', '장비 조회 mock 오류'],
    ['lot-error', 'fetchLotInfo', 'LOT 조회 mock 오류'],
    ['recipe-error', 'fetchRecipeInfo', 'Recipe 조회 mock 오류'],
    ['port-error', 'fetchPortStatus', 'PORT 조회 mock 오류'],
    ['clear-port-error', 'clearPort', 'PORT 초기화 mock 오류'],
    ['job-cancel-error', 'cancelJobs', 'Job 삭제 mock 오류'],
    ['start-error', 'startRemote', 'Remote Start mock 오류'],
  ] as const)('provides %s failure fixture', async (mockCase, method, message) => {
    const api = createRemoteRamcoMockApi(mockCase);
    const results = {
      fetchEquipmentInfo: () => api.fetchEquipmentInfo({ EQPID: 'EQP' }),
      fetchLotInfo: () => api.fetchLotInfo({ TYPE: 'MVIN', LOTID: 'LOT', FACILITY: 'FAC' }),
      fetchRecipeInfo: () =>
        api.fetchRecipeInfo({
          ISPHOTO: 'N',
          LOTID: 'LOT',
          OPERATION: 'OP',
          SUBOPERATION: '10',
          PRODUCT: 'PROD',
          EQPID: 'EQP',
          OPTYPE: 'N',
          FACILITY: 'FAC',
        }),
      fetchPortStatus: () =>
        api.fetchPortStatus({ EQPID: 'EQP', PORTNAME: '1', LOTID: 'LOT', RECIPE: '' }),
      clearPort: () => api.clearPort({ MACHINENAME: 'EQP', PORTNAME: '1' }),
      cancelJobs: () =>
        api.cancelJobs({
          MACHINETYPE: 'ETCH',
          MACHINENAME: 'EQP',
          MACHINENAME2: 'EQP',
          EVENTUSER: 'USER',
          JOBNAME1: '',
          JOBNAME2: '',
        }),
      startRemote: () =>
        api.startRemote({
          MACHINENAME: 'EQP',
          MACHINENAME2: 'EQP',
          MACHINETYPE: 'ETCH',
          AREANAME: 'AREA',
          NUMCASS: '1',
          LOTNAME: 'LOT',
          LOTNAME2: '',
          RECIPENAME: 'RCP',
          JOBNAME: 'JOB',
          PRODUCTQTY: '25',
          PRODUCTQTY2: '',
          OPERATION: 'OP-10',
          OPERATION2: '-',
          EVENTUSER: 'USER',
          ISCARRAY: '',
          BAY: '',
          STOCKER: '',
        }),
    };
    const result = await results[method]();
    expect(result).toEqual({ ok: false, message });
  });

  it.each([
    ['equipment-active', { PCOUNT: 'N' }],
    ['ultima3', { EQPTYPE: 'ULTIMA3' }],
    ['ram8500z', { EQPTYPE: 'RAM8500z', INGRCP: 'RCP-RUN' }],
  ] as const)('returns equipment fixture for %s', async (mockCase, expected) => {
    const result = await createRemoteRamcoMockApi(mockCase).fetchEquipmentInfo({ EQPID: 'EQP' });
    expect(result).toMatchObject({ ok: true, data: expected });
  });

  it.each([
    ['lot-run', { STATUS: 'RUN' }],
    ['lot-invalid-wip', { STATE: 'WAIT' }],
    ['lot-hold', { HOLDSTATUS: 'ONHOLD' }],
    ['lot-batch', { BATCHID: 'BATCH-DEMO' }],
    ['lot-photo', { AREA: 'PHOTO' }],
    ['lot-reserved', { LOTRESUSER: 'USER-DEMO' }],
  ] as const)('returns LOT validation fixture for %s', async (mockCase, expected) => {
    const result = await createRemoteRamcoMockApi(mockCase).fetchLotInfo({
      TYPE: 'MVIN',
      LOTID: 'LOT-FRONT',
      FACILITY: 'FAC',
    });
    expect(result).toMatchObject({ ok: true, data: expected });
  });

  it('returns paired-LOT recipe, unread-comment and PORT-state fixtures', async () => {
    const mismatch = await createRemoteRamcoMockApi('recipe-mismatch').fetchRecipeInfo({
      ISPHOTO: 'N',
      LOTID: 'LOT-REAR',
      OPERATION: 'OP',
      SUBOPERATION: '10',
      PRODUCT: 'PROD',
      EQPID: 'EQP',
      OPTYPE: 'N',
      FACILITY: 'FAC',
    });
    expect(mismatch).toMatchObject({ ok: true, data: { RECIPE: 'RCP-OTHER' } });

    const commentsApi = createRemoteRamcoMockApi('unread-comments');
    await commentsApi.fetchLotInfo({ TYPE: 'MVIN', LOTID: 'LOT-FRONT', FACILITY: 'FAC' });
    const unreadComments = await commentsApi.fetchLotInfo({
      TYPE: 'MVIN',
      LOTID: 'LOT-FRONT',
      FACILITY: 'FAC',
    });
    expect(unreadComments).toMatchObject({ ok: true, data: { NWCOMMENTQTY: '2' } });

    const runningPort = await createRemoteRamcoMockApi('port-run').fetchPortStatus({
      EQPID: 'EQP',
      PORTNAME: '1',
      LOTID: 'LOT',
      RECIPE: '',
    });
    const emptyPort = await createRemoteRamcoMockApi('port-empty').fetchPortStatus({
      EQPID: 'EQP',
      PORTNAME: '1',
      LOTID: 'LOT',
      RECIPE: '',
    });
    expect(runningPort).toMatchObject({ ok: true, data: { PORTSTATENAME: 'RUN' } });
    expect(emptyPort).toMatchObject({ ok: true, data: { PORTSTATENAME: '' } });

    for (const mockCase of ['qtime-over', 'qtime-warning'] as const) {
      const recipe = await createRemoteRamcoMockApi(mockCase).fetchRecipeInfo({
        ISPHOTO: 'N',
        LOTID: 'LOT',
        OPERATION: 'OP',
        SUBOPERATION: '10',
        PRODUCT: 'PROD',
        EQPID: 'EQP',
        OPTYPE: 'N',
        FACILITY: 'FAC',
      });
      expect(recipe).toMatchObject({
        ok: true,
        data: mockCase === 'qtime-over' ? { QTIME_FLAG: 'Y' } : { QTIME_FLAG_W: 'Y' },
      });
    }
    expect(REMOTE_RAMCO_MOCK_CASES).toContain('start-error');
  });
});

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
