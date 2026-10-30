/* eslint-disable no-console */
import { Capacitor } from '@capacitor/core';
import type { BaseOption } from 'src/components/base';
import { DeviceInfo } from 'src/constants/device-info';
import { postAifMessage } from 'src/services/aif-message.service';
import { HifosUdpAlarm } from 'src/services/hifos-udp-alarm.plugin';
import type { MessageResponseData } from 'src/types/api';
import { shallowRef } from 'vue';

import { type MDSSpcFields, parseMDSSpcMessage } from './mds-spc';

export interface MDSSpcEvent {
  id: string;
  nativeAlarmId?: string;
  fields: MDSSpcFields;
  title: string;
  shouldCheckData: boolean;
}

export interface MDSSpcChoices {
  measure: string[];
  action: string[];
}

export interface InsertDataParams {
  measure: string;
  action: string;
  fields: MDSSpcFields;
}

export const activeMDSSpcEvent = shallowRef<MDSSpcEvent | null>(null);
const pendingEvents: MDSSpcEvent[] = [];
let nextEventId = 0;
let nativeListener: { remove: () => Promise<void> } | undefined;
const queuedNativeAlarmIds = new Set<string>();
const recentlyAcknowledgedNativeAlarmIds = new Set<string>();
const recentlyAcknowledgedNativeAlarmQueue: string[] = [];
const MAX_RECENTLY_ACKNOWLEDGED_NATIVE_ALARMS = 256;

export function openMDSSpcActivity(payload: { id?: string; message: string }): void {
  if (payload.id) {
    if (queuedNativeAlarmIds.has(payload.id) || recentlyAcknowledgedNativeAlarmIds.has(payload.id))
      return;
    queuedNativeAlarmIds.add(payload.id);
  }
  const shouldCheckData = payload.message.includes('INTERLOCKMANAGER');
  const event = {
    id: String(++nextEventId),
    nativeAlarmId: payload.id,
    fields: parseMDSSpcMessage(payload.message),
    title: shouldCheckData ? '#MDSSPC INTERLOCK#' : 'PR EMPTY INTERLOCK',
    shouldCheckData,
  };
  if (activeMDSSpcEvent.value) pendingEvents.push(event);
  else activeMDSSpcEvent.value = event;
}

export function releaseMDSSpcEvent(eventId: string): void {
  if (activeMDSSpcEvent.value?.id === eventId) {
    acknowledgeNativeAlarm(activeMDSSpcEvent.value);
    activeMDSSpcEvent.value = pendingEvents.shift() ?? null;
    return;
  }
  const pendingIndex = pendingEvents.findIndex((event) => event.id === eventId);
  if (pendingIndex !== -1) {
    const [releasedEvent] = pendingEvents.splice(pendingIndex, 1);
    if (releasedEvent) acknowledgeNativeAlarm(releasedEvent);
  }
}

function acknowledgeNativeAlarm(event: MDSSpcEvent): void {
  if (!event.nativeAlarmId) return;
  queuedNativeAlarmIds.delete(event.nativeAlarmId);
  rememberAcknowledgedNativeAlarm(event.nativeAlarmId);
  void HifosUdpAlarm.acknowledgeAlarm({ id: event.nativeAlarmId }).catch((error: unknown) => {
    console.error('Unable to acknowledge MDSSPC alarm.', error);
  });
}

function rememberAcknowledgedNativeAlarm(id: string): void {
  if (recentlyAcknowledgedNativeAlarmIds.has(id)) return;
  recentlyAcknowledgedNativeAlarmIds.add(id);
  recentlyAcknowledgedNativeAlarmQueue.push(id);
  if (recentlyAcknowledgedNativeAlarmQueue.length > MAX_RECENTLY_ACKNOWLEDGED_NATIVE_ALARMS) {
    const oldestId = recentlyAcknowledgedNativeAlarmQueue.shift();
    if (oldestId) recentlyAcknowledgedNativeAlarmIds.delete(oldestId);
  }
}

export async function startMDSSpcListener(): Promise<void> {
  if (!Capacitor.isNativePlatform() || nativeListener) return;
  try {
    nativeListener = await HifosUdpAlarm.addListener('mdsSpc', (payload) => {
      openMDSSpcActivity(payload);
    });
    const { events } = await HifosUdpAlarm.getPendingAlarms({ eventName: 'mdsSpc' });
    for (const event of events) {
      if (event.message) openMDSSpcActivity(event);
    }
    await HifosUdpAlarm.startListening();
  } catch (error) {
    // Drop the partial registration so the next start can restore pending alarms again.
    console.error('Unable to start the MDSSPC alarm listener.', error);
    await stopMDSSpcListener().catch(() => undefined);
  }
}

