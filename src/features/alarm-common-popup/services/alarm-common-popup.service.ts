import { Capacitor, registerPlugin } from '@capacitor/core';
import { ref } from 'vue';

import type { AlarmCommonPayload, AlarmRowItem } from '../types/alarm-common-popup.types';

interface AlarmCommonNativePlugin {
  startListening(): Promise<void>;
  addListener(
    eventName: 'alarmCommon',
    listener: (payload: AlarmCommonPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const HifosUdpAlarm = registerPlugin<AlarmCommonNativePlugin>('HifosUdpAlarm');

const open = ref(false);
const roomName = ref('');
const rows = ref<AlarmRowItem[]>([]);

let nativeListener: { remove: () => Promise<void> } | undefined;

export function parseMessage(message: string): AlarmRowItem[] {
  return message.split(';').flatMap((pair) => {
    const keyValue = pair.split('=');
    if (keyValue.length !== 2) return [];

    return [{ title: keyValue[0].trim(), value: keyValue[1].trim() }];
  });
}

export function showAlarmCommonPopup(payload: AlarmCommonPayload): void {
  roomName.value = payload.roomName;
  rows.value = parseMessage(payload.message);
  open.value = true;
}

export function closeAlarmCommonPopup(): void {
  open.value = false;
}

export async function startAlarmCommonListener(): Promise<void> {
  if (!Capacitor.isNativePlatform() || nativeListener) return;

  nativeListener = await HifosUdpAlarm.addListener('alarmCommon', showAlarmCommonPopup);
  await HifosUdpAlarm.startListening();
}

export async function stopAlarmCommonListener(): Promise<void> {
  await nativeListener?.remove();
  nativeListener = undefined;
}

export const alarmCommonPopup = {
  open,
  roomName,
  rows,
  show: showAlarmCommonPopup,
  close: closeAlarmCommonPopup,
};

void startAlarmCommonListener();
