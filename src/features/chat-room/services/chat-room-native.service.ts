import { Capacitor, registerPlugin } from '@capacitor/core';

interface HifosChatRoomBridge {
  clearRoomMessages(options: { roomName: string }): Promise<{ cleared: boolean }>;
}

const HifosChatRoom = registerPlugin<HifosChatRoomBridge>('HifosChatRoom');

export async function clearRoomMessages(roomName: string): Promise<void> {
  if (!roomName || !Capacitor.isNativePlatform()) return;
  await HifosChatRoom.clearRoomMessages({ roomName });
}
