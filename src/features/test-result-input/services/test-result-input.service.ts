import apiClient from 'src/services/api-client';
import { isResponseSuccessful } from 'src/services/message-response.helper';
import type { MessageResponseData } from 'src/types/api';

import type {
  InspectionFields,
  MaskInfo,
  MaskStatus,
  TestResult,
  TestResultDevice,
} from '../types/test-result-input.types';

function getErrorMessage(response: MessageResponseData): string {
  try {
    const result = JSON.parse(response.result) as Record<string, unknown>;
    return typeof result.ERRMSG === 'string' ? result.ERRMSG : '';
  } catch {
    return response.result;
  }
}

function value(body: Record<string, unknown>, key: string): string {
  const raw = body[key];
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
}

function items(body: Record<string, unknown>, container: string, name: string): string[] {
  const group = body[container];
  if (!group || typeof group !== 'object' || Array.isArray(group)) return [];
  const entries = (group as Record<string, unknown>)[name];
  if (!Array.isArray(entries)) throw new Error(`${container}.${name} is missing`);
  return entries.map((entry) => value(entry as Record<string, unknown>, 'ITEM1'));
}

async function send<T>(
  name: 'INSPMASKINFO' | 'INSPMASKSTATCHECK' | 'INSPMASKINSERT',
  fields: Array<[string, string]>,
  device: TestResultDevice,
  map: (body: Record<string, unknown>) => T,
): Promise<TestResult<T>> {
  const xml = [
    '<AIFMSG>',
    `<MSGNAME>${name}</MSGNAME>`,
    `<RECEIVER>${device.mobileServerName}</RECEIVER>`,
    `<SENDER>${device.deviceName}</SENDER>`,
    '<MSGTYPE>P</MSGTYPE>',
    '<WITHREPLY>YES</WITHREPLY>',
    '<STATUS></STATUS>',
    '<ERRMSG></ERRMSG>',
    '<TID></TID>',
    '<MSGBODY>',
    ...fields.map(([key, text]) => `<${key}>${text}</${key}>`),
    '</MSGBODY>',
    '</AIFMSG>',
  ].join('\n');

  let body: Record<string, unknown>;
  try {
    const response = await apiClient.post<MessageResponseData>(`/hifos/${name.toLowerCase()}`, {
      sMsg: xml,
    });
    if (!isResponseSuccessful(response.data)) {
      return { ok: false, message: getErrorMessage(response.data) };
    }
    const messageBody: unknown = (JSON.parse(response.data.result) as Record<string, unknown>)
      .MSGBODY;
    if (!messageBody || typeof messageBody !== 'object' || Array.isArray(messageBody)) {
      return { ok: false, message: 'BODY가 존재하지 않습니다' };
    }
    body = messageBody as Record<string, unknown>;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, data: map(body) };
}

export const testResultInputService = {
  inspMaskInfo(maskTag: string, device: TestResultDevice) {
    return send<MaskInfo>('INSPMASKINFO', [['MASKTAG', maskTag]], device, (body) => ({
      serialNo: value(body, 'SERIALNO'),
      pellicle: value(body, 'PELLICLE'),
      testDay: value(body, 'TODATE'),
      fabInDate: value(body, 'FABINDATE'),
      eqpIds: items(body, 'EQPIDS', 'EQPID'),
      inspTypes: items(body, 'INSPTYPES', 'INSPTYPE'),
      inspResults: items(body, 'INSPRESULTS', 'INSPRESULT'),
      inspType2s: items(body, 'INSPTYPE2S', 'INSPTYPE2'),
    }));
  },
  inspMaskStatCheck(reticleSeq: string, device: TestResultDevice) {
    return send<MaskStatus>('INSPMASKSTATCHECK', [['RETICLESEQ', reticleSeq]], device, (body) => ({
      status: value(body, 'STATUS'),
      maskTag: value(body, 'MASK_TAG'),
    }));
  },
  inspMaskInsert(fields: InspectionFields, device: TestResultDevice) {
    return send<void>(
      'INSPMASKINSERT',
      [
        ['RETICLESEQ', fields.reticleSeq],
        ['EQPID', fields.eqpId],
        ['INSPTYPE', fields.inspType],
        ['INSPTYPE2', fields.inspType2],
        ['INSPRESULT', fields.inspResult],
        ['INSPTEXT', fields.inspText],
        ['HOLDTEXT', fields.holdText],
        ['USERID', device.operatorId],
        ['USERNAME', device.operatorName],
        ['FABINDATE', fields.fabInDate],
      ],
      device,
      () => undefined,
    );
  },
};
