import { beforeEach, describe, expect, it, vi } from 'vitest';

import { remoteCvdEtchRcpApi } from '~/features/remote-start/services/remoteCvdEtchRcp.service';
import { remoteEtchService } from '~/features/remote-start/services/remoteEtchCommRcp.service';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

describe('remoteEtchCommRcp.service', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('is the same AIFMSG API that Remote CVD uses', () => {
    expect(remoteCvdEtchRcpApi).toBe(remoteEtchService);
  });

  it('getEtchCommRcp posts ETCH_COMMRCP to the etchcommrcp route like MessageFactoryUtil.etchCommRcp', async () => {
    postAifMessage.mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { PROCESS_TYPE: 'TE8500' } }),
    });

    const res = await remoteEtchService.getEtchCommRcp({
      lotId: 'LOT_TEST',
      recipe: 'RCP_TEST',
      eqpId: 'TE8500_01',
      operId: 'OP10',
      operDesc: 'Etch',
    });

    expect(postAifMessage).toHaveBeenCalledWith('etchcommrcp', 'ETCH_COMMRCP', [
      ['LOTID', 'LOT_TEST'],
      ['RCP', 'RCP_TEST'],
      ['EQP', 'TE8500_01'],
      ['PROCESSOPERATIONNAME', 'OP10'],
      ['OPERATIONDESCRIPTION', 'Etch'],
    ]);
    expect(res).toEqual({ isSuccessFul: true, result: { PROCESS_TYPE: 'TE8500' } });
  });
});
