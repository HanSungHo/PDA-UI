import { DeviceInfo } from 'src/constants/device-info';
import { postAifMessage } from 'src/services/aif-message.service';
import type { MessageResponseData } from 'src/types/api';

import type { SettingApi } from '../types/setting.types';

type MessageBody = Record<string, unknown>;

/** MessageSender.ERRORMSG_MSGBODY */
const MISSING_BODY_MESSAGE = 'BODY가 존재하지 않습니다';

/** ResponseDataToJsonUtil.getErrorMessage: optString(ERRMSG), or the raw result when not JSON. */
function errorMessage(response: MessageResponseData): string {
  try {
    const result = JSON.parse(response.result) as { ERRMSG?: unknown } | null;
    const message = result?.ERRMSG;
    return typeof message === 'string' ? message : '';
  } catch {
    return response.result;
  }
}

/**
 * MessageSender.checkValidate: success needs statusCode 200 and STATUS PASS; a PASS whose
 * MSGBODY is "" becomes ERRORMSG_MSGBODY.
 */
function validate(response: MessageResponseData): MessageBody {
  let result: { STATUS?: unknown; MSGBODY?: unknown };
  try {
    result = JSON.parse(response.result) as typeof result;
  } catch {
    throw new Error(response.result);
  }
  if (response.statusCode !== 200 || result.STATUS !== 'PASS') {
    throw new Error(errorMessage(response));
  }
  const body = result.MSGBODY;
  if (body === undefined || body === null || body === '') throw new Error(MISSING_BODY_MESSAGE);
  return typeof body === 'object' ? (body as MessageBody) : {};
}

function itemsOf(container: unknown): unknown[] {
  const items =
    container && typeof container === 'object' ? (container as { ITEM?: unknown }).ITEM : undefined;
  if (Array.isArray(items)) return items;
  return items && typeof items === 'object' ? [items] : [];
}

function pick(items: unknown[], key: string): string[] {
  return items.flatMap((item) => {
    const value = item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : null;
    return typeof value === 'string' ? [value] : [];
  });
}

export const settingApi: SettingApi = {
  /** MessageFactoryUtil.facility -> MSGBODY.ITEMS.ITEM[].VALUE */
  async getFacility() {
    const body = validate(await postAifMessage('confinfo', 'CONFINFO', [['IDENTCODE', 'F']]));
    return pick(itemsOf(body.ITEMS), 'VALUE');
  },
  /** MessageFactoryUtil.area -> MSGBODY.ITEMS.ITEM[].VALUE */
  async getArea(facility) {
    const body = validate(
      await postAifMessage('confinfo', 'CONFINFO', [
        ['IDENTCODE', 'A'],
        ['VALUE', facility],
      ]),
    );
    return pick(itemsOf(body.ITEMS), 'VALUE');
  },
  /** MessageFactoryUtil.areaBayInfo -> MSGBODY.BAYS.ITEM (object or array) .BAY */
  async getBay(area, facility) {
    const body = validate(
      await postAifMessage('areabayinfo', 'AREABAYINFO', [
        ['AREA', area],
        ['FACILITY', facility],
      ]),
    );
    return pick(itemsOf(body.BAYS), 'BAY');
  },
  /** MessageFactoryUtil.config */
  async sendConfig(wifiIpAddress) {
    validate(
      await postAifMessage('config', 'CONFIG', [
        ['FACILITY', DeviceInfo.FACILITY],
        ['AREA', DeviceInfo.AREA],
        ['BAY', DeviceInfo.BAY],
        ['DEVICENAME', DeviceInfo.DEVICE_NAME],
        ['IPADDR', wifiIpAddress],
        ['USERID', DeviceInfo.OPERATOR_ID],
      ]),
    );
  },
};
