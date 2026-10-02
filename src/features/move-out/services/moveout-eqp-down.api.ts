import apiClient from 'src/services/api-client';

import type { ChangeEqpStatusParams, ChangeEqpStatusResult } from '../types/moveout-eqp-down.types';

function extractTagValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
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

export async function sendChangeEqpStatusApi(
  params: ChangeEqpStatusParams,
): Promise<ChangeEqpStatusResult> {
  const xmlBody = `<BODY>
<EQPID>${params.machine}</EQPID>
<FACILITY>${params.facility || 'FAB1'}</FACILITY>
<EQPSTATUSCODE>${params.status || 'C  비부하(LOAD DOWN)'}</EQPSTATUSCODE>
<EQPDOWNCODE>${params.reasonCode || 'CA001'}</EQPDOWNCODE>
<COMMENT>${params.comment || 'PDA_MVOUT_DOWN'}</COMMENT>
<LOGINUSERID>${params.operatorId || 'OP10023'}</LOGINUSERID>
<LOGINGUSERID1>${params.operatorName || 'OPERATOR'}</LOGINGUSERID1>
<CHANGECHAMBER>${params.chamberList.join(',')}</CHANGECHAMBER>
<MAINFLAG>${params.mainFlag}</MAINFLAG>
</BODY>`;

  const xmlResponse = await postXmlMessage('changeeqpstatus', xmlBody);
  const resultTag = extractTagValue(xmlResponse, 'RESULT');
  const messageTag = extractTagValue(xmlResponse, 'MESSAGE');
  const errorDescTag = extractTagValue(xmlResponse, 'ERRORDESC');

  const isSuccess = resultTag.toUpperCase() === 'SUCCESS';

  return {
    success: isSuccess,
    message: messageTag || (isSuccess ? 'Equipment status changed successfully.' : undefined),
    errorDesc: !isSuccess
      ? errorDescTag || messageTag || 'Failed to change equipment status.'
      : undefined,
  };
}
