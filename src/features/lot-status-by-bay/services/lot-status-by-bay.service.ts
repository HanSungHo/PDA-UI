import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  AreaBayInfoRequest,
  BayStockerInfoRequest,
  BlstInfoRequest,
  LotStatusByBayRow,
  LotStatusByBayServiceResult,
  StockOutItem,
  StockOutRequest,
} from '../types/lot-status-by-bay.types';

type MessageBody = Record<string, unknown>;

/** Mirrors legacy MessageSender.send: transport errors are reported as an unsuccessful message. */
async function send(
  endpointName: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<LotStatusByBayServiceResult> {
  try {
    const response = await postAifMessage(endpointName, messageName, fields);
    if (!isResponseSuccessful(response)) {
      return {
        isSuccessFul: false,
        messageBody: {},
        errorMessage: getResponseErrorMessage(response),
      };
    }
    return { isSuccessFul: true, messageBody: parseMessageBody(response), errorMessage: '' };
  } catch (error) {
    return {
      isSuccessFul: false,
      messageBody: {},
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/**
 * ResponseDataToJsonUtil.getMessageBodyList / getMessageBodyInValueList: MSGBODY[listName].ITEM[].
 * A single ITEM object or a bare array (the Setting mock shape) is read as a one-row / flat list.
 */
function readList(body: MessageBody, listName: string): MessageBody[] {
  const list = body[listName];
  const items: unknown =
    list && typeof list === 'object' && !Array.isArray(list) && 'ITEM' in list ? list.ITEM : list;
  const rows: unknown[] = Array.isArray(items) ? items : items ? [items] : [];
  return rows.filter((row): row is MessageBody => Boolean(row) && typeof row === 'object');
}

function mapResult<T>(
  result: LotStatusByBayServiceResult,
  map: (body: MessageBody) => T,
): LotStatusByBayServiceResult<T> {
  return { ...result, messageBody: map(result.messageBody) };
}

/** stockerOut(): one <ITEM> per selected row, appended back to back as in the legacy template. */
export function buildStockOutItemList(items: readonly StockOutItem[]): string {
  return items
    .map(({ lotId, stockerId }) =>
      ['<ITEM>', `<LOTID>${lotId}</LOTID>`, `<STOCKER>${stockerId}</STOCKER>`, '</ITEM>'].join(
        '\n',
      ),
    )
    .join('');
}

export const lotStatusByBayService = {
  /** MessageFactoryUtil.areaBayInfo(area, facility) -> BAYS.ITEM[].BAY */
  async areaBayInfo({ area, facility }: AreaBayInfoRequest) {
    const result = await send('AREABAYINFO', 'AREABAYINFO', [
      ['AREA', area],
      ['FACILITY', facility],
    ]);
    return mapResult(result, (body) => readList(body, 'BAYS').map((bay) => text(bay.BAY)));
  },

  /** MessageFactoryUtil.bayStockerInfo(bay, facility) -> STOCKERS.ITEM[].STOCKER */
  async bayStockerInfo({ bay, facility }: BayStockerInfoRequest) {
    const result = await send('BAYSTOCKERINFO', 'BAYSTOCKERINFO', [
      ['BAY', bay],
      ['FACILITY', facility],
    ]);
    return mapResult(result, (body) =>
      readList(body, 'STOCKERS').map((stocker) => text(stocker.STOCKER)),
    );
  },

  /** MessageFactoryUtil.blstInfo(bay, stk, job, facility) -> BLSTITEMS.ITEM[] */
  async blstInfo({ bay, stk, job, facility }: BlstInfoRequest) {
    const result = await send('BLSTINFO', 'BLSTINFO', [
      ['BAY', bay],
      ['STOCKER', stk],
      ['JOBCODE', job],
      ['FACILITY', facility],
    ]);
    return mapResult(result, (body) =>
      readList(body, 'BLSTITEMS').map(
        (item): LotStatusByBayRow => ({
          JOBCODE: text(item.JOBCODE),
          PROCESSSTEP: text(item.PROCESSSTEP),
          LOTID: text(item.LOTID),
          LOCATION: text(item.LOCATION),
          QUANTITY: text(item.QUANTITY),
          LOC_TYPE: text(item.LOC_TYPE),
        }),
      ),
    );
  },

  /** MessageFactoryUtil.stockOut(facility, port, rowNo, stockers) */
  stockOut({ facility, port, items }: StockOutRequest) {
    return send('STOCKOUT', 'STOCKOUT', [
      ['FACILITY', facility],
      ['PORT', port],
      ['ROWNO', String(items.length)],
      ['STOCKERS', { xml: `\n${buildStockOutItemList(items)}\n` }],
    ]);
  },
};
