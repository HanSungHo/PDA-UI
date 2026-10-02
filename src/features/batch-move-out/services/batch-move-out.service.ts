import {
  body,
  errorMessage,
  list,
  type MessageBody,
  number,
  type ParsedMessage,
  postJsonMessage,
  text,
} from 'src/features/move-out/services/message.service';

import type {
  BatchMoveOutBatchCountRequest,
  BatchMoveOutBatchCountResult,
  BatchMoveOutFqcRequest,
  BatchMoveOutFqcResult,
  BatchMoveOutItem,
  BatchMoveOutListRequest,
  BatchMoveOutListResponse,
  BatchMoveOutListResult,
  BatchMoveOutRequest,
  BatchMoveOutResult,
} from '../types/batch-move-out.types';

function failResult<T extends { ok: boolean; message?: string }>(parsed: ParsedMessage): T {
  return { ok: false, message: errorMessage(parsed) } as T;
}

function mapBatchItem(item: MessageBody): BatchMoveOutItem {
  return {
    lotId: text(item, 'LOTID'),
    commentQty: number(item, 'COMMENTQTY') || number(item, 'NWCOMMENTQTY'),
    status: text(item, 'STATE') || text(item, 'STATUS'),
    processStep: text(item, 'PROCESSSTEP'),
    product: text(item, 'PRODUCT'),
    quantity: text(item, 'QUANTITY'),
    errorMessage: text(item, 'ERRORMESSAGE'),
    operation: text(item, 'OPERATION'),
    subOperation: text(item, 'SUBOPERATION'),
    lotState: text(item, 'LOTSTATE') || text(item, 'STATE'),
    nwCommentQty: number(item, 'NWCOMMENTQTY'),
    operSequence: text(item, 'OPERSEQUENCE'),
    opType: text(item, 'OPTYPE'),
    bayName: text(item, 'BAYNAME'),
    stockerName: text(item, 'DEFAULTSTOCKERNAME') || text(item, 'STOCKERNAME'),
    processName: text(item, 'PROCESSNAME'),
    thickArea: text(item, 'THICKAREA'),
  };
}

export async function fetchBatchMoveOutList(
  request: BatchMoveOutListRequest,
): Promise<BatchMoveOutListResult> {
  const parsed = await postJsonMessage('BATCHLISTBYLOT', {
    LOTID: request.lotId,
    BATCHID: request.batchId,
    MACHINENAME: request.eqpId,
    FACILITY: request.facility,
    STATE: request.state,
  });

  if (parsed.STATUS !== 'PASS') {
    return failResult<BatchMoveOutListResult>(parsed);
  }

  const responseBody = body(parsed);
  const data: BatchMoveOutListResponse = {
    context: {
      batchId: text(responseBody, 'BATCHID'),
      lotId: text(responseBody, 'LOTID') || request.lotId,
      eqpId: text(responseBody, 'EQPID') || request.eqpId,
      recipe: text(responseBody, 'RECIPE'),
      comment: text(responseBody, 'COMMENT'),
      transport: text(responseBody, 'TRANSPORT'),
      facility: text(responseBody, 'FACILITY') || request.facility,
    },
    checkParameter: text(responseBody, 'CHECKPARAMETER'),
    unreadWorkCommentQty: number(responseBody, 'UNREADWORKCOMMENTQTY'),
    items: list(responseBody, 'BATCHITEMS').map(mapBatchItem),
  };

  return { ok: true, data };
}

export async function executeBatchMoveOut(
  request: BatchMoveOutRequest,
): Promise<BatchMoveOutResult> {
  const parsed = await postJsonMessage('MOVEOUT', {
    LOTID: request.lotId,
    FACILITY: request.facility,
    EQPID: request.eqpId,
    OPERATION: request.operation,
    SUBOPERATION: request.subOperation,
    RECIPE: request.recipe,
    OPTYPE: request.opType,
    ISSKIP: request.isSkip,
    OPERATORID: request.operatorId,
    COMMENT: request.comment,
    ISCARRY: request.isCarry,
    BAY: request.bayName,
    STOCKER: request.stockerName,
    QUANTITY: request.quantity,
    INPUTMASKLOGO: request.inputMaskLogo,
    WFINTERLOCK: request.wfInterlock,
  });

  if (parsed.STATUS !== 'PASS') {
    return failResult<BatchMoveOutResult>(parsed);
  }

  return { ok: true };
}

export async function fetchBatchMoveOutFqcSampling(
  request: BatchMoveOutFqcRequest,
): Promise<BatchMoveOutFqcResult> {
  const parsed = await postJsonMessage('FQCSAMPLING', {
    LOTID: request.lotId,
    OPTYPE: request.opType,
    EQPID: request.eqpId,
    OPER: request.operation,
    SUBOPER: request.subOperation,
  });

  if (parsed.STATUS !== 'PASS') {
    return failResult<BatchMoveOutFqcResult>(parsed);
  }

  const responseBody = body(parsed);
  return {
    ok: true,
    cycleComment: text(responseBody, 'CYCLECOMMENT'),
    recipeComment: text(responseBody, 'RECIPECOMMENT'),
    updateCode: text(responseBody, 'UPDATECODE'),
    deleteCode: text(responseBody, 'DELETECODE'),
  };
}

export async function checkBatchMoveOutBatchCount(
  request: BatchMoveOutBatchCountRequest,
): Promise<BatchMoveOutBatchCountResult> {
  const parsed = await postJsonMessage('CHECKBATCHCOUNT', {
    FACTORYNAME: request.facility,
    MACHINENAME: request.eqpId,
    USERID: request.operatorId,
  });

  if (parsed.STATUS !== 'PASS') {
    return failResult<BatchMoveOutBatchCountResult>(parsed);
  }

  const responseBody = body(parsed);
  return {
    ok: true,
    batchDown: text(responseBody, 'BATCHDOWN') === 'Y',
    downMessage: text(responseBody, 'DOWNMESSAGE'),
  };
}
