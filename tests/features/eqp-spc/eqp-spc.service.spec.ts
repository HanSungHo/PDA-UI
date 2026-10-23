import { DeviceInfo } from 'src/constants/device-info';
import { emptyEQPspcFields } from 'src/features/eqp-spc/eqp-spc';
import {
  activeEQPspcEvent,
  intlkpopupcheck,
  openEQPspcActivity,
  releaseEQPspcEvent,
  startEQPspcListener,
  stopEQPspcListener,
} from 'src/features/eqp-spc/eqp-spc.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

const capacitorMock = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
}));

const udpAlarmMock = vi.hoisted(() => ({
  addListener: vi.fn(),
  consumePendingEQPspc: vi.fn(),
  startListening: vi.fn(),
  removeListener: vi.fn(async () => undefined),
  listener: undefined as ((payload: { message: string }) => void) | undefined,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitorMock,
}));

vi.mock('src/services/hifos-udp-alarm.plugin', () => ({
  HifosUdpAlarm: udpAlarmMock,
}));

vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: vi.fn(async () => undefined),
}));

describe('EQPspc acknowledgement', () => {
  afterEach(async () => {
    await stopEQPspcListener();
    while (activeEQPspcEvent.value) releaseEQPspcEvent(activeEQPspcEvent.value.id);
    capacitorMock.isNativePlatform.mockReset();
    udpAlarmMock.addListener.mockReset();
    udpAlarmMock.consumePendingEQPspc.mockReset();
    udpAlarmMock.startListening.mockReset();
    udpAlarmMock.listener = undefined;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('queues UDP events without navigating away from the active screen', () => {
    openEQPspcActivity({ message: 'INTERLOCKMANAGER' });
    const firstEventId = activeEQPspcEvent.value?.id;
    if (!firstEventId) throw new Error('The first EQP SPC event was not activated.');
    openEQPspcActivity({ message: 'INTERLOCKMANAGER' });

    expect(activeEQPspcEvent.value).toEqual({
      id: firstEventId,
      fields: emptyEQPspcFields(),
    });
    releaseEQPspcEvent(firstEventId);
    expect(activeEQPspcEvent.value?.id).not.toBe(firstEventId);
    expect(activeEQPspcEvent.value?.fields).toEqual(emptyEQPspcFields());
  });

  it('restores interlocks opened from background notifications and then receives live UDP', async () => {
    capacitorMock.isNativePlatform.mockReturnValue(true);
    udpAlarmMock.addListener.mockImplementation(
      async (_eventName: string, listener: (payload: { message: string }) => void) => {
        udpAlarmMock.listener = listener;
        return { remove: udpAlarmMock.removeListener };
      },
    );
    udpAlarmMock.consumePendingEQPspc.mockResolvedValue({
      messages: ['INTERLOCKMANAGER', 'INTERLOCKMANAGER'],
    });
    udpAlarmMock.startListening.mockResolvedValue(undefined);

    await startEQPspcListener();

    expect(udpAlarmMock.addListener).toHaveBeenCalledWith('eqpSpc', expect.any(Function));
    expect(udpAlarmMock.consumePendingEQPspc).toHaveBeenCalledOnce();
    expect(udpAlarmMock.startListening).toHaveBeenCalledOnce();
    const firstId = activeEQPspcEvent.value?.id;
    if (!firstId) throw new Error('The first EQP SPC event was not activated.');

    udpAlarmMock.listener?.({ message: 'INTERLOCKMANAGER' });
    releaseEQPspcEvent(firstId);
    const secondId = activeEQPspcEvent.value?.id;
    if (!secondId) throw new Error('The second EQP SPC event was not activated.');
    expect(secondId).not.toBe(firstId);
    releaseEQPspcEvent(secondId);
    const thirdId = activeEQPspcEvent.value?.id;
    if (!thirdId) throw new Error('The third EQP SPC event was not activated.');
    expect(thirdId).not.toBe(secondId);
    releaseEQPspcEvent(thirdId);
    expect(activeEQPspcEvent.value).toBeNull();
    expect(postAifMessage).not.toHaveBeenCalled();
  });

  it('sends INTLKPOPUPCHECK with the legacy fields and local confirmation time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 13, 4, 5));
    const data = {
      ...emptyEQPspcFields(),
      Lotid: 'LOT-01',
      Equipid: 'EQ-1',
      Recipe: 'RCP',
      Slot: '2',
      Time: 'MASTER-TIME',
    };
    await intlkpopupcheck(data);

    expect(postAifMessage).toHaveBeenCalledWith('SetGasusage', 'INTLKPOPUPCHECK', [
      ['MASTERTIMESTAMP', 'MASTER-TIME'],
      ['EVENT_TYPE', 'EQPSPC'],
      ['NOTICE_TYPE', 'POP-UP'],
      ['IP', DeviceInfo.DEVICE_NAME],
      ['CLIENT_TYPE', 'PDA'],
      ['HOSTNAME', DeviceInfo.DEVICE_NAME],
      ['TARGET_URL', '"NULL"'],
      ['USER_CONFIRM', 'Y'],
      ['USER_CONFIRM_ID', DeviceInfo.OPERATOR_ID],
      ['USER_CONFIRM_TIME', '2026/10/20_13:04:05'],
      ['EQPID', 'EQ-1'],
      ['RECIPE', 'RCP'],
      ['LOTID', 'LOT-01'],
      ['SLOT', '2'],
    ]);
  });
});
