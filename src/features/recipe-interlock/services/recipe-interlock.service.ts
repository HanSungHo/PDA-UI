import { type AifMessageField, postAifMessage } from 'src/services/aif-message.service';

import type {
  IntlkPopupCheckParams,
  IntlkPopupCheckResponse,
  RecipeInterlockData,
} from '../types/recipe-interlock.types';

const INTERLOCK_MANAGER = 'INTERLOCKMANAGER';
const TABLE_DELIMITER = '<Table diffgr:';

function valueAfterLastTag(fragment: string): string {
  return fragment.slice(fragment.lastIndexOf('>') + 1).trim();
}

/**
 * Parses the raw UDP receiver XML message containing INTERLOCKMANAGER.
 * Replicates legacy RecipeInterlockActivity parsing 1:1.
 */
export function parseRecipeInterlockMessage(receiverMessage?: string): RecipeInterlockData {
  let machine = '';
  let lotid = '';
  let rRecipe = '';
  let pRecipe = '';
  let time = '';

  if (!receiverMessage || !receiverMessage.includes(INTERLOCK_MANAGER)) {
    return { machine, lotid, rRecipe, pRecipe, time };
  }

  const rows = receiverMessage.split(TABLE_DELIMITER).slice(1);

  for (const row of rows) {
    const fields = row.split('</');

    const m = valueAfterLastTag(fields[4] ?? '');
    if (m && m > '0') machine += m;

    const lot = valueAfterLastTag(fields[5] ?? '');
    if (lot && lot > '0') lotid += lot;

    const rRcp = valueAfterLastTag(fields[6] ?? '');
    if (rRcp && rRcp > '0') rRecipe += rRcp;

    const pRcp = valueAfterLastTag(fields[7] ?? '');
    if (pRcp && pRcp > '0') pRecipe += pRcp;

    const rawTime = valueAfterLastTag(fields[0] ?? '');
    if (rawTime && rawTime > '0') {
      const trimmedTime = rawTime.includes('+')
        ? rawTime.slice(0, rawTime.indexOf('+')).replace('T', ' ')
        : rawTime.replace('T', ' ');
      time += trimmedTime;
    }
  }

  return { machine, lotid, rRecipe, pRecipe, time };
}

/**
 * Converts "yyyy-MM-dd HH:mm:ss.SSS" to "yyyy/MM/dd_HH:mm:ss"
 * Matching legacy DateTimeFormatter conversion with exception fallback.
 */
export function formatMasterTime(originalTime: string): string {
  if (!originalTime || typeof originalTime !== 'string') return originalTime;

  try {
    const normalized = originalTime.trim().replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      // Manual regex fallback for "yyyy-MM-dd HH:mm:ss"
      const match = originalTime
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        return `${match[1]}/${match[2]}/${match[3]}_${match[4]}:${match[5]}:${match[6]}`;
      }
      return originalTime;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day}_${hours}:${minutes}:${seconds}`;
  } catch {
    return originalTime;
  }
}

/**
 * Returns current timestamp in "yyyy/MM/dd_HH:mm:ss" format.
 */
export function formatCurrentTime(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day}_${hours}:${minutes}:${seconds}`;
}

/**
 * Sends INTLKPOPUPCHECK message to the backend.
 * In legacy Android:
 * MessageFactoryUtil.intlkpopupcheck(...) sent with MessageSender.send(..., MessageName.SETGASUSAGE).
 */
export async function sendIntlkPopupCheck(
  params: IntlkPopupCheckParams,
): Promise<IntlkPopupCheckResponse> {
  const fields: AifMessageField[] = [
    ['MASTERTIMESTAMP', params.masterTime],
    ['EVENT_TYPE', 'RECIPE'],
    ['NOTICE_TYPE', 'POP-UP'],
    ['IP', params.deviceName],
    ['CLIENT_TYPE', 'PDA'],
    ['HOSTNAME', params.deviceName],
    ['TARGET_URL', '"NULL"'],
    ['USER_CONFIRM', 'Y'],
    ['USER_CONFIRM_ID', params.users],
    ['USER_CONFIRM_TIME', params.currentTime],
    ['EQPID', params.eqpId],
    ['RECIPE', params.recipe],
    ['LOTID', params.lotId ?? 'NULL'],
    ['SLOT', params.slot ?? 'NULL'],
  ];

  try {
    const data = await postAifMessage('SetGasusage', 'INTLKPOPUPCHECK', fields);

    if (data.statusCode !== 200) {
      return { isSuccess: false, message: data.result || 'Server error' };
    }

    try {
      const parsed = JSON.parse(data.result);
      if (parsed.STATUS === 'FAIL') {
        return { isSuccess: false, message: parsed.ERRMSG || 'Interlock check failed' };
      }
    } catch {
      // In legacy, response is not parsed before finish(), statusCode 200 is treated as ok
    }

    return { isSuccess: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isSuccess: false, message };
  }
}
