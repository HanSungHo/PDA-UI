import {
  alarmCommonPopup,
  closeAlarmCommonPopup,
  parseMessage,
} from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import { describe, expect, it } from 'vitest';

describe('alarm common popup message parser', () => {
  it('maps only valid semicolon-delimited key/value pairs in their received order', () => {
    expect(parseMessage('LotID = ABC123; Equipment = EQ-01')).toEqual([
      { title: 'LotID', value: 'ABC123' },
      { title: 'Equipment', value: 'EQ-01' },
    ]);
  });

  it('silently ignores malformed pairs exactly as the legacy parser does', () => {
    expect(parseMessage('LotID=ABC123;bad-data;A=B=C;=;')).toEqual([
      { title: 'LotID', value: 'ABC123' },
      { title: '', value: '' },
    ]);
  });

  it('exposes singleton actions for opening and closing the popup from any component', () => {
    alarmCommonPopup.show({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    expect(alarmCommonPopup.open.value).toBe(true);

    alarmCommonPopup.close();
    expect(alarmCommonPopup.open.value).toBe(false);

    closeAlarmCommonPopup();
  });
});
