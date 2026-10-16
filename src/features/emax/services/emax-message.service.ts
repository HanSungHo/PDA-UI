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
    const rawTime = valueAfterLastTag(fields[0] ?? '');
    const description = valueAfterLastTag(fields[23] ?? '');

    if (rawTime > '0') {
      const normalizedTime = rawTime.split('+', 1)[0]?.replace('T', ' ') ?? '';
      receiverTimeResult += normalizedTime;
      receiverTimes.push(normalizedTime);
    }

    if (description > '0') receiverComment += `\n${description}\n`;
  }

  return { receiverTimeResult, receiverComment, receiverTimes };
}
