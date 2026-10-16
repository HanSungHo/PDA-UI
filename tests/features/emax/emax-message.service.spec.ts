import { parseEMaxReceiverMessage } from 'src/features/emax/services/emax-message.service';
import { describe, expect, it } from 'vitest';

function row(time: string, description: string): string {
  const fields = [`<TIME>${time}`];
  for (let index = 1; index < 23; index += 1) fields.push(`<F${index}>value${index}`);
  fields.push(`<DESC>${description}`);
  return `<Table diffgr:${fields.join('</')}`;
}

describe('parseEMaxReceiverMessage', () => {
  it('keeps the legacy defaults when the intent extra is missing', () => {
    expect(parseEMaxReceiverMessage()).toEqual({
      receiverTimeResult: '',
      receiverComment: ' ',
      receiverTimes: [],
    });
  });

  it('ignores a message without INTERLOCKMANAGER', () => {
    expect(parseEMaxReceiverMessage(row('2026-10-15T10:20:30+09:00', 'Vent complete'))).toEqual({
      receiverTimeResult: '',
      receiverComment: ' ',
      receiverTimes: [],
    });
  });

  it('parses the legacy field positions and timestamp normalization', () => {
    const message = `INTERLOCKMANAGER${row(
      '2026-10-15T10:20:30+09:00',
      'First vent',
    )}${row('2026-10-15T10:21:00+09:00', 'Second vent')}`;

    expect(parseEMaxReceiverMessage(message)).toEqual({
      receiverTimeResult: '2026-10-15 10:20:302026-10-15 10:21:00',
      receiverComment: ' \nFirst vent\n\nSecond vent\n',
      receiverTimes: ['2026-10-15 10:20:30', '2026-10-15 10:21:00'],
    });
  });

  it('preserves the legacy lexicographic greater-than-zero checks', () => {
    const message = `INTERLOCKMANAGER${row('0', '0')}${row('1', 'A')}`;
    expect(parseEMaxReceiverMessage(message)).toEqual({
      receiverTimeResult: '1',
      receiverComment: ' \nA\n',
      receiverTimes: ['1'],
    });
  });
});
