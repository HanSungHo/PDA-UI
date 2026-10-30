import { DeviceInfo } from 'src/constants/device-info';
import { emptyMDSSpcFields } from 'src/features/mds-spc/mds-spc';
import {
  activeMDSSpcEvent,
  CheckData,
  formatCurrentTime,
  formatMasterTime,
  InsertData,
  openMDSSpcActivity,
  optionsForSpinner,
  releaseMDSSpcEvent,
  setData,
  startMDSSpcListener,
  stopMDSSpcListener,
} from 'src/features/mds-spc/mds-spc.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

const capacitorMock = vi.hoisted(() => ({ isNativePlatform: vi.fn() }));
const udpAlarmMock = vi.hoisted(() => ({
  addListener: vi.fn(),
  getPendingAlarms: vi.fn(),
  acknowledgeAlarm: vi.fn(async () => undefined),
  startListening: vi.fn(),
  removeListener: vi.fn(async () => undefined),
  listener: undefined as ((payload: { id?: string; message: string }) => void) | undefined,
}));

vi.mock('@capacitor/core', () => ({ Capacitor: capacitorMock }));
vi.mock('src/services/hifos-udp-alarm.plugin', () => ({ HifosUdpAlarm: udpAlarmMock }));
vi.mock('src/services/aif-message.service', () => ({ postAifMessage: vi.fn() }));

