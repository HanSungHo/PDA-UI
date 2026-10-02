import { fail, pass } from '../utils/response.js';

function batchItemBody(item) {
  return {
    LOTID: item.lotId,
    COMMENTQTY: String(item.commentQty || 0),
    STATE: item.status,
    PROCESSSTEP: item.processStep,
    PRODUCT: item.product,
    QUANTITY: item.quantity,
    ERRORMESSAGE: item.errorMessage,
    OPERATION: item.operation,
    SUBOPERATION: item.subOperation,
    LOTSTATE: item.lotState,
    NWCOMMENTQTY: String(item.nwCommentQty || 0),
    OPERSEQUENCE: item.operSequence,
    OPTYPE: item.opType,
    BAYNAME: item.bayName,
    STOCKERNAME: item.stockerName,
    PROCESSNAME: item.processName || '',
    THICKAREA: item.thickArea || '',
  };
}

export function createBatchHandlers(store) {
  return {
    BATCHLISTBYLOT: ({ payload }) => {
      const batch = store.getBatch(payload.BATCHID) || store.getBatchByLot(payload.LOTID);
      if (!batch) return fail('해당 Batch를 찾을 수 없습니다.');
      return pass({
        BATCHID: batch.context.batchId,
        LOTID: batch.context.lotId,
        EQPID: batch.context.eqpId,
        RECIPE: batch.context.recipe,
        COMMENT: batch.context.comment,
        TRANSPORT: batch.context.transport,
        FACILITY: payload.FACILITY || batch.context.facility,
        CHECKPARAMETER: batch.checkParameter,
        UNREADWORKCOMMENTQTY: String(batch.unreadWorkCommentQty),
        BATCHITEMS: batch.items.map(batchItemBody),
      });
    },
    BATCHLIST: ({ payload }) => {
      const batch = store.getBatch(payload.BATID || payload.BATCHID);
      if (!batch) return fail('해당 Batch를 찾을 수 없습니다.');
      return pass({
        BATID: batch.context.batchId,
        FACILITY: payload.FACILITY || batch.context.facility,
        ITEMS: batch.items.map((item, index) => ({
          NO: String(index + 1),
          LOTID: item.lotId,
          ISDCOL: item.lotId === 'D/W' ? 'Y' : '',
        })),
      });
    },
    BATCHCOUNT: () => pass({ BATCHDOWN: 'N', DOWNMESSAGE: '' }),
    CHECKBATCHCOUNT: () => pass({ BATCHDOWN: 'N', DOWNMESSAGE: '' }),
  };
}
