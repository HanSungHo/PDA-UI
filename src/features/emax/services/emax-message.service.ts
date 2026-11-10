import type { EMaxMessageResult } from '../types/emax.types';

const INTERLOCK_MANAGER = 'INTERLOCKMANAGER';
const TABLE_DELIMITER = '<Table diffgr:';

function valueAfterLastTag(fragment: string): string {
  return fragment.slice(fragment.lastIndexOf('>') + 1);
}

export function parseEMaxReceiverMessage(receiverMessage?: string): EMaxMessageResult {
  let receiverTimeResult = '';
  let receiverComment = ' ';
  const receiverTimes: string[] = [];

  if (!receiverMessage?.includes(INTERLOCK_MANAGER)) {
    return { receiverTimeResult, receiverComment, receiverTimes };
  }

  const rows = receiverMessage.split(TABLE_DELIMITER).slice(1);

  for (const row of rows) {
    const fields = row.split('</');
    const firstFieldEnd = row.indexOf('</');
    const rawTime = valueAfterLastTag(firstFieldEnd < 0 ? row : row.slice(0, firstFieldEnd));
    const description = valueAfterLastTag(fields[23] ?? '');

    if (rawTime > '0') {
      const plusIndex = rawTime.indexOf('+');
      const timeBeforePlus = plusIndex < 0 ? rawTime : rawTime.slice(0, plusIndex);
      const normalizedTime = timeBeforePlus.replace('T', ' ');
      receiverTimeResult += normalizedTime;
      receiverTimes.push(normalizedTime);
    }

    if (description > '0') receiverComment += `\n${description}\n`;
  }

  return { receiverTimeResult, receiverComment, receiverTimes };
}
