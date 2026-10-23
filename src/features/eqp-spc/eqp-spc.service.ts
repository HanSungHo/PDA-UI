import { Capacitor } from '@capacitor/core';
import { DeviceInfo } from 'src/constants/device-info';
import { postAifMessage } from 'src/services/aif-message.service';
import { HifosUdpAlarm } from 'src/services/hifos-udp-alarm.plugin';
import { shallowRef } from 'vue';

import { type EQPspcFields, parseEQPspcMessage } from './eqp-spc';

export interface EQPspcEvent {
  id: string;
  fields: EQPspcFields;
}

export const activeEQPspcEvent = shallowRef<EQPspcEvent | null>(null);
const pendingEvents: EQPspcEvent[] = [];
let nextEventId = 0;
let nativeListener: { remove: () => Promise<void> } | undefined;

export function openEQPspcActivity(payload: { message: string }): void {
  const event = { id: String(++nextEventId), fields: parseEQPspcMessage(payload.message) };
  if (activeEQPspcEvent.value) pendingEvents.push(event);
  else activeEQPspcEvent.value = event;
}

export function releaseEQPspcEvent(eventId: string): void {
  if (activeEQPspcEvent.value?.id === eventId) {
    activeEQPspcEvent.value = pendingEvents.shift() ?? null;
    return;
  }
  const pendingIndex = pendingEvents.findIndex((event) => event.id === eventId);
  if (pendingIndex !== -1) pendingEvents.splice(pendingIndex, 1);
}

export async function startEQPspcListener(): Promise<void> {
  if (!Capacitor.isNativePlatform() || nativeListener) return;
  nativeListener = await HifosUdpAlarm.addListener('eqpSpc', (payload) => {
    void openEQPspcActivity(payload);
  });
  const { messages } = await HifosUdpAlarm.consumePendingEQPspc();
  for (const message of messages) openEQPspcActivity({ message });
  await HifosUdpAlarm.startListening();
}

export async function stopEQPspcListener(): Promise<void> {
  await nativeListener?.remove();
  nativeListener = undefined;
}

function currentTime(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}_${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function intlkpopupcheck(data: EQPspcFields): Promise<unknown> {
  const sDeviceName = DeviceInfo.DEVICE_NAME;
  const sUsers = DeviceInfo.OPERATOR_ID;
  // EQPspcActivity sends this message through MessageName.SETGASUSAGE.
  return postAifMessage('SetGasusage', 'INTLKPOPUPCHECK', [
    ['MASTERTIMESTAMP', data.Time],
    ['EVENT_TYPE', 'EQPSPC'],
    ['NOTICE_TYPE', 'POP-UP'],
    ['IP', sDeviceName],
    ['CLIENT_TYPE', 'PDA'],
    ['HOSTNAME', sDeviceName],
    ['TARGET_URL', '"NULL"'],
    ['USER_CONFIRM', 'Y'],
    ['USER_CONFIRM_ID', sUsers],
    ['USER_CONFIRM_TIME', currentTime()],
    ['EQPID', data.Equipid],
    ['RECIPE', data.Recipe],
    ['LOTID', data.Lotid],
    ['SLOT', data.Slot],
  ]);
}
