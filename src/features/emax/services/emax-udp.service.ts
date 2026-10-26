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

let activeAlarm: EMaxUdpPayload | undefined;
const alarmQueue: EMaxUdpPayload[] = [];
let activeRouter: Router | undefined;
let activePlugin: HifosUdpAlarmBridge | undefined;
const queuedIds = new Set<string>();

async function showNextAlarm(): Promise<void> {
  if (activeAlarm || !activeRouter) return;
  const nextAlarm = alarmQueue.shift();
  if (!nextAlarm?.receiverMessage) return;

  activeAlarm = nextAlarm;
  await activeRouter.push({
    name: ROUTE.emax,
    query: { receiverMessage: nextAlarm.receiverMessage },
  });
}

/** Marks the EMax alarm currently shown to the operator as handled, then opens the next one. */
export async function completeActiveEMaxAlarm(): Promise<void> {
  const completedAlarm = activeAlarm;
  activeAlarm = undefined;
  if (completedAlarm?.id) {
    queuedIds.delete(completedAlarm.id);
    await activePlugin?.acknowledgeAlarm({ id: completedAlarm.id });
  }
  await showNextAlarm();
}

function enqueueAlarm(payload: EMaxUdpPayload): void {
  if (!payload.receiverMessage || (payload.id && queuedIds.has(payload.id))) return;
  if (payload.id) queuedIds.add(payload.id);
  alarmQueue.push(payload);
  void showNextAlarm();
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
