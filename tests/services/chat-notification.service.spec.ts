import {
  type ChatRoomOpenRequest,
  initializeChatNotificationBridge,
} from 'src/services/chat-notification.service';
import { describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';

vi.mock('src/services/hifos-udp-alarm.plugin', () => ({ HifosUdpAlarm: {} }));

function setup(pending: ChatRoomOpenRequest | null, native = true) {
  let listener: ((request: ChatRoomOpenRequest) => void) | undefined;
  const remove = vi.fn().mockResolvedValue(undefined);
  const plugin = {
    addListener: vi.fn((_name: string, cb: (request: ChatRoomOpenRequest) => void) => {
      listener = cb;
      return Promise.resolve({ remove });
    }),
    consumePendingChatRoomOpen: vi.fn().mockResolvedValue({ request: pending }),
  };
  const push = vi.fn().mockResolvedValue(undefined);
  const router = { push } as unknown as Router;
  const init = () =>
    initializeChatNotificationBridge(router, { isNativePlatform: () => native, plugin });
  return { plugin, push, init, emit: (r: ChatRoomOpenRequest) => listener?.(r), remove };
}

describe('chat notification bridge', () => {
  it('does nothing on web', async () => {
    const t = setup(null, false);
    expect(await t.init()).toBeUndefined();
    expect(t.plugin.addListener).not.toHaveBeenCalled();
  });

  it('opens the pending room on cold start with clearMessages=true', async () => {
    const t = setup({ roomId: 'R1', roomName: 'Room', clearMessages: true });
    await t.init();
    expect(t.push).toHaveBeenCalledWith({
      name: 'chat-room',
      query: { roomId: 'R1', roomName: 'Room', clearMessages: 'true' },
    });
  });

  it('does not navigate without a pending tap', async () => {
    const t = setup(null);
    await t.init();
    expect(t.push).not.toHaveBeenCalled();
  });

  it('keeps empty roomId (read-only room) and omits clearMessages when false', async () => {
    const t = setup(null);
    await t.init();
    t.emit({ roomId: '', roomName: '', clearMessages: false });
    await vi.waitFor(() => expect(t.plugin.consumePendingChatRoomOpen).toHaveBeenCalledTimes(2));
    expect(t.push).toHaveBeenCalledWith({
      name: 'chat-room',
      query: { roomId: '', roomName: '' },
    });
  });

  it('navigates on a warm tap and clears the native pending slot', async () => {
    const t = setup(null);
    await t.init();
    t.emit({ roomId: 'R2', roomName: 'B', clearMessages: true });
    await vi.waitFor(() => expect(t.plugin.consumePendingChatRoomOpen).toHaveBeenCalledTimes(2));
    expect(t.push).toHaveBeenCalledWith({
      name: 'chat-room',
      query: { roomId: 'R2', roomName: 'B', clearMessages: 'true' },
    });
  });

  it('falls back to empty roomId/roomName when native sends null fields', async () => {
    const t = setup({ roomId: null, roomName: null, clearMessages: false } as never);
    await t.init();
    expect(t.push).toHaveBeenCalledWith({
      name: 'chat-room',
      query: { roomId: '', roomName: '' },
    });
  });

  it('uses the Capacitor platform check by default and stays inert on web', async () => {
    const router = { push: vi.fn() } as unknown as Router;
    expect(await initializeChatNotificationBridge(router)).toBeUndefined();
  });

  it('removes the listener when the plugin fails', async () => {
    const t = setup(null);
    t.plugin.consumePendingChatRoomOpen.mockRejectedValue(new Error('x'));
    expect(await t.init()).toBeUndefined();
    expect(t.remove).toHaveBeenCalled();
  });
});
