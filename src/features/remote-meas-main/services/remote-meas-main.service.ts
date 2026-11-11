import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type { XrfEqpTypeItem } from '../types/remote-meas-main.types';

export class RemoteMeasMainMessageError extends Error {}

/** MessageName.XRFEQPTYPECHECK: the MessageSender route for MessageFactoryUtil.XrfEqpTypeCheck. */
const XRFEQPTYPECHECK = 'XrfEqpTypeCheck';
/** MessageSender.ERRORMSG_MSGBODY */
const ERRORMSG_MSGBODY = 'BODY가 존재하지 않습니다';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * MessageSender.checkValidate: a failed reply shows ERRMSG, and a PASS whose MSGBODY is
 * missing or "" is turned into ERRORMSG_MSGBODY.
 */
function checkValidate(response: MessageResponseData): void {
  if (!isResponseSuccessful(response)) {
    throw new RemoteMeasMainMessageError(getResponseErrorMessage(response));
  }
  const result = JSON.parse(response.result) as Record<string, unknown>;
  const body = result.MSGBODY;
  if (body === undefined || body === null || body === '') {
    throw new RemoteMeasMainMessageError(ERRORMSG_MSGBODY);
  }
}

/**
 * ResponseDataToJsonUtil.getMessageBodyList(result, "ITEMS"): MSGBODY.ITEMS.ITEM[]. Android reads
 * it with getJSONObject / getJSONArray, so a missing list is an error (org.json message); a single
 * ITEM object is accepted because the server's XML-to-JSON step drops the array for one row.
 */
function getMessageBodyList(response: MessageResponseData, listName: string): XrfEqpTypeItem[] {
  const list: unknown = parseMessageBody(response)[listName];
  if (!list || typeof list !== 'object') {
    throw new RemoteMeasMainMessageError(`JSONObject["${listName}"] not found.`);
  }
  if (!('ITEM' in list)) {
    throw new RemoteMeasMainMessageError('JSONObject["ITEM"] not found.');
  }
  const items: unknown[] = Array.isArray(list.ITEM) ? list.ITEM : [list.ITEM];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ MODEL: text(item.MODEL), MAINEQPID: text(item.MAINEQPID) }));
}

/** MessageFactoryUtil.XrfEqpTypeCheck(eqpId), sent to MessageName.XRFEQPTYPECHECK. */
export async function xrfEqpTypeCheck(eqpId: string): Promise<XrfEqpTypeItem[]> {
  const response = await postAifMessage(XRFEQPTYPECHECK, 'XRFEQPTYPECHECK', [['EQPID', eqpId]]);
  checkValidate(response);
  return getMessageBodyList(response, 'ITEMS');
}
