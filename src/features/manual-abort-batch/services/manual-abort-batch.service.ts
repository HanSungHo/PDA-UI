import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  ManualAbortBatchRow,
  ManualAbortBatchSaveRequest,
} from '../types/manual-abort-batch.types';

export class ManualAbortBatchMessageError extends Error {}

/** MessageSender.ERRORMSG_MSGBODY */
const MISSING_BODY_MESSAGE = 'BODY가 존재하지 않습니다';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * MessageSender.checkValidate: a failed reply shows ERRMSG, and a PASS whose MSGBODY is
 * missing or "" is turned into ERRORMSG_MSGBODY.
 */
function validate(response: MessageResponseData): void {
  if (!isResponseSuccessful(response)) {
    throw new ManualAbortBatchMessageError(getResponseErrorMessage(response));
  }
  const result = JSON.parse(response.result) as Record<string, unknown>;
  const body = result.MSGBODY;
  if (body === undefined || body === null || body === '') {
    throw new ManualAbortBatchMessageError(MISSING_BODY_MESSAGE);
  }
}

/** ResponseDataToJsonUtil.getMessageBodyNullCheckList(result, "ITEMS"): MSGBODY.ITEMS.ITEM[]. */
function readRows(list: unknown): ManualAbortBatchRow[] {
  const items: unknown = list && typeof list === 'object' && 'ITEM' in list ? list.ITEM : [];
  const rows: unknown[] = Array.isArray(items) ? items : [items];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({ BATCHINFO: text(row.BATCHINFO), ZONE: text(row.ZONE), LOT: text(row.LOT) }));
}

/** MessageFactoryUtil.remoteRemanualLOT, posted to MessageName.FURNACEREMANUALLOT. */
export async function fetchRemanualLot(lotId: string): Promise<ManualAbortBatchRow[]> {
  const response = await postAifMessage('furnaceremanuallot', 'FURNACEREMANUALLOT', [
    ['LOTID', lotId],
  ]);
  validate(response);
  return readRows(parseMessageBody(response).ITEMS);
}

/** MessageFactoryUtil.remoteRemanualSave, posted to MessageName.FURNACEREMANUALSAVE. */
export async function saveRemanual(request: ManualAbortBatchSaveRequest): Promise<void> {
  const response = await postAifMessage('furnaceremanualsave', 'FURNACEREMANUALSAVE', [
    ['LOTID', request.lotId],
    ['EQPID', request.eqpId],
    ['RCPID', request.rcpId],
    ['USERID', request.userId],
  ]);
  validate(response);
}
