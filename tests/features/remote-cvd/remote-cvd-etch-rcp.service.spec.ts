import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, mainStore } = vi.hoisted(() => ({
  post: vi.fn(),
  mainStore: { mobileServerName: 'MOBILE', deviceName: 'DEVICE' },
}));

vi.mock('src/services/api-client', () => ({ default: { post } }));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => mainStore }));

import { remoteCvdEtchRcpApi } from '../../../src/features/remote-start/services/remoteCvdEtchRcp.service';

describe('remoteCvdEtchRcpApi', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { CHK: 'OK' } }),
      },
    });
  });

  it('sends ETCH_COMMRCP to the legacy lowercase route with all legacy fields', async () => {
    await remoteCvdEtchRcpApi.getEtchCommRcp({
      lotId: 'LOT-01',
      recipe: 'RCP-01',
      eqpId: 'CVD-MAIN-01',
      operId: '10020',
      operDesc: 'CVD PROCESS',
    });

    expect(post).toHaveBeenCalledWith('/hifos/etchcommrcp', {
      sMsg: expect.stringContaining('<MSGNAME>ETCH_COMMRCP</MSGNAME>'),
    });
    const { sMsg } = post.mock.calls[0]?.[1] as { sMsg: string };
    expect(sMsg).toContain('<LOTID>LOT-01</LOTID>');
    expect(sMsg).toContain('<RCP>RCP-01</RCP>');
    expect(sMsg).toContain('<EQP>CVD-MAIN-01</EQP>');
    expect(sMsg).toContain('<PROCESSOPERATIONNAME>10020</PROCESSOPERATIONNAME>');
    expect(sMsg).toContain('<OPERATIONDESCRIPTION>CVD PROCESS</OPERATIONDESCRIPTION>');
    expect(sMsg).toContain('<RECEIVER>MOBILE</RECEIVER>');
  });

  it('sends ETCH_RCP_DOWNLOAD with the complete legacy payload and parses CHK', async () => {
    await expect(
      remoteCvdEtchRcpApi.downloadRecipe({
        lotId: 'LOT-01',
        recipe: 'RCP-01',
        eqpId: 'CVD-MAIN-01',
        operatorId: 'OP-01',
        chamber: 'CH1',
        rmsPara: 'RF_TOP_PWR',
        downValue: '320',
        step: '1',
      }),
    ).resolves.toEqual({ isSuccessFul: true, result: { CHK: 'OK' } });

    expect(post).toHaveBeenCalledWith('/hifos/etchrcpdownload', {
      sMsg: expect.stringContaining('<MSGNAME>ETCH_RCP_DOWNLOAD</MSGNAME>'),
    });
    const { sMsg } = post.mock.calls[0]?.[1] as { sMsg: string };
    expect(sMsg).toContain('<USERID>OP-01</USERID>');
    expect(sMsg).toContain('<CHM>CH1</CHM>');
    expect(sMsg).toContain('<PARAMETER>RF_TOP_PWR</PARAMETER>');
    expect(sMsg).toContain('<DOWN_VALUE>320</DOWN_VALUE>');
    expect(sMsg).toContain('<STEP>1</STEP>');
  });

  it('returns a legacy failure without throwing when the mock server rejects a request', async () => {
    post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'RCP 조건 정보가 없습니다.' }),
      },
    });

    await expect(
      remoteCvdEtchRcpApi.getEtchCommRcp({
        lotId: 'LOT-01',
        recipe: 'RCP-01',
        eqpId: 'CVD-MAIN-01',
        operId: '10020',
        operDesc: 'CVD PROCESS',
      }),
    ).resolves.toEqual({
      isSuccessFul: false,
      result: {},
      errorMessage: 'RCP 조건 정보가 없습니다.',
    });
  });
});
