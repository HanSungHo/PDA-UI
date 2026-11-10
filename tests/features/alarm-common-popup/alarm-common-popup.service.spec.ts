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

  it('shows the newest alarm first; OK acknowledges it and reveals the previous one', async () => {
    const acknowledgeAlarm = vi.fn(async () => undefined);
    const plugin = {
      addListener: vi.fn(async () => ({ remove: vi.fn(async () => undefined) })),
      getPendingAlarms: vi.fn(async () => ({
        events: [
          { id: 'alarm-a', level: 'HIGH', roomName: 'A', message: 'Lot=A' },
          { id: 'alarm-b', level: 'HIGH', roomName: 'B', message: 'Lot=B' },
          { id: 'alarm-c', level: 'HIGH', roomName: 'C', message: 'Lot=C' },
        ] satisfies AlarmCommonPayload[],
      })),
      acknowledgeAlarm,
      startListening: vi.fn(async () => undefined),
    };

    await initializeAlarmCommonUdpBridge({ isNativePlatform: () => true, plugin });
    expect(alarmCommonPopup.roomName.value).toBe('C');
    expect(acknowledgeAlarm).not.toHaveBeenCalled();

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(alarmCommonPopup.roomName.value).toBe('B'));
    expect(alarmCommonPopup.open.value).toBe(true);
    expect(acknowledgeAlarm).toHaveBeenCalledWith({ id: 'alarm-c' });

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(alarmCommonPopup.roomName.value).toBe('A'));
    expect(acknowledgeAlarm).toHaveBeenCalledWith({ id: 'alarm-b' });

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(acknowledgeAlarm).toHaveBeenCalledWith({ id: 'alarm-a' }));
    expect(alarmCommonPopup.open.value).toBe(false);
  });

  it('does nothing outside the native platform', async () => {
    const plugin = {
      addListener: vi.fn(),
      getPendingAlarms: vi.fn(),
      acknowledgeAlarm: vi.fn(),
      startListening: vi.fn(),
    };

    await expect(
      initializeAlarmCommonUdpBridge({ isNativePlatform: () => false, plugin }),
    ).resolves.toBeUndefined();
    expect(plugin.addListener).not.toHaveBeenCalled();
  });

  it('uses the Capacitor platform check by default (web: no native bridge)', async () => {
    await expect(initializeAlarmCommonUdpBridge()).resolves.toBeUndefined();
  });

  it('removes the listener and returns undefined when native startup fails', async () => {
    const remove = vi.fn(async () => undefined);
    const plugin = {
      addListener: vi.fn(async () => ({ remove })),
      getPendingAlarms: vi.fn(async () => ({ events: [] })),
      acknowledgeAlarm: vi.fn(),
      startListening: vi.fn(async () => {
        throw new Error('bind failed');
      }),
    };

    await expect(
      initializeAlarmCommonUdpBridge({ isNativePlatform: () => true, plugin }),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalled();
  });

  it('drops a duplicate native id while queued and shows id-less alarms without acknowledging', async () => {
    const acknowledgeAlarm = vi.fn(async () => undefined);
    let emit: (payload: AlarmCommonPayload) => void = () => undefined;
    const plugin = {
      addListener: vi.fn(async (_name: 'alarmCommon', listener: typeof emit) => {
        emit = listener;
        return { remove: vi.fn(async () => undefined) };
      }),
      getPendingAlarms: vi.fn(async () => ({ events: [] })),
      acknowledgeAlarm,
      startListening: vi.fn(async () => undefined),
    };
    await initializeAlarmCommonUdpBridge({ isNativePlatform: () => true, plugin });

    emit({ id: 'dup', level: 'HIGH', roomName: 'R1', message: 'A=1' });
    emit({ id: 'dup', level: 'HIGH', roomName: 'R-dup', message: 'A=2' });
    emit({ level: 'HIGH', roomName: 'R2', message: 'B=1' });
    expect(alarmCommonPopup.roomName.value).toBe('R2');

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(alarmCommonPopup.roomName.value).toBe('R1'));
    expect(acknowledgeAlarm).not.toHaveBeenCalled();

    closeAlarmCommonPopup();
    await vi.waitFor(() => expect(acknowledgeAlarm).toHaveBeenCalledTimes(1));
    expect(alarmCommonPopup.open.value).toBe(false);
  });
});
