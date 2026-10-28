import { DeviceInfo } from 'src/constants/device-info';
import { fetchChatRoom, sendChatMessage } from 'src/features/chat-room/services/chat-room.service';
import apiClient from 'src/services/api-client';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));
vi.mock('src/utils/common-util', () => ({ CommonUtil: { wifiIpAddress: vi.fn() } }));

const initialFacility = DeviceInfo.FACILITY;

afterEach(() => {
  DeviceInfo.FACILITY = initialFacility;
  vi.resetAllMocks();
});

describe('chat room service', () => {
  it('loads room messages and participants through the legacy room-message transport', async () => {
    DeviceInfo.FACILITY = 'FAB1';
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue('10.0.0.12');
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: {
              ITEM: [
                {
                  ROOM_NAME: 'Peer',
                  CONTENT: 'Hello',
                  CREATED_AT: '12:30',
                  MESSAGE_LEVEL: 'HIGH',
                  SENDER_IP: '10.0.0.24',
                },
              ],
            },
            USERS: { USER: [{ PDAID: 'Peer' }] },
          },
        }),
      },
    });

    await expect(fetchChatRoom('ROOM-1', 'Review')).resolves.toEqual({
      messages: [
        {
          roomId: 'ROOM-1',
          senderId: 'Peer',
          senderIp: '10.0.0.24',
          text: 'Hello',
          time: '12:30',
          level: 'HIGH',
        },
      ],
      participants: ['Peer'],
      recipientIp: '10.0.0.24',
      recipientId: 'Peer',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/hifos/NEWPDALIST',
      expect.objectContaining({
        sMsg: expect.stringContaining('<MSGNAME>GETPDAROOMMESSAGEBYROOM</MSGNAME>'),
      }),
    );
  });

  it('preserves the legacy sendPdaMessage endpoint and payload', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    const request = {
      sType: 'PRIVATE' as const,
      sArea: '',
      sBay: '',
      recieveIpAddress: '10.0.0.24',
      sMsg: 'Hello',
      senderIpAddress: '10.0.0.12',
      senderId: 'Operator',
      roomId: 'ROOM-1',
      sLevel: 'NORMAL' as const,
    };

    await expect(sendChatMessage(request)).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith('/hifos/sendPdaMessage', request);
  });

  it('keeps recipient data empty for local-only messages and missing fields', async () => {
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue('10.0.0.12');
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: [
              {
                ROOM_NAME: null,
                CONTENT: null,
                CREATED_AT: 123,
                MESSAGE_LEVEL: null,
                SENDER_IP: '10.0.0.12',
              },
            ],
            USERS: { USER: [{ PDAID: 7 }] },
          },
        }),
      },
    });

    await expect(fetchChatRoom('ROOM-1', 'Review')).resolves.toEqual({
      messages: [
        {
          roomId: 'ROOM-1',
          senderId: '',
          senderIp: '10.0.0.12',
          text: '',
          time: '123',
          level: '',
        },
      ],
      participants: ['7'],
      recipientIp: '',
      recipientId: '',
    });
  });
});
