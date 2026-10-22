import apiClient from 'src/services/api-client';

import type {
  GetScopeLotInfoResult,
  GetSlotInfoResult,
  InputScopeDataPayload,
  InputScopeDataResult,
} from '~/features/input-scope-data/types/input-scope-data.types';

import { setupInputScopeDataMock } from '../mocks/input-scope-data.mock';

setupInputScopeDataMock(apiClient);

function extractTagValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAllTagValues(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
  const matches = [...xml.matchAll(regex)];
  return matches.map((m) => m[1].trim());
}

export async function postXmlMessage(messageName: string, xmlBody: string): Promise<string> {
  const response = await apiClient.post<string>(`/hifos/${messageName}`, xmlBody, {
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml, text/xml, */*',
    },
    responseType: 'text',
  });

  return response.data;
}

/**
 * Calls GETSCOPELOTINFO to retrieve lot info, existing status, and fault category items
 */
export async function getScopeLotInfoApi(lotId: string): Promise<GetScopeLotInfoResult> {
  const xmlBody = `<BODY>
  <LOTID>${lotId}</LOTID>
</BODY>`;

  const xmlResponse = await postXmlMessage('message', xmlBody);
  const resultTag = extractTagValue(xmlResponse, 'RESULT');
  const errorDescTag = extractTagValue(xmlResponse, 'ERRORDESC');

  if (resultTag.toUpperCase() !== 'SUCCESS') {
    const errorMsg =
      errorDescTag ||
      extractTagValue(xmlResponse, 'ERRMSG') ||
      extractTagValue(xmlResponse, 'MESSAGE') ||
      '존재하지 않는 LOT ID 입니다.';
    return {
      success: false,
      errorMessage: errorMsg,
    };
  }

  const faultValues = extractAllTagValues(xmlResponse, 'TYPEVALUE');

  return {
    success: true,
    data: {
      lotName: extractTagValue(xmlResponse, 'LOTNAME') || lotId,
      factoryName: extractTagValue(xmlResponse, 'FACTORYNAME'),
      processOperationName: extractTagValue(xmlResponse, 'PROCESSOPERATIONNAME'),
      machineName: extractTagValue(xmlResponse, 'MACHINENAME'),
      layerId: extractTagValue(xmlResponse, 'LAYERID'),
      isExist: extractTagValue(xmlResponse, 'ISEXIST').toUpperCase() === 'Y',
      faultCategories: faultValues,
    },
  };
}

/**
 * Calls SLOTINFO to retrieve wafer list for the given lot
 */
export async function getSlotInfoApi(lotId: string, facility = 'FAB1'): Promise<GetSlotInfoResult> {
  const xmlBody = `<BODY>
  <LOTID>${lotId}</LOTID>
  <FACILITY>${facility}</FACILITY>
</BODY>`;

  const xmlResponse = await postXmlMessage('slotinfo', xmlBody);
  const resultTag = extractTagValue(xmlResponse, 'RESULT');
  const errorDescTag = extractTagValue(xmlResponse, 'ERRORDESC');

  if (resultTag.toUpperCase() !== 'SUCCESS') {
    const errorMsg =
      errorDescTag ||
      extractTagValue(xmlResponse, 'ERRMSG') ||
      extractTagValue(xmlResponse, 'MESSAGE') ||
      '조회된 정보가 없습니다.';
    return {
      success: false,
      errorMessage: errorMsg,
    };
  }

  const waferList = extractTagValue(xmlResponse, 'WAFERLIST');
  return {
    success: true,
    waferList,
  };
}

/**
 * Calls INPUTSCOPEDATA to commit scope measurement data
 */
export async function inputScopeDataApi(
  payload: InputScopeDataPayload,
): Promise<InputScopeDataResult> {
  const xmlBody = `<BODY>
  <FACTORYNAME>${payload.factoryName}</FACTORYNAME>
  <LOTID>${payload.lotId}</LOTID>
  <PROCESSOPERATIONNAME>${payload.processOperationName}</PROCESSOPERATIONNAME>
  <MACHINENAME>${payload.machineName}</MACHINENAME>
  <LAYERID>${payload.layerId}</LAYERID>
  <SIDERINSE>${payload.sideRinse}</SIDERINSE>
  <WEE>${payload.weeWidth}</WEE>
  <LOGO>${payload.logo}</LOGO>
  <SLOTLIST>${payload.slotList}</SLOTLIST>
  <FAULTCATEGORY>${payload.faultCategory}</FAULTCATEGORY>
  <INPUTUSER>${payload.inputUser}</INPUTUSER>
</BODY>`;

  const xmlResponse = await postXmlMessage('message', xmlBody);
  const resultTag = extractTagValue(xmlResponse, 'RESULT');
  const messageTag = extractTagValue(xmlResponse, 'MESSAGE');
  const errorDescTag = extractTagValue(xmlResponse, 'ERRORDESC');

  if (resultTag.toUpperCase() !== 'SUCCESS') {
    const errorMsg =
      errorDescTag ||
      extractTagValue(xmlResponse, 'ERRMSG') ||
      extractTagValue(xmlResponse, 'MESSAGE') ||
      '저장 중 오류가 발생하였습니다.';
    return {
      success: false,
      errorMessage: errorMsg,
    };
  }

  return {
    success: true,
    message: messageTag || '데이터가 저장 되었습니다.',
  };
}
