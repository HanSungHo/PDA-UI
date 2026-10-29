import { sendMessage } from 'src/services/message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

import type { SampleResult } from '../types/mask-location-dialog.types';

export async function checkPhotoSample(lotId: string, location: string): Promise<SampleResult> {
  const response = await sendMessage('CHECKPHOTOSAMPLE', { LOTID: lotId, LOCATION: location });
  if (!isResponseSuccessful(response)) {
    throw new Error(getResponseErrorMessage(response));
  }

  const body = parseMessageBody(response);
  return {
    align: body.ALIGN ?? '',
    etchRw: body.ETCH_RW ?? '',
    grade: body.GRADE ?? '',
    ret: body.RET ?? '',
    stop: body.STOP ?? '',
  };
}
