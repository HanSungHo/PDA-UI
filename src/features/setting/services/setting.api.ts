import { DeviceInfo } from 'src/constants/device-info';
import apiClient from 'src/services/api-client';
import type { MessageResponseData } from 'src/types/api';

import type { SettingApi } from '../types/setting.types';

type MessageBody = Record<string, unknown>;

function errorMessage(response: MessageResponseData): string {
  try {
    const result = JSON.parse(response.result) as {
      ERRMSG?: string;
      MSGBODY?: { ERRMSG?: string };
    };
    return result.ERRMSG ?? result.MSGBODY?.ERRMSG ?? 'Request failed.';
  } catch {
    return response.result || 'Request failed.';
  }
}

async function postMessage(name: string, payload: Record<string, string>): Promise<MessageBody> {
  const { data } = await apiClient.post<MessageResponseData>(`/hifos/${name}`, payload);
  if (data.statusCode !== 200) throw new Error(errorMessage(data));

  let result: { STATUS?: string; ERRMSG?: string; MSGBODY?: MessageBody };
  try {
    result = JSON.parse(data.result) as {
      STATUS?: string;
      ERRMSG?: string;
      MSGBODY?: MessageBody;
    };
  } catch {
    return {};
  }

  if (result.STATUS !== 'PASS') throw new Error(result.ERRMSG ?? 'Request failed.');
  return result.MSGBODY ?? result;
}

function values(body: MessageBody): string[] {
  const items = body.ITEMS;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) =>
    item && typeof item === 'object' && typeof (item as { VALUE?: unknown }).VALUE === 'string'
      ? [(item as { VALUE: string }).VALUE]
      : [],
  );
}

function bays(body: MessageBody): string[] {
  const source = body.BAYS;
  const list = Array.isArray(source) ? source : source ? [source] : [];
  return list.flatMap((item) =>
    item && typeof item === 'object' && typeof (item as { BAY?: unknown }).BAY === 'string'
      ? [(item as { BAY: string }).BAY]
      : [],
  );
}

export const settingApi: SettingApi = {
  async getFacility() {
    return values(await postMessage('confinfo', { IDENTCODE: 'F' }));
  },
  async getArea(facility) {
    return values(await postMessage('confinfo', { IDENTCODE: 'A', VALUE: facility }));
  },
  async getBay(area, facility) {
    return bays(await postMessage('areabayinfo', { AREA: area, FACILITY: facility }));
  },
  async sendConfig(wifiIpAddress) {
    await postMessage('config', {
      FACILITY: DeviceInfo.FACILITY,
      AREA: DeviceInfo.AREA,
      BAY: DeviceInfo.BAY,
      DEVICENAME: DeviceInfo.DEVICE_NAME,
      IPADDR: wifiIpAddress,
      USERID: DeviceInfo.OPERATOR_ID,
    });
  },
};
