import apiClient from 'src/services/api-client';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
} from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  MaskChange,
  MaskChangeResult,
  MaskDevice,
  MaskFields,
  MaskInfo,
  MaskMessage,
  MaskResult,
} from '../types/mask-location.types';

// These routes follow MessageSender call sites, including the two Activity aliases.
const endpoints: Record<MaskMessage, string> = {
  MASKINFO: '/hifos/maskinfo',
  MASKSTATUSINFO: '/hifos/maskstatusinfo',
  MASKLOCGROUPINFO: '/hifos/masklocgroupinfo',
  MASKLOCATIONINFO: '/hifos/masklocgroupinfo',
  CHECKMASKPMS: '/hifos/checkmaskpms',
  CHECKPELLICLE: '/hifos/checkpellicle',
  CHANGEMASKLOCATION: '/hifos/checkpellicle',
};
function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char] ?? char,
  );
}
function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}
function list(body: Record<string, unknown>, key: string, field: string): string[] {
  const values = (body[key] as Record<string, unknown> | undefined)?.ITEM;
  return Array.isArray(values)
    ? values.map((value) => text(value as Record<string, unknown>, field))
    : [];
}
async function send<T>(
  name: MaskMessage,
  fields: MaskFields,
  device: MaskDevice,
  map: (body: Record<string, unknown>) => T,
): Promise<MaskResult<T>> {
  const xml = [
    '<AIFMSG>',
    `<MSGNAME>${name}</MSGNAME>`,
    `<RECEIVER>${escapeXml(device.mobileServerName)}</RECEIVER>`,
    `<SENDER>${escapeXml(device.deviceName)}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    ...fields.map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`),
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');
  try {
    const response = await apiClient.post<MessageResponseData>(endpoints[name], { sMsg: xml });
    if (!isResponseSuccessful(response.data))
      return { ok: false, message: getResponseErrorMessage(response.data) };
    const body: unknown = (JSON.parse(response.data.result) as Record<string, unknown>).MSGBODY;
    if (!body || typeof body !== 'object' || Array.isArray(body))
      return { ok: false, message: 'BODY가 존재하지 않습니다' };
    return { ok: true, data: map(body as Record<string, unknown>) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
export const maskLocationService = {
  maskInfo(reticleId: string, device: MaskDevice) {
    return send(
      'MASKINFO',
      [
        ['RETICLEID', reticleId],
        ['FACILITY', device.facility],
      ],
      device,
      (body) =>
        Object.fromEntries(
          [
            'RETICLETAG',
            'PRODUCT',
            'STATUS',
            'ISUSE',
            'CURRLOC',
            'SUBLOCATION3',
            'CUSTOMER',
            'RMSINSP',
            'RMSID',
            'SHELF',
            'PELLICLE',
          ].map((key) => [key, text(body, key)]),
        ) as unknown as MaskInfo,
    );
  },
  maskStatusInfo(device: MaskDevice) {
    return send('MASKSTATUSINFO', [['FACILITY', device.facility]], device, (body) =>
      list(body, 'STATUSES', 'STATUS'),
    );
  },
  maskLocGroupInfo(status: string, floor: string, device: MaskDevice) {
    return send(
      'MASKLOCGROUPINFO',
      [
        ['STATUS', status],
        ['FLOOR', floor],
        ['FACILITY', device.facility],
      ],
      device,
      (body) => list(body, 'LOCGROUPS', 'LOCGROUP'),
    );
  },
  maskLocationInfo(status: string, locGroup: string, floor: string, device: MaskDevice) {
    return send(
      'MASKLOCATIONINFO',
      [
        ['STATUS', status],
        ['LOCGROUP', locGroup],
        ['FLOOR', floor],
        ['FACILITY', device.facility],
      ],
      device,
      (body) => list(body, 'LOCATIONS', 'LOCATION'),
    );
  },
  checkMaskPMS(reticleId: string, pmsShelf: string, device: MaskDevice) {
    return send(
      'CHECKMASKPMS',
      [
        ['RETICLEID', reticleId],
        ['PMSSHELF', pmsShelf],
      ],
      device,
      (body) => text(body, 'CHECKPSMSHELF'),
    );
  },
  checkPellicle(reticleId: string, machineName: string, device: MaskDevice) {
    return send(
      'CHECKPELLICLE',
      [
        ['RETICLEID', reticleId],
        ['MACHINENAME', machineName],
      ],
      device,
      (body) => text(body, 'CHECKPELLICLE'),
    );
  },
  changeMaskLocation(fields: MaskChange, device: MaskDevice) {
    const keys: Array<keyof MaskChange> = [
      'RETICLEID',
      'FACILITY',
      'LOCTYPE',
      'LOCATION',
      'ETCSTATUS',
      'ETCLOCATION',
      'ETCDETAILLOC',
      'SUBLOCATION3',
      'OPERATORID',
      'FLOOR',
    ];
    return send(
      'CHANGEMASKLOCATION',
      keys.map((key) => [key, fields[key]]),
      device,
      (body) =>
        ({
          RETCILES: text(body, 'RETCILES'),
          SCOUNT: text(body, 'SCOUNT'),
        }) satisfies MaskChangeResult,
    );
  },
};
