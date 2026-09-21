import {
  executeBatchMoveIn,
  fetchBatchMoveInList,
} from 'src/features/batch-move-in/services/batch-move-in.service';
import { describe, expect, it } from 'vitest';

describe('batch move in service mock', () => {
  it('returns a cloned mock batch list', async () => {
    const first = await fetchBatchMoveInList();
    const second = await fetchBatchMoveInList();

    expect(first).not.toBe(second);
    expect(first.context.batchId).toBe('BATCH-DEMO-01');
    expect(first.items).toHaveLength(2);

    first.items[0].status = 'RUN';

    expect(second.items[0].status).toBe('READY');
  });

  it('returns success or failure from lot id rule', async () => {
    await expect(
      executeBatchMoveIn({
        lotId: 'LOT-OK-001',
        facility: 'KFAB',
        recipe: 'RCP',
        eqpId: 'EQP',
        operation: 'OP',
        subOperation: '10',
        isSkip: 'N',
        quantity: '25',
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      executeBatchMoveIn({
        lotId: 'LOT-FAIL-001',
        facility: 'KFAB',
        recipe: 'RCP',
        eqpId: 'EQP',
        operation: 'OP',
        subOperation: '10',
        isSkip: 'N',
        quantity: '25',
      }),
    ).resolves.toEqual({ ok: false, message: 'LOT-FAIL-001 MOVE IN failed.' });
  });
});
