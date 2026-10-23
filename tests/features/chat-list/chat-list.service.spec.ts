import { DeviceInfo } from 'src/constants/device-info';
import { fetchChatRooms } from 'src/features/chat-list/services/chat-list.service';
import { sendMessage } from 'src/services/message.service';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/message.service', () => ({ sendMessage: vi.fn() }));
vi.mock('src/utils/common-util', () => ({
  CommonUtil: { wifiIpAddress: vi.fn() },
}));

const initialFacility = DeviceInfo.FACILITY;

afterEach(() => {
  DeviceInfo.FACILITY = initialFacility;
  vi.resetAllMocks();
});

describe('fetchChatRooms', () => {
  it('uses the legacy NEWPDALIST transport and getPdaMessage payload fields', async () => {
    DeviceInfo.FACILITY = 'FAB1';
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue('10.0.0.12');
    vi.mocked(sendMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          ITEMS: [
            {
              ROOM_ID: 'ROOM-1',
              ROOM_KEY: 'Message',
              LAST_MESSAGE: 'Description',
              LAST_MESSAGE_AT: 'hh/mm',
              UNREAD_COUNT: '1',
            },
          ],
        },
      }),
    });

    await expect(fetchChatRooms()).resolves.toEqual([
      {
        id: 'ROOM-1',
        name: 'Message',
        lastMessage: 'Description',
        time: 'hh/mm',
        unreadCount: '1',
      },
    ]);
    expect(sendMessage).toHaveBeenCalledWith('NEWPDALIST', {
      FACILITY: 'FAB1',
      AREA: '',
      IPADDR: '10.0.0.12',
    });
  });

  it('returns no rooms when the legacy message response fails', async () => {
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue(null);
    vi.mocked(sendMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'failed' }),
    });

    await expect(fetchChatRooms()).resolves.toEqual([]);
  });
});
