import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { ref } from 'vue';

import type { AlarmCommonPayload, AlarmRowItem } from '../types/alarm-common-popup.types';

interface HifosUdpAlarmBridge {
  startListening(): Promise<void>;
  addListener(
    eventName: 'alarmCommon',
    listener: (payload: AlarmCommonPayload) => void,
  ): Promise<PluginListenerHandle>;
  getPendingAlarms(options: {
    eventName: 'alarmCommon';
  }): Promise<{ events: AlarmCommonPayload[] }>;
  acknowledgeAlarm(options: { id: string }): Promise<void>;
}

const HifosUdpAlarm = registerPlugin<HifosUdpAlarmBridge>('HifosUdpAlarm');
interface AlarmCommonUdpDependencies {
  isNativePlatform: () => boolean;
  plugin: HifosUdpAlarmBridge;
}
const defaultDependencies: AlarmCommonUdpDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  plugin: HifosUdpAlarm,
};
const open = ref(false);
const roomName = ref('');
const rows = ref<AlarmRowItem[]>([]);
let activeAlarm: AlarmCommonPayload | undefined;
const alarmQueue: AlarmCommonPayload[] = [];
const queuedIds = new Set<string>();
let activePlugin: HifosUdpAlarmBridge | undefined;

function showNextAlarm(): void {
  if (activeAlarm || open.value) return;
  const nextAlarm = alarmQueue.shift();
  if (!nextAlarm) return;
  activeAlarm = nextAlarm;
  showAlarmCommonPopup(nextAlarm);
}

async function completeActiveAlarm(): Promise<void> {
  const completedAlarm = activeAlarm;
  activeAlarm = undefined;
  if (completedAlarm?.id) {
    queuedIds.delete(completedAlarm.id);
    await activePlugin?.acknowledgeAlarm({ id: completedAlarm.id });
  }
  showNextAlarm();
}

function enqueueAlarm(payload: AlarmCommonPayload): void {
  if (payload.id && queuedIds.has(payload.id)) return;
  if (payload.id) queuedIds.add(payload.id);
  alarmQueue.push(payload);
  void showNextAlarm();
}

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
  void completeActiveAlarm();
}

export async function initializeAlarmCommonUdpBridge(
  dependencies: AlarmCommonUdpDependencies = defaultDependencies,
): Promise<PluginListenerHandle | undefined> {
  if (!dependencies.isNativePlatform()) return undefined;
  activePlugin = dependencies.plugin;
  const handleAlarm = enqueueAlarm;
  let listenerHandle: PluginListenerHandle | undefined;
  try {
    listenerHandle = await dependencies.plugin.addListener('alarmCommon', handleAlarm);
    const pending = await dependencies.plugin.getPendingAlarms({ eventName: 'alarmCommon' });
    pending.events.forEach(handleAlarm);
    await dependencies.plugin.startListening();
    return listenerHandle;
  } catch {
    await listenerHandle?.remove();
    return undefined;
  }
}

export const alarmCommonPopup = {
  open,
  roomName,
  rows,
  show: showAlarmCommonPopup,
  close: closeAlarmCommonPopup,
};