export async function stopMDSSpcListener(): Promise<void> {
  await nativeListener?.remove();
  nativeListener = undefined;
}

function bodyOf(response: MessageResponseData): Record<string, unknown> | undefined {
  if (response.statusCode !== 200) return undefined;
  try {
    const parsed = JSON.parse(response.result) as {
      STATUS?: string;
      MSGBODY?: Record<string, unknown>;
    };
    return parsed.STATUS === 'PASS' && parsed.MSGBODY ? parsed.MSGBODY : undefined;
  } catch {
    return undefined;
  }
}

/** Matches the legacy CheckData option precedence and NULL insertion rules. */
export async function CheckData(fields: MDSSpcFields): Promise<MDSSpcChoices> {
  const masterTime = fields.Time.replace(/-/g, '/').replace(' ', '_').slice(0, 19);
  try {
    const response = await postAifMessage('mdscontent', 'MDSCONTENT', [
      ['MASTERTIMESTAMP', masterTime],
      ['AREANAME', fields.Area],
      ['PROCTYPE', fields.Proctype],
      ['MACHINENAME', fields.Equipid],
      ['PARAMETER', fields.Parameter],
      ['SAMPLE', fields.Sample],
      ['CREATETIME', fields.CreateTime],
    ]);
    const body = bodyOf(response);
    if (!body) {
      console.error('MDSCONTENT request failed.', response.result);
      return { measure: [], action: [] };
    }

    const rawComments = typeof body.COMMENTS === 'string' ? body.COMMENTS : '';
    if (rawComments.length > 0) {
      const commentList = rawComments.split(/[/→]/).map((comment) => comment.trim());
      return {
        measure: commentList.length > 0 ? [commentList[0] ?? ''] : [],
        action: commentList.length >= 2 ? [commentList[1] ?? ''] : [],
      };
    }

    const rawDescription = typeof body.DESCRIPTION === 'string' ? body.DESCRIPTION : '';
    if (rawDescription.length === 0) return { measure: [], action: [] };

    const totalList = rawDescription.split('|').map((item) => item.trim());
    const action = ['NULL', ...totalList.slice(0, 11)];
    const measure = ['NULL', ...(totalList.length > 11 ? totalList.slice(11) : [])];
    return { measure, action };
  } catch (error) {
    console.error('MDSCONTENT request failed.', error);
    return { measure: [], action: [] };
  }
}

export function optionsForSpinner(values: readonly string[]): BaseOption[] {
  return values.map((label, index) => ({ label, value: index }));
}

/** Matches the legacy InsertData validation and MDSINSERT field contract. */
export async function InsertData({ measure, action, fields }: InsertDataParams): Promise<void> {
  try {
    await postAifMessage('mdsinsert', 'MDSINSERT', [
      ['INSPECT_COMMENT', measure],
      ['ACT_COMMENT', action],
      ['USER_ID', DeviceInfo.OPERATOR_ID],
      ['ACTION_TIMESTAMP', fields.Time],
      ['AREANAME', fields.Area],
      ['PROCTYPE', fields.Proctype],
      ['MACHINENAME', fields.Equipid],
      ['PARAMETER', fields.Parameter],
      ['SAMPLE', fields.Sample],
      ['CREATETIME', fields.CreateTime],
    ]);
  } catch (error) {
    console.error('INSERT_DATA failed.', error);
  }
}

export function formatMasterTime(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}_${match[4]}:${match[5]}:${match[6]}` : value;
}

export function formatCurrentTime(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}_${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/** Matches the legacy setData acknowledgement payload. */
export async function setData(fields: MDSSpcFields): Promise<void> {
  await postAifMessage('SetGasusage', 'INTLKPOPUPCHECK', [
    ['MASTERTIMESTAMP', formatMasterTime(fields.Time)],
    ['EVENT_TYPE', 'MDSSPC'],
    ['NOTICE_TYPE', 'POP-UP'],
    ['IP', DeviceInfo.DEVICE_NAME],
    ['CLIENT_TYPE', 'PDA'],
    ['HOSTNAME', DeviceInfo.DEVICE_NAME],
    ['TARGET_URL', '"NULL"'],
    ['USER_CONFIRM', 'Y'],
    ['USER_CONFIRM_ID', DeviceInfo.OPERATOR_ID],
    ['USER_CONFIRM_TIME', formatCurrentTime()],
    ['EQPID', fields.Measeqpid],
    ['RECIPE', 'NULL'],
    ['LOTID', 'NULL'],
    ['SLOT', fields.Slot],
  ]);
}
