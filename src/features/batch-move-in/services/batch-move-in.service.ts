import { DeviceInfo } from 'src/constants/device-info';
import {
  body,
  errorMessage,
  firstList,
  type MessageBody,
  number,
  postAifJsonMessage,
  text,
} from 'src/services/json-message.service';

import type {
  BatchMoveInContext,
  BatchMoveInItem,
  BatchMoveInListResponse,
  BatchMoveInRequest,
  BatchMoveInResult,
} from '../types/batch-move-in.types';

export type BatchMoveInListResult =
  | { ok: true; data: BatchMoveInListResponse }
  | { ok: false; message: string };

function mapItem(item: MessageBody): BatchMoveInItem {
  return {
    lotId: text(item, 'LOTID'),
    commentQty: number(item, 'COMMENTQTY'),
    status: text(item, 'STATUS'),
    processStep: text(item, 'PROCESSSTEP'),
    product: text(item, 'PRODUCT'),
    quantity: text(item, 'QUANTITY'),
    errorMessage: text(item, 'ERRORMESSAGE'),
    operation: text(item, 'OPERATION'),
    subOperation: text(item, 'SUBOPERATION'),
    lotState: text(item, 'LOTSTATE'),
    nwCommentQty: number(item, 'NWCOMMENTQTY'),
    operSequence: text(item, 'OPERSEQUENCE'),
    processName: text(item, 'PROCESSNAME'),
  };
}

/** Android lists come either as an array or wrapped in <ITEM> (ResponseDataToJsonUtil). */
function batchItems(messageBody: MessageBody): MessageBody[] {
  const value = messageBody.BATCHITEMS;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return firstList(value as MessageBody, ['ITEM']);
  }
  return firstList(messageBody, ['BATCHITEMS']);
}

/**
 * hifos2 BatchMoveInActivity.getBatchListByLot(): MessageFactoryUtil.batchListByLotMoveIn(lotId,
 * DeviceInfo.FACILITY, txtRecipe) — the recipe is sent in <STATUS>, exactly as the legacy app does.
 */
export async function fetchBatchMoveInList(
  context: BatchMoveInContext,
): Promise<BatchMoveInListResult> {
  const parsed = await postAifJsonMessage('BATCHLISTBYLOT', [
    ['LOTID', context.lotId],
    ['FACILITY', context.facility],
    ['STATUS', context.recipe],
  ]);
  if (parsed.STATUS !== 'PASS') return { ok: false, message: errorMessage(parsed) };

  const messageBody = body(parsed);
  return {
    ok: true,
    data: {
      context,
      unreadWorkCommentQty: number(messageBody, 'NWCOMMENTQTY'),
      items: batchItems(messageBody).map(mapItem),
    },
  };
}

/** hifos2 BatchMoveInActivity: MessageFactoryUtil.moveIn(..., isExposure "", identCode "N", ...). */
export async function executeBatchMoveIn(request: BatchMoveInRequest): Promise<BatchMoveInResult> {
  const parsed = await postAifJsonMessage('MOVEIN', [
    ['LOTID', request.lotId],
    ['FACILITY', request.facility],
    ['RECIPE', request.recipe],
    ['EQPID', request.eqpId],
    ['OPERATION', request.operation],
    ['SUBOPERATION', request.subOperation],
    ['ISSKIP', request.isSkip],
    ['OPERATORID', DeviceInfo.OPERATOR_ID],
    ['ISEXPOSURE', ''],
    ['IDENTCODE', 'N'],
    ['RETICLEID', ''],
    ['QUANTITY', request.quantity],
    ['COMMENT', ''],
    ['REWORKSKIP', ''],
  ]);
  return parsed.STATUS === 'PASS' ? { ok: true } : { ok: false, message: errorMessage(parsed) };
}
