import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { ROUTE } from 'src/constants/routes';
import type { Router } from 'vue-router';

import type { EMaxUdpPayload } from '../types/emax.types';

interface HifosUdpAlarmBridge {
  startListening(): Promise<void>;
  addListener(
    eventName: 'emax',
    listener: (payload: EMaxUdpPayload) => void,
  ): Promise<PluginListenerHandle>;
  getPendingAlarms(options: { eventName: 'emax' }): Promise<{ events: EMaxUdpPayload[] }>;
  acknowledgeAlarm(options: { id: string }): Promise<void>;
}

interface EMaxUdpDependencies {
  isNativePlatform: () => boolean;
  plugin: HifosUdpAlarmBridge;
}

const HifosUdpAlarm = registerPlugin<HifosUdpAlarmBridge>('HifosUdpAlarm');
const defaultDependencies: EMaxUdpDependencies = {
  isNativePlatform: () => Capacitor.isNativePlatform(),
  plugin: HifosUdpAlarm,
};

/**
 * Android starts a new EMax_Activity on top of the task for every broadcast, so the newest alarm
 * is shown first and finishing it reveals the previous one. The last element is the visible alarm.
 */
const alarmStack: EMaxUdpPayload[] = [];
let activeRouter: Router | undefined;
let activePlugin: HifosUdpAlarmBridge | undefined;
const queuedIds = new Set<string>();

async function showTopAlarm(): Promise<void> {
  const topAlarm = alarmStack[alarmStack.length - 1];
  if (!activeRouter || !topAlarm) return;

  const location = { name: ROUTE.emax, query: { receiverMessage: topAlarm.receiverMessage } };
  if (activeRouter.currentRoute.value.name === ROUTE.emax) await activeRouter.replace(location);
  else await activeRouter.push(location);
}

/** True when an older alarm is waiting underneath the visible one. */
export function hasStackedEMaxAlarm(): boolean {
  return alarmStack.length > 1;
}

/** Marks the visible EMax alarm as handled and reveals the previous one, if any. */
export async function completeActiveEMaxAlarm(): Promise<void> {
  const completedAlarm = alarmStack.pop();
  if (completedAlarm?.id) {
    queuedIds.delete(completedAlarm.id);
    await activePlugin?.acknowledgeAlarm({ id: completedAlarm.id });
  }
  await showTopAlarm();
}

function enqueueAlarm(payload: EMaxUdpPayload): void {
  if (!payload.receiverMessage || (payload.id && queuedIds.has(payload.id))) return;
  if (payload.id) queuedIds.add(payload.id);
  alarmStack.push(payload);
  void showTopAlarm();
}

export async function initializeEMaxUdpBridge(
  router: Router,
  dependencies: EMaxUdpDependencies = defaultDependencies,
): Promise<PluginListenerHandle | undefined> {
  if (!dependencies.isNativePlatform()) return undefined;

  let listenerHandle: PluginListenerHandle | undefined;
  activeRouter = router;
  activePlugin = dependencies.plugin;
  const handleAlarm = enqueueAlarm;

  try {
    listenerHandle = await dependencies.plugin.addListener('emax', handleAlarm);
    const pending = await dependencies.plugin.getPendingAlarms({ eventName: 'emax' });
    pending.events.forEach(handleAlarm);
    await dependencies.plugin.startListening();
    return listenerHandle;
  } catch {
    await listenerHandle?.remove();
    return undefined;
  }
}
