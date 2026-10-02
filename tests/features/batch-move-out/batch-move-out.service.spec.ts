import {
  checkBatchMoveOutBatchCount,
  executeBatchMoveOut,
  fetchBatchMoveOutFqcSampling,
  fetchBatchMoveOutList,
} from 'src/features/batch-move-out/services/batch-move-out.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post,
  },
}));

describe('batch move out service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts BATCHLISTBYLOT and maps the mocked response', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            BATCHID: 'BATCH-DEMO-01',
            LOTID: 'LOT',
            EQPID: 'EQP',
            RECIPE: 'RCP',
            COMMENT: 'comment',
            TRANSPORT: 'Y',
            FACILITY: 'KFAB',
            CHECKPARAMETER: 'Y',
            UNREADWORKCOMMENTQTY: '0',
            BATCHITEMS: [
              {
                LOTID: 'LOT',
                NWCOMMENTQTY: '0',
                STATE: 'RUN',
                PROCESSSTEP: 'DIFF',
                PRODUCT: 'PRODUCT',
                QUANTITY: '25',
                ERRORMESSAGE: '',
                OPERATION: '1100',
                SUBOPERATION: '00',
                LOTSTATE: 'WIP',
                OPERSEQUENCE: '002',
                OPTYPE: 'MVOU',
                BAYNAME: 'BAY-01',
                DEFAULTSTOCKERNAME: 'STK-01',
                PROCESSNAME: '',
                THICKAREA: '',
              },
            ],
          },
        }),
      },
    });
    const request = {
      lotId: 'LOT',
      batchId: 'BATCH',
      eqpId: 'EQP',
      facility: 'KFAB',
      state: 'MVOU',
    };

    const result = await fetchBatchMoveOutList(request);

    expect(result.ok).toBe(true);
    expect(result.data?.context.batchId).toBe('BATCH-DEMO-01');
    expect(result.data?.items[0]).toMatchObject({
      lotId: 'LOT',
      commentQty: 0,
      status: 'RUN',
      lotState: 'WIP',
      stockerName: 'STK-01',
    });
    expect(post).toHaveBeenCalledWith('/hifos/BATCHLISTBYLOT', {
      LOTID: 'LOT',
      BATCHID: 'BATCH',
      MACHINENAME: 'EQP',
      FACILITY: 'KFAB',
      STATE: 'MVOU',
    });
  });

  it('posts MOVEOUT and maps PASS or FAIL responses', async () => {
    const request = {
      lotId: 'LOT-OK-001',
      facility: 'KFAB',
      recipe: 'RCP',
      eqpId: 'EQP',
      operation: 'OP',
      subOperation: '10',
      opType: 'NORMAL',
      comment: 'comment',
      isCarry: 'N',
      bayName: '',
      stockerName: '',
      quantity: '25',
      isSkip: 'N',
      operatorId: '',
      inputMaskLogo: '',
      wfInterlock: '',
    };

    post.mockResolvedValueOnce({
      data: { result: JSON.stringify({ STATUS: 'PASS', MSGBODY: {} }) },
    });
    await expect(executeBatchMoveOut(request)).resolves.toEqual({ ok: true });

    post.mockResolvedValueOnce({
      data: { result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'LOT-FAIL-001 MOVE OUT failed.' }) },
    });
    await expect(executeBatchMoveOut({ ...request, lotId: 'LOT-FAIL-001' })).resolves.toEqual({
      ok: false,
      message: 'LOT-FAIL-001 MOVE OUT failed.',
    });
    expect(post).toHaveBeenNthCalledWith(1, '/hifos/MOVEOUT', {
      LOTID: 'LOT-OK-001',
      FACILITY: 'KFAB',
      EQPID: 'EQP',
      OPERATION: 'OP',
      SUBOPERATION: '10',
      RECIPE: 'RCP',
      OPTYPE: 'NORMAL',
      ISSKIP: 'N',
      OPERATORID: '',
      COMMENT: 'comment',
      ISCARRY: 'N',
      BAY: '',
      STOCKER: '',
      QUANTITY: '25',
      INPUTMASKLOGO: '',
      WFINTERLOCK: '',
    });
  });

  it('posts FQCSAMPLING and CHECKBATCHCOUNT and maps mocked responses', async () => {
    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            CYCLECOMMENT: '',
            RECIPECOMMENT: '',
            UPDATECODE: '',
            DELETECODE: '',
          },
        }),
      },
    });
    await expect(
      fetchBatchMoveOutFqcSampling({
        lotId: 'LOT-OK-001',
        opType: 'NORMAL',
        eqpId: 'EQP',
        operation: 'OP',
        subOperation: '10',
      }),
    ).resolves.toEqual({
      ok: true,
      cycleComment: '',
      recipeComment: '',
      updateCode: '',
      deleteCode: '',
    });

    post.mockResolvedValueOnce({
      data: {
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { BATCHDOWN: 'Y', DOWNMESSAGE: 'Batch count down.' },
        }),
      },
    });
    await expect(
      checkBatchMoveOutBatchCount({ facility: 'KFAB', eqpId: 'EQP', operatorId: '' }),
    ).resolves.toEqual({ ok: true, batchDown: true, downMessage: 'Batch count down.' });

    expect(post).toHaveBeenNthCalledWith(1, '/hifos/FQCSAMPLING', {
      LOTID: 'LOT-OK-001',
      OPTYPE: 'NORMAL',
      EQPID: 'EQP',
      OPER: 'OP',
      SUBOPER: '10',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/hifos/CHECKBATCHCOUNT', {
      FACTORYNAME: 'KFAB',
      MACHINENAME: 'EQP',
      USERID: '',
    });
  });
});
