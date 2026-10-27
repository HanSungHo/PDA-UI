import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';

import type {
  IntlkPopupCheckParams,
  IntlkPopupCheckResponse,
} from '../types/prempty-interlock.types';

export async function sendIntlkPopupCheck(
  params: IntlkPopupCheckParams,
): Promise<IntlkPopupCheckResponse> {
  const fields: AifMessageField[] = [
    ['MASTERTIMESTAMP', params.masterTime],
    ['EVENT_TYPE', 'PR_EMPTY'],
    ['NOTICE_TYPE', 'POP-UP'],
    ['IP', params.deviceName],
    ['CLIENT_TYPE', 'PDA'],
    ['HOSTNAME', params.deviceName],
    ['TARGET_URL', '"NULL"'],
    ['USER_CONFIRM', 'Y'],
    ['USER_CONFIRM_ID', params.users],
    ['USER_CONFIRM_TIME', params.currentTime],
    ['EQPID', params.eqpId],
    ['RECIPE', 'NULL'],
    ['LOTID', 'NULL'],
    ['SLOT', 'NULL'],
  ];

  try {
    const data = await postAifMessage('SetGasusage', 'INTLKPOPUPCHECK', fields);

    if (data.statusCode !== 200) {
      return {
        isSuccess: false,
        message: data.result || 'Server error',
      };
    }

    try {
      const parsed = JSON.parse(data.result);

      if (parsed.STATUS === 'FAIL') {
        return {
          isSuccess: false,
          message: parsed.ERRMSG || 'Interlock check failed',
        };
      }
    } catch {
      // Legacy Android does not parse the response before finish()
      // A status code of 200 is considered a success
    }

    return {
      isSuccess: true,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
