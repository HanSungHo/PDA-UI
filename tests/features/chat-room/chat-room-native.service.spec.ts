import { Capacitor } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { nativeClearRoomMessages } = vi.hoisted(() => ({ nativeClearRoomMessages: vi.fn() }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn() },
  registerPlugin: vi.fn(() => ({ clearRoomMessages: nativeClearRoomMessages })),
}));

import { clearRoomMessages } from 'src/features/chat-room/services/chat-room-native.service';

afterEach(() => vi.resetAllMocks());

describe('chat room native service', () => {
  it('skips native calls for an empty room or web platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await clearRoomMessages('');
    await clearRoomMessages('Review');

    expect(nativeClearRoomMessages).not.toHaveBeenCalled();
  });

  it('clears a room on native platforms', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    nativeClearRoomMessages.mockResolvedValue({ cleared: true });

    await clearRoomMessages('Review');

    expect(nativeClearRoomMessages).toHaveBeenCalledWith({ roomName: 'Review' });
  });
});
