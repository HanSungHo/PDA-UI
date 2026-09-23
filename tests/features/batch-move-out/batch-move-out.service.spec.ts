import {
  checkBatchMoveOutBatchCount,
  executeBatchMoveOut,
  fetchBatchMoveOutFqcSampling,
  fetchBatchMoveOutList,
} from 'src/features/batch-move-out/services/batch-move-out.service';
import { describe, expect, it } from 'vitest';

describe('batch move out service mock', () => {
  it('returns a cloned mock batch list', async () => {
    const request = {
      lotId: 'LOT',
      batchId: 'BATCH',
      eqpId: 'EQP',
      facility: 'KFAB',
      state: 'MVOU',
    };
    const first = await fetchBatchMoveOutList(request);
    const second = await fetchBatchMoveOutList(request);

    expect(first).not.toBe(second);
    expect(first.data?.context.batchId).toBe('BATCH-DEMO-01');

    first.data!.items[1].status = 'WAIT';

    expect(second.data?.items[1].status).toBe('RUN');
  });

  it('returns success or failure from lot id rule', async () => {
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

    await expect(executeBatchMoveOut(request)).resolves.toEqual({ ok: true });
    await expect(executeBatchMoveOut({ ...request, lotId: 'LOT-FAIL-001' })).resolves.toEqual({
      ok: false,
      message: 'LOT-FAIL-001 MOVE OUT failed.',
    });
  });

  it('returns successful FQC and batch count mock responses', async () => {
    await expect(
      fetchBatchMoveOutFqcSampling({
        lotId: 'LOT-OK-001',
        opType: 'NORMAL',
        eqpId: 'EQP',
        operation: 'OP',
        subOperation: '10',
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      checkBatchMoveOutBatchCount({ facility: 'KFAB', eqpId: 'EQP', operatorId: '' }),
    ).resolves.toEqual({ ok: true, batchDown: false });
  });
});