describe('MDSSPC screen data and messages', () => {
  afterEach(async () => {
    await stopMDSSpcListener();
    while (activeMDSSpcEvent.value) releaseMDSSpcEvent(activeMDSSpcEvent.value.id);
    capacitorMock.isNativePlatform.mockReset();
    udpAlarmMock.addListener.mockReset();
    udpAlarmMock.getPendingAlarms.mockReset();
    udpAlarmMock.acknowledgeAlarm.mockReset();
    udpAlarmMock.startListening.mockReset();
    udpAlarmMock.listener = undefined;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('queues incoming interlocks and activates the next event after dismissal', () => {
    openMDSSpcActivity({ id: 'native-1', message: '<INTERLOCKMANAGER>' });
    const firstId = activeMDSSpcEvent.value?.id;
    if (!firstId) throw new Error('The first MDS SPC event was not activated.');
    expect(activeMDSSpcEvent.value?.title).toBe('#MDSSPC INTERLOCK#');
    expect(activeMDSSpcEvent.value?.shouldCheckData).toBe(true);
    openMDSSpcActivity({ id: 'native-2', message: '<INTERLOCKMANAGER>' });

    expect(activeMDSSpcEvent.value?.id).toBe(firstId);
    releaseMDSSpcEvent(firstId);
    expect(activeMDSSpcEvent.value?.id).not.toBe(firstId);
    expect(udpAlarmMock.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'native-1' });
    expect(udpAlarmMock.acknowledgeAlarm).not.toHaveBeenCalledWith({ id: 'native-2' });
  });

  it('removes a partial native registration so a failed start can be retried', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockResolvedValue({ remove: udpAlarmMock.removeListener });
    udpAlarmMock.getPendingAlarms
      .mockRejectedValueOnce(new Error('plugin unavailable'))
      .mockResolvedValueOnce({ events: [{ id: 'native-retry-1', message: '<INTERLOCKMANAGER>' }] });

    await expect(startMDSSpcListener()).resolves.toBeUndefined();
    expect(udpAlarmMock.removeListener).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      'Unable to start the MDSSPC alarm listener.',
      expect.any(Error),
    );

    await startMDSSpcListener();
    expect(udpAlarmMock.addListener).toHaveBeenCalledTimes(2);
    expect(activeMDSSpcEvent.value?.nativeAlarmId).toBe('native-retry-1');
    consoleError.mockRestore();
  });

  it('restores pending native events and only acknowledges them after dismissal', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockImplementation(
      async (_eventName: string, listener: (payload: { id?: string; message: string }) => void) => {
        udpAlarmMock.listener = listener;
        return { remove: udpAlarmMock.removeListener };
      },
    );
    udpAlarmMock.getPendingAlarms.mockResolvedValue({
      events: [{ id: 'native-pending-1', message: '<INTERLOCKMANAGER>' }],
    });

    await startMDSSpcListener();
    expect(udpAlarmMock.addListener).toHaveBeenCalledWith('mdsSpc', expect.any(Function));
    expect(udpAlarmMock.getPendingAlarms).toHaveBeenCalledWith({ eventName: 'mdsSpc' });
    expect(udpAlarmMock.startListening).toHaveBeenCalledOnce();
    expect(activeMDSSpcEvent.value?.nativeAlarmId).toBe('native-pending-1');
    expect(udpAlarmMock.acknowledgeAlarm).not.toHaveBeenCalled();

    releaseMDSSpcEvent(activeMDSSpcEvent.value?.id ?? '');
    expect(udpAlarmMock.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'native-pending-1' });
  });

  it('deduplicates a live alarm that also appears in the pending native snapshot', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockImplementation(
      async (_eventName: string, listener: (payload: { id?: string; message: string }) => void) => {
        udpAlarmMock.listener = listener;
        return { remove: udpAlarmMock.removeListener };
      },
    );
    udpAlarmMock.getPendingAlarms.mockImplementation(async () => {
      const event = { id: 'native-live-1', message: '<INTERLOCKMANAGER>' };
      udpAlarmMock.listener?.(event);
      return { events: [event] };
    });

    await startMDSSpcListener();
    const firstId = activeMDSSpcEvent.value?.id;

    expect(activeMDSSpcEvent.value?.id).toBe(firstId);
    expect(activeMDSSpcEvent.value?.nativeAlarmId).toBe('native-live-1');
    releaseMDSSpcEvent(firstId ?? '');
    expect(activeMDSSpcEvent.value).toBeNull();
    expect(udpAlarmMock.acknowledgeAlarm).toHaveBeenCalledTimes(1);
  });

  it('does not reopen a live alarm dismissed while the pending native snapshot is loading', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockImplementation(
      async (_eventName: string, listener: (payload: { id?: string; message: string }) => void) => {
        udpAlarmMock.listener = listener;
        return { remove: udpAlarmMock.removeListener };
      },
    );
    let resolvePending:
      | ((value: { events: { id: string; message: string }[] }) => void)
      | undefined;
    udpAlarmMock.getPendingAlarms.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve;
        }),
    );

    const startPromise = startMDSSpcListener();
    await vi.waitFor(() => expect(udpAlarmMock.listener).toBeTypeOf('function'));
    const event = { id: 'native-race-1', message: '<INTERLOCKMANAGER>' };
    udpAlarmMock.listener?.(event);
    const activeId = activeMDSSpcEvent.value?.id;
    releaseMDSSpcEvent(activeId ?? '');
    resolvePending?.({ events: [event] });
    await startPromise;

    expect(activeMDSSpcEvent.value).toBeNull();
    expect(udpAlarmMock.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'native-race-1' });
  });

  it('does not reopen a restored alarm when its delayed live callback arrives after dismissal', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockImplementation(
      async (_eventName: string, listener: (payload: { id?: string; message: string }) => void) => {
        udpAlarmMock.listener = listener;
        return { remove: udpAlarmMock.removeListener };
      },
    );
    const event = { id: 'native-late-live-1', message: '<INTERLOCKMANAGER>' };
    udpAlarmMock.getPendingAlarms.mockResolvedValue({ events: [event] });

    await startMDSSpcListener();
    const restoredEventId = activeMDSSpcEvent.value?.id;
    releaseMDSSpcEvent(restoredEventId ?? '');
    udpAlarmMock.listener?.(event);

    expect(activeMDSSpcEvent.value).toBeNull();
    expect(udpAlarmMock.acknowledgeAlarm).toHaveBeenCalledWith({ id: 'native-late-live-1' });
  });

  it('loads COMMENTS as the first measure and action values, preserving legacy precedence', async () => {
    vi.mocked(postAifMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { COMMENTS: 'Inspect / Adjust' } }),
    });
    const fields = { ...emptyMDSSpcFields(), Time: '2026-10-26 09:15:30.123', Area: 'LOT-01' };

    await expect(CheckData(fields)).resolves.toEqual({
      measure: ['Inspect'],
      action: ['Adjust'],
    });
    expect(postAifMessage).toHaveBeenCalledWith('mdscontent', 'MDSCONTENT', [
      ['MASTERTIMESTAMP', '2026/10/26_09:15:30'],
      ['AREANAME', 'LOT-01'],
      ['PROCTYPE', ''],
      ['MACHINENAME', ''],
      ['PARAMETER', ''],
      ['SAMPLE', ''],
      ['CREATETIME', ''],
    ]);
  });

  it('uses Android DESCRIPTION partitions and selects the NULL entries first', async () => {
    vi.mocked(postAifMessage).mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          DESCRIPTION: Array.from({ length: 13 }, (_, index) => `Option ${index + 1}`).join('|'),
        },
      }),
    });

    const choices = await CheckData(emptyMDSSpcFields());
    const measureOptions = optionsForSpinner(choices.measure);
    const actionOptions = optionsForSpinner(choices.action);

    expect(measureOptions[0]).toEqual({ label: 'NULL', value: 0 });
    expect(measureOptions[1]).toEqual({ label: 'Option 12', value: 1 });
    expect(actionOptions).toHaveLength(12);
    expect(actionOptions[0]).toEqual({ label: 'NULL', value: 0 });
    expect(actionOptions[11]).toEqual({ label: 'Option 11', value: 11 });
  });

  it('keeps failed MDSCONTENT responses silent in the UI and logs the legacy diagnostic', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(postAifMessage).mockResolvedValueOnce({
      statusCode: 500,
      result: 'MDSCONTENT failed',
    });

    await expect(CheckData(emptyMDSSpcFields())).resolves.toEqual({ measure: [], action: [] });
    expect(consoleError).toHaveBeenCalledWith('MDSCONTENT request failed.', 'MDSCONTENT failed');
    consoleError.mockRestore();
  });

  it('sends the MDSINSERT fields without adding a success or failure contract', async () => {
    vi.mocked(postAifMessage).mockResolvedValueOnce({ statusCode: 200, result: '{}' });
    const fields = {
      ...emptyMDSSpcFields(),
      Time: '2026-10-26 09:15:30.123',
      Area: 'LOT-01',
      Proctype: 'ETCH',
      Equipid: 'EQP-01',
      Parameter: 'ETCH_RATE',
      Sample: 'PORT-02',
      CreateTime: '2026-10-26T09:00:00.000+09:00',
    };

    await InsertData({ measure: 'Inspection', action: 'Adjust', fields });

    expect(postAifMessage).toHaveBeenCalledWith('mdsinsert', 'MDSINSERT', [
      ['INSPECT_COMMENT', 'Inspection'],
      ['ACT_COMMENT', 'Adjust'],
      ['USER_ID', DeviceInfo.OPERATOR_ID],
      ['ACTION_TIMESTAMP', fields.Time],
      ['AREANAME', fields.Area],
      ['PROCTYPE', fields.Proctype],
      ['MACHINENAME', fields.Equipid],
      ['PARAMETER', fields.Parameter],
      ['SAMPLE', fields.Sample],
      ['CREATETIME', fields.CreateTime],
    ]);
  });

  it('keeps MDSINSERT failures on screen and logs the legacy diagnostic', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Network down');
    vi.mocked(postAifMessage).mockRejectedValueOnce(error);

    await expect(
      InsertData({ measure: 'Inspection', action: 'Adjust', fields: emptyMDSSpcFields() }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith('INSERT_DATA failed.', error);
    consoleError.mockRestore();
  });

  it('sends the MDSSPC acknowledgement fields using the legacy timestamp format', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 26, 9, 20, 5));
    vi.mocked(postAifMessage).mockResolvedValueOnce({ statusCode: 200, result: '{}' });
    const fields = {
      ...emptyMDSSpcFields(),
      Time: '2026-10-26 09:15:30.123',
      Measeqpid: 'MEAS-EQP-01',
      Slot: '3',
    };

    await setData(fields);

    expect(postAifMessage).toHaveBeenCalledWith('SetGasusage', 'INTLKPOPUPCHECK', [
      ['MASTERTIMESTAMP', '2026/10/26_09:15:30'],
      ['EVENT_TYPE', 'MDSSPC'],
      ['NOTICE_TYPE', 'POP-UP'],
      ['IP', DeviceInfo.DEVICE_NAME],
      ['CLIENT_TYPE', 'PDA'],
      ['HOSTNAME', DeviceInfo.DEVICE_NAME],
      ['TARGET_URL', '"NULL"'],
      ['USER_CONFIRM', 'Y'],
      ['USER_CONFIRM_ID', DeviceInfo.OPERATOR_ID],
      ['USER_CONFIRM_TIME', '2026/10/26_09:20:05'],
      ['EQPID', 'MEAS-EQP-01'],
      ['RECIPE', 'NULL'],
      ['LOTID', 'NULL'],
      ['SLOT', '3'],
    ]);
  });

  it('falls back to the original master time if it does not match the legacy formatter', () => {
    expect(formatMasterTime('unparsed')).toBe('unparsed');
    expect(formatCurrentTime(new Date(2026, 9, 26, 9, 20, 5))).toBe('2026/10/26_09:20:05');
  });
});
