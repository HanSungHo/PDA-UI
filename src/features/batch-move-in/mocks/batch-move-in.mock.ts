import type { BatchMoveInListResponse } from '../types/batch-move-in.types';

export const mockBatchMoveInResponse: BatchMoveInListResponse = {
  context: {
    batchId: 'BATCH-DEMO-01',
    lotId: 'LOT-A260915-018',
    eqpId: 'EQP-DEMO-01',
    recipe: 'RCP-DEMO-01',
    isSkip: 'N',
    facility: 'KFAB',
  },
  unreadWorkCommentQty: 0,
  items: [
    {
      lotId: 'LOT-DEMO-01',
      commentQty: 1,
      status: 'READY',
      processStep: 'PROC-010',
      product: 'PRODUCT-A',
      quantity: '25',
      errorMessage: '',
      operation: 'OPER',
      subOperation: '010',
      lotState: 'Null',
      nwCommentQty: 1,
      operSequence: '0001',
    },
    {
      lotId: 'LOT-A260915-019',
      commentQty: 0,
      status: 'WAIT',
      processStep: 'PROC-010',
      product: 'PRODUCT-A',
      quantity: '25',
      errorMessage: '',
      operation: 'OPER',
      subOperation: '010',
      lotState: 'WIP',
      nwCommentQty: 0,
      operSequence: '0002',
    },
  ],
};
