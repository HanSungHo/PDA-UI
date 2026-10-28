import { registerPlugin } from '@capacitor/core';
import type { AlarmCommonPayload } from 'src/features/alarm-common-popup/types/alarm-common-popup.types';

interface HifosUdpAlarmPlugin {
  startListening(): Promise<void>;
  consumePendingEQPspc(): Promise<{ messages: string[] }>;
  addListener(
    eventName: 'chatMessage',
    listener: (payload: {
      roomId: string;
      roomName: string;
      senderId: string;
      senderIp: string;
      text: string;
      time: string;
      level: string;
    }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'udpMessage',
    listener: (payload: { level: string; message: string; roomName?: string }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'alarmCommon',
    listener: (payload: AlarmCommonPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    eventName: 'eqpSpc',
    listener: (payload: { message: string }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const HifosUdpAlarm = registerPlugin<HifosUdpAlarmPlugin>('HifosUdpAlarm');
