import {
  executeBatchMoveIn,
  fetchBatchMoveInList,
} from 'src/features/batch-move-in/services/batch-move-in.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postAifMessage } = vi.hoisted(() => ({ postAifMessage: vi.fn() }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage }));

const pass = (body: Record<string, unknown> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

const context = {
  batchId: 'BAT-A260915-001',
  lotId: 'LOT-DEMO-BATCH',
  eqpId: 'EQP-DEMO-01',
  recipe: 'RCP-DEMO-01',
  isSkip: 'N',
  facility: 'KFAB',
};

const item = {
  LOTID: 'LOT-DEMO-BATCH',
  COMMENTQTY: '1',
  STATUS: 'WAIT',
  PROCESSSTEP: 'PROC-010',
  PRODUCT: 'PRODUCT-A',
  QUANTITY: '25',
  ERRORMESSAGE: '',
  OPERATION: 'OPER',
  SUBOPERATION: '010',
  LOTSTATE: 'WIP',
  NWCOMMENTQTY: '0',
  OPERSEQUENCE: '0001',
  PROCESSNAME: 'MW_TEST',
};

describe('batch move in service (mock server API)', () => {
  beforeEach(() => {
    postAifMessage.mockReset();
  });

  it('sends BATCHLISTBYLOT like batchListByLotMoveIn (recipe in STATUS) and maps the items', async () => {
    postAifMessage.mockResolvedValue(pass({ NWCOMMENTQTY: '2', BATCHITEMS: [item] }));

    const result = await fetchBatchMoveInList(context);

    expect(postAifMessage).toHaveBeenCalledWith('BATCHLISTBYLOT', 'BATCHLISTBYLOT', [
      ['LOTID', 'LOT-DEMO-BATCH'],
      ['FACILITY', 'KFAB'],
      ['STATUS', 'RCP-DEMO-01'],
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        context,
        unreadWorkCommentQty: 2,
        items: [
          {
            lotId: 'LOT-DEMO-BATCH',
            commentQty: 1,
            status: 'WAIT',
            processStep: 'PROC-010',
            product: 'PRODUCT-A',
            quantity: '25',
            errorMessage: '',
            operation: 'OPER',
            subOperation: '010',
            lotState: 'WIP',
            nwCommentQty: 0,
            operSequence: '0001',
            processName: 'MW_TEST',
          },
        ],
      },
    });
  });

  it('reads BATCHITEMS wrapped in ITEM', async () => {
    postAifMessage.mockResolvedValue(pass({ BATCHITEMS: { ITEM: [item, item] } }));

    const result = await fetchBatchMoveInList(context);

    expect(result.ok && result.data.items).toHaveLength(2);
  });

  it('returns the server error message when the list fails', async () => {
    postAifMessage.mockResolvedValue(fail('해당 Batch를 찾을 수 없습니다.'));

    await expect(fetchBatchMoveInList(context)).resolves.toEqual({
      ok: false,
      message: '해당 Batch를 찾을 수 없습니다.',
    });
  });

  it('sends MOVEIN with the legacy fields and reports failure with ERRMSG', async () => {
    postAifMessage.mockResolvedValueOnce(pass()).mockResolvedValueOnce(fail('MOVE IN failed.'));
    const request = {
      lotId: 'LOT-DEMO-BATCH',
      facility: 'KFAB',
      recipe: 'RCP-DEMO-01',
      eqpId: 'EQP-DEMO-01',
      operation: 'OPER',
      subOperation: '010',
      isSkip: 'N',
      quantity: '25',
    };

    await expect(executeBatchMoveIn(request)).resolves.toEqual({ ok: true });
    await expect(executeBatchMoveIn(request)).resolves.toEqual({
      ok: false,
      message: 'MOVE IN failed.',
    });
    expect(postAifMessage.mock.calls[0]?.[2]).toEqual([
      ['LOTID', 'LOT-DEMO-BATCH'],
      ['FACILITY', 'KFAB'],
      ['RECIPE', 'RCP-DEMO-01'],
      ['EQPID', 'EQP-DEMO-01'],
      ['OPERATION', 'OPER'],
      ['SUBOPERATION', '010'],
      ['ISSKIP', 'N'],
      ['OPERATORID', 'OPERATOR_ID'],
      ['ISEXPOSURE', ''],
      ['IDENTCODE', 'N'],
      ['RETICLEID', ''],
      ['QUANTITY', '25'],
      ['COMMENT', ''],
      ['REWORKSKIP', ''],
    ]);
  });
});
