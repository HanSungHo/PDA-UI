import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type { EtchConditionResult, EtchConditionRow } from '../types/etch-condition.types';

export class EtchConditionMessageError extends Error {}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** Mirrors ResponseDataToJsonUtil.getMessageBodyNullCheckList: MSGBODY[listName].ITEM[]. */
function readRows(list: unknown): EtchConditionRow[] {
  const items: unknown = list && typeof list === 'object' && 'ITEM' in list ? list.ITEM : [];
  const rows: unknown[] = Array.isArray(items) ? items : [items];
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, text(value)])),
    );
}

/** MessageFactoryUtil.etchCommRcpFrombType2, posted to MessageName.ETCHCOMMRCPFROMB. */
const MISSING_BODY_MESSAGE = 'BODY가 존재하지 않습니다';

export async function fetchEtchCondition(
  lotId: string,
  machine: string,
): Promise<EtchConditionResult> {
  const response = await postAifMessage('etchcommrcpfromb', 'ETCH_COMMRCPFROMB', [
    ['LOTID', lotId],
    ['CHKEQPID', machine],
  ]);
  if (!isResponseSuccessful(response)) {
    throw new EtchConditionMessageError(getResponseErrorMessage(response));
  }
  const body: Record<string, unknown> = parseMessageBody(response);
  // MessageSender.checkValidate: a PASS without MSGBODY is an error.
  if (Object.keys(body).length === 0) throw new EtchConditionMessageError(MISSING_BODY_MESSAGE);
  return {
    processType: text(body.PROCESS_TYPE),
    operDesc: text(body.OPERDESC),
    para2nd: text(body.PARA2ND),
    value2nd: text(body.VALUE2ND),
    comm2nd: text(body.COMM2ND),
    hmEen: text(body.HMEEN),
    rows: readRows(body.COMMRCP),
  };
}
