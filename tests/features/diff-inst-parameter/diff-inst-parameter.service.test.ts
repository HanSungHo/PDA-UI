import {
  fetchDiffEqpDataInfo,
  fetchEqpParameters,
  insertParameter,
} from 'src/features/diff-inst-parameter/services/diff-inst-parameter.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('src/services/api-client', () => ({
  default: { post: postMock },
}));

function messageResponse(status: 'PASS' | 'FAIL', body: unknown, errorMessage = '') {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, MSGBODY: body, ERRMSG: errorMessage }),
    },
  };
}

describe('diff inst parameter service', () => {
  afterEach(() => {
    postMock.mockReset();
  });

  it('posts DIFFEQPDATAINFO and maps lot data', async () => {
    postMock.mockResolvedValue(
      messageResponse('PASS', {
        LOTPROCESSSTATE: 'RUN',
        BATCHID: 'BAT202048248',
        MACHINENAME: 'DIFF-01',
        PROCESSOPERATIONNAME: '2200',
        REUPDATE: 'N',
      }),
    );

    await expect(fetchDiffEqpDataInfo('LOT-DIFF-01')).resolves.toEqual({
      ok: true,
      data: {
        lotProcessState: 'RUN',
        batchId: 'BAT202048248',
        machineName: 'DIFF-01',
        processOperationName: '2200',
        reUpdate: 'N',
      },
    });
    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'DIFFEQPDATAINFO',
      payload: { LOTID: 'LOT-DIFF-01' },
    });
  });

  it('posts GETEQPPARA and maps parameter rows', async () => {
    postMock.mockResolvedValue(
      messageResponse('PASS', {
        GETDATE: 'Y',
        EQPDATA: [{ NO: '1', TITLEPARAMETER: 'CD', MIN: '0.10', MAX: '0.15', DATA: '0.12' }],
      }),
    );

    await expect(fetchEqpParameters({ machineName: 'DIFF-01', facility: 'KFAB' })).resolves.toEqual(
      {
        ok: true,
        getDate: 'Y',
        items: [{ no: '1', para: 'CD', min: '0.10', max: '0.15', data: '0.12' }],
      },
    );
  });

  it('posts INSERTPARA and preserves MACHIHNESTATE typo from legacy response', async () => {
    postMock.mockResolvedValue(messageResponse('PASS', { MACHIHNESTATE: '' }));

    await expect(
      insertParameter({
        userId: 'OPERATOR_ID',
        batchId: 'BAT202048248',
        machineName: 'DIFF-01',
        facility: 'KFAB',
        eqpPara: '0.12',
        eqpParaNo: '1',
        eqpParaMax: '0.15',
      }),
    ).resolves.toEqual({ ok: true, machineState: '' });
    expect(postMock).toHaveBeenCalledWith('/message/send', {
      messageName: 'INSERTPARA',
      payload: {
        USERID: 'OPERATOR_ID',
        BATCHID: 'BAT202048248',
        MACHINENAME: 'DIFF-01',
        FACILITY: 'KFAB',
        EQPPARA: '0.12',
        EQPPARANO: '1',
        EQPPARAMAX: '0.15',
      },
    });
  });
});
