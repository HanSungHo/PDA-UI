import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { postAifMessage } from 'src/services/aif-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type {
  BayStockerInfoData,
  CarryInfoData,
  CarryRequestPayload,
  FabBayInfoData,
  PdaListData,
  ReTransferApiResult,
} from '../types/re-transfer.types';

async function sendReTransferMessage<T>(
  messageName: string,
  fields: readonly [string, string][],
): Promise<ReTransferApiResult<T>> {
  try {
    const rawData = await postAifMessage(messageName, messageName, fields);
    if (!isResponseSuccessful(rawData)) {
      return { ok: false, message: getResponseErrorMessage(rawData) };
    }
    const resultObj = (() => {
      try {
        return JSON.parse(rawData.result) as Record<string, unknown>;
      } catch {
        return null;
      }
    })();
    const body = resultObj ? resultObj['MSGBODY'] : null;
    if (body === undefined || body === null || body === '') {
      return { ok: false, message: 'BODY가 존재하지 않습니다' };
    }
    return { ok: true, data: parseMessageBody(rawData) as unknown as T };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '',
    };
  }
}

/**
 * Extracts list of items from response object or array, mirroring legacy
 * `ResponseDataToJsonUtil.getMessageBodyList` / `getJSONArray("ITEM")`.
 */
export function extractItemList<T>(container: unknown): T[] {
  if (!container) return [];
  if (Array.isArray(container)) return container as T[];
  if (typeof container === 'object') {
    const record = container as Record<string, unknown>;
    const item = record[COMMON_FIELD.ITEM] ?? record.item;
    if (!item) return [];
    if (Array.isArray(item)) return item as T[];
    if (typeof item === 'object') return [item as T];
  }
  return [];
}

export const reTransferService = {
  /**
   * Queries carry info for a given lotId.
   * Mirrors `MessageFactoryUtil.carryInfo(lotId, facility)` (`MessageName.CARRYINFO`).
   */
  async getCarryInfo(
    lotId: string,
    facility: string = DeviceInfo.FACILITY,
  ): Promise<ReTransferApiResult<CarryInfoData>> {
    interface RawCarryInfoBody {
      CURRENTSTK?: string;
      FABS?: { ITEM?: Array<{ FAB?: string }> | { FAB?: string } };
      PORTS?: {
        ITEM?: Array<{ PORT?: string; PORTDESC?: string }> | { PORT?: string; PORTDESC?: string };
      };
    }

    const result = await sendReTransferMessage<RawCarryInfoBody>('CARRYINFO', [
      ['LOTID', lotId],
      ['FACILITY', facility],
    ]);

    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const currentStk = String(result.data.CURRENTSTK || '');

    const fabItems = extractItemList<{ FAB?: string }>(result.data.FABS);
    const fabs = fabItems.map((f) => String(f.FAB || '')).filter(Boolean);

    const portItems = extractItemList<{ PORT?: string; PORTDESC?: string }>(result.data.PORTS);
    let outPortIndex = -1;
    const ports = portItems.map((p, idx) => {
      const portId = String(p.PORT || '');
      const portDesc = String(p.PORTDESC || '');
      if (outPortIndex === -1 && portId === 'OUT') {
        outPortIndex = idx;
      }
      // Exact 1:1 format parity with ReTransferActivity.kt line 162: "$portId  $portDesc"
      return `${portId}  ${portDesc}`;
    });

    return {
      ok: true,
      data: {
        currentStk,
        fabs,
        ports,
        outPortIndex: outPortIndex >= 0 ? outPortIndex : undefined,
      },
    };
  },

  /**
   * Queries bays for a given fab.
   * Mirrors `MessageFactoryUtil.fabBayInfo(fab)` (`MessageName.FABBAYINFO`).
   */
  async getFabBayInfo(fab: string): Promise<ReTransferApiResult<FabBayInfoData>> {
    interface RawBayBody {
      BAYS?: { ITEM?: Array<{ BAY?: string }> | { BAY?: string } };
    }

    const result = await sendReTransferMessage<RawBayBody>('FABBAYINFO', [['FAB', fab]]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const bayItems = extractItemList<{ BAY?: string }>(result.data.BAYS);
    const bays = bayItems.map((b) => String(b.BAY || '')).filter(Boolean);

    return { ok: true, data: { bays } };
  },

  /**
   * Queries stockers for a given bay and facility.
   * Mirrors `MessageFactoryUtil.bayStockerInfo(bay, fab)` (`MessageName.BAYSTOCKERINFO`).
   */
  async getBayStockerInfo(
    bay: string,
    facility: string = DeviceInfo.FACILITY,
  ): Promise<ReTransferApiResult<BayStockerInfoData>> {
    interface RawStockerBody {
      STOCKERS?: { ITEM?: Array<{ STOCKER?: string }> | { STOCKER?: string } };
    }

    const result = await sendReTransferMessage<RawStockerBody>('BAYSTOCKERINFO', [
      ['BAY', bay],
      ['FACILITY', facility],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const stkItems = extractItemList<{ STOCKER?: string }>(result.data.STOCKERS);
    const stockers = stkItems.map((s) => String(s.STOCKER || '')).filter(Boolean);

    return { ok: true, data: { stockers } };
  },

  /**
   * Queries PDAs for a given bay and facility.
   * Mirrors `MessageFactoryUtil.pdaList(bay, facility)` (`MessageName.PDALIST`).
   */
  async getPdaList(
    bay: string,
    facility: string = DeviceInfo.FACILITY,
  ): Promise<ReTransferApiResult<PdaListData>> {
    interface RawPdaBody {
      PDAS?: {
        ITEM?:
          | Array<{ PDACODE?: string; USERNAME?: string; USERID?: string }>
          | { PDACODE?: string; USERNAME?: string; USERID?: string };
      };
    }

    const result = await sendReTransferMessage<RawPdaBody>('PDALIST', [
      ['BAY', bay],
      ['FACILITY', facility],
    ]);
    if (!result.ok || !result.data) {
      return { ok: false, message: result.message };
    }

    const pdaItems = extractItemList<{ PDACODE?: string; USERNAME?: string; USERID?: string }>(
      result.data.PDAS,
    );

    const pdas: string[] = ['지정안함'];
    for (const p of pdaItems) {
      const code = String(p.PDACODE || '');
      const name = String(p.USERNAME || '');
      const id = String(p.USERID || '');
      // Exact 1:1 format parity with ReTransferActivity.kt line 380: "$pdaCode  $userName($userId)"
      pdas.push(`${code}  ${name}(${id})`);
    }

    return { ok: true, data: { pdas } };
  },

  /**
   * Executes carry/retransfer.
   * Mirrors `MessageFactoryUtil.carry(...)` (`MessageName.CARRY`).
   */
  async executeCarry(payload: CarryRequestPayload): Promise<ReTransferApiResult<void>> {
    const result = await sendReTransferMessage('CARRY', [
      ['LOTID', payload.lotId],
      ['FACILITY', payload.facility],
      ['NEXTFAB', payload.nextFab],
      ['NEXTBAY', payload.nextBay],
      ['NEXTSTOCKER', payload.nextStocker],
      ['PORT', payload.port],
      ['PDA', payload.pda],
      ['CURRENTSTK', payload.currentStk],
    ]);

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    return { ok: true };
  },
};
