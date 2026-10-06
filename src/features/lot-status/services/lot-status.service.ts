import apiClient from 'src/services/api-client';

export type LotStatusBody = Record<string, unknown>;

interface MessageEnvelope {
  STATUS?: string;
  MSGBODY?: LotStatusBody;
  ERRMSG?: string;
}

async function sendMessage(name: string, payload: Record<string, string>): Promise<LotStatusBody> {
  const response = await apiClient.post<{ result: string }>(`/hifos/${name}`, payload);
  const message = JSON.parse(response.data.result) as MessageEnvelope;
  if (message.STATUS !== 'PASS') throw new Error(message.ERRMSG || `${name} failed.`);
  return message.MSGBODY ?? {};
}

// MessageFactoryUtil.lotInfo("NORMAL", lotId, DeviceInfo.FACILITY)
export function fetchLotStatus(lotId: string, facility: string): Promise<LotStatusBody> {
  return sendMessage('LOTINFO', { TYPE: 'NORMAL', LOTID: lotId, FACILITY: facility });
}

// MessageFactoryUtil.getSlotParticle(DeviceInfo.FACILITY, g_Lot, g_operation)
export async function fetchSlotParticle(
  facility: string,
  lotId: string,
  operation: string,
): Promise<unknown[]> {
  const body = await sendMessage('SLOTPARTICLE', {
    FACILITY: facility,
    LOTID: lotId,
    OPERATION: operation,
  });
  // ResponseDataToJsonUtil.getMessageBodyNullCheckList(result, "ITEMS") reads ITEMS.ITEM.
  const items = body.ITEMS;
  if (Array.isArray(items)) return items;
  if (items && typeof items === 'object' && 'ITEM' in items) {
    const entries = items.ITEM;
    return Array.isArray(entries) ? entries : entries == null ? [] : [entries];
  }
  return [];
}
