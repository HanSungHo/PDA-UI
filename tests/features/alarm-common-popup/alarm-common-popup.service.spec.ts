import {
  alarmCommonPopup,
  closeAlarmCommonPopup,
  initializeAlarmCommonUdpBridge,
  parseMessage,
} from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import type { AlarmCommonPayload } from 'src/features/alarm-common-popup/types/alarm-common-popup.types';
import { describe, expect, it, vi } from 'vitest';

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

  it('shows queued alarms one at a time and acknowledges each after confirmation', async () => {
    const acknowledgeAlarm = vi.fn(async () => undefined);
    const plugin = {
      addListener: vi.fn(async () => ({ remove: vi.fn(async () => undefined) })),
      getPendingAlarms: vi.fn(async () => ({
        events: [
          { id: 'alarm-a', level: 'HIGH', roomName: 'A', message: 'Lot=A' },
          { id: 'alarm-b', level: 'HIGH', roomName: 'B', message: 'Lot=B' },
        ] satisfies AlarmCommonPayload[],
      })),
      acknowledgeAlarm,
      startListening: vi.fn(async () => undefined),
    };

    await initializeAlarmCommonUdpBridge({ isNativePlatform: () => true, plugin });
    await vi.waitFor(() => expect(alarmCommonPopup.roomName.value).toBe('A'));
    expect(acknowledgeAlarm).not.toHaveBeenCalled();

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(alarmCommonPopup.roomName.value).toBe('B'));
    expect(acknowledgeAlarm).toHaveBeenCalledWith({ id: 'alarm-a' });

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(acknowledgeAlarm).toHaveBeenCalledWith({ id: 'alarm-b' }));
  });
});
