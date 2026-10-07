import apiClient from 'src/services/api-client';
import type { InFactoryRecord, InFactoryResult, LotInfoResult } from 'src/types/backup-bay.types';

import { setupBackupBayMock } from './mocks/backup-bay.mock';

setupBackupBayMock(apiClient);

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function extractTagValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Sends a raw HiFOS XML message via POST /hifos/message according to technical_requirement.md section 4
 */
export async function postHifosMessage(messageName: string, xmlBody: string): Promise<string> {
  const response = await apiClient.post<string>('/hifos/message', xmlBody, {
    headers: {
      'Content-Type': 'application/xml',
      Accept: 'application/xml, text/xml, */*',
      MESSAGENAME: messageName,
      ORIGIN: 'P',
      ACK: 'YES',
    },
    responseType: 'text',
  });

  return response.data;
}

/**
 * 4.1 API: Get floor list (GETFLOORDATA)
 */
export async function getFloorDataApi(): Promise<string[]> {
  const xml = await postHifosMessage('GETFLOORDATA', '');
  return extractAllTags(xml, 'FLOOR');
}

/**
 * 4.2 API: Get bay list by floor (GETBAYDATA)
 */
export async function getBayDataApi(floor: string): Promise<string[]> {
  const xmlBody = `<FLOOR>${floor}</FLOOR>`;
  const xml = await postHifosMessage('GETBAYDATA', xmlBody);
  return extractAllTags(xml, 'AREANAME');
}

/**
 * 4.3 API: Look up LOT and check interlock (GETPROCESSFACTORYLOT)
 */
export async function getProcessFactoryLotApi(lotId: string): Promise<LotInfoResult> {
  const normalizedLot = lotId.trim().toUpperCase();
  const xmlBody = `<LOTID>${normalizedLot}</LOTID>`;
  const xml = await postHifosMessage('GETPROCESSFACTORYLOT', xmlBody);

  return {
    lotId: normalizedLot,
    lotProcessState: extractTagValue(xml, 'LOTPROCESSSTATE'),
    lotHoldState: extractTagValue(xml, 'LOTHOLDSTATE'),
    lotState: extractTagValue(xml, 'LOTSTATE'),
    jobCode: extractTagValue(xml, 'JOBCODE'),
    productQuantity: extractTagValue(xml, 'PRODUCTQUANTITY'),
    operationDescription: extractTagValue(xml, 'OPERATIONDESCRIPTION'),
  };
}

/**
 * 4.4 API: Change bay (INFACTORY)
 */
export async function sendInFactoryApi(
  records: InFactoryRecord[],
  operatorId = 'OP10023',
): Promise<InFactoryResult> {
  // Build CHANGEFACTORY0 .. CHANGEFACTORY6 according to legacy requirement
  const elements: string[] = [];
  for (let i = 0; i < 7; i++) {
    const rec = records[i];
    if (rec && rec.lotId && rec.bay) {
      elements.push(`<CHANGEFACTORY${i}>${rec.lotId}|${rec.bay}|${operatorId}</CHANGEFACTORY${i}>`);
    } else {
      elements.push(`<CHANGEFACTORY${i}></CHANGEFACTORY${i}>`);
    }
  }

  const xmlBody = elements.join('\n');
  const xml = await postHifosMessage('INFACTORY', xmlBody);
  const successCountStr = extractTagValue(xml, 'SUCCESSLOT');
  const count = parseInt(successCountStr, 10) || 0;

  return {
    success: count > 0,
    successCount: count,
    message: `${count} LOTs were completed.`,
  };
}
