import apiClient from 'src/services/api-client';
import type {
  ChangeEqpStatusParams,
  ChangeEqpStatusResult,
} from 'src/types/moveout-eqp-down.types';

import { setupMoveOutEqpDownMock } from './mocks/moveout-eqp-down.mock';

setupMoveOutEqpDownMock(apiClient);

function extractTagValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

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

export async function sendChangeEqpStatusApi(
  params: ChangeEqpStatusParams,
): Promise<ChangeEqpStatusResult> {
  const xmlBody = `<BODY>
<EQPID>${params.machine}</EQPID>
<FACILITY>${params.facility || 'FAB1'}</FACILITY>
<STATUS>${params.status || 'C Unloaded (LOAD DOWN)'}</STATUS>
<REASONCODE>${params.reasonCode || 'CA001'}</REASONCODE>
<COMMENT>${params.comment || 'PDA_MVOUT_DOWN'}</COMMENT>
<OPERATORID>${params.operatorId || 'OP10023'}</OPERATORID>
<OPERATORNAME>${params.operatorName || 'OPERATOR'}</OPERATORNAME>
<CHAMBERLIST>${params.chamberList.join(',')}</CHAMBERLIST>
<MAINFLAG>${params.mainFlag}</MAINFLAG>
</BODY>`;

  const xmlResponse = await postHifosMessage('CHANGEEQPSTATUS', xmlBody);
  const resultTag = extractTagValue(xmlResponse, 'RESULT');
  const messageTag = extractTagValue(xmlResponse, 'MESSAGE');
  const errorDescTag = extractTagValue(xmlResponse, 'ERRORDESC');

  const isSuccess = resultTag.toUpperCase() === 'SUCCESS';

  return {
    success: isSuccess,
    message: messageTag || (isSuccess ? 'Equipment status changed successfully.' : undefined),
    errorDesc: !isSuccess ? errorDescTag || messageTag || '' : undefined,
  };
}
