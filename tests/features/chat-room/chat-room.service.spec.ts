import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import { fetchChatRoom, sendChatMessage } from 'src/features/chat-room/services/chat-room.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));

const initialFacility = DeviceInfo.FACILITY;

beforeEach(() => setActivePinia(createPinia()));

afterEach(() => {
  DeviceInfo.FACILITY = initialFacility;
  vi.resetAllMocks();
});

describe('chat room service', () => {
  it('loads room messages and participants through the legacy room-message transport', async () => {
    DeviceInfo.FACILITY = 'FAB1';
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

    await expect(fetchChatRoom('ROOM-1', 'Review', '10.0.0.12')).resolves.toEqual({
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
    const [route, request] = vi.mocked(apiClient.post).mock.calls[0] as [string, { sMsg: string }];
    expect(route).toBe('/hifos/NEWPDALIST');
    expect(request.sMsg).toContain('<MSGNAME>GETPDAROOMMESSAGEBYROOM</MSGNAME>');
    expect(request.sMsg).toContain(
      '<MSGBODY>\n<FACILITY>FAB1</FACILITY>\n<ROOMID>ROOM-1</ROOMID>\n<ROOMNAME>Review</ROOMNAME>\n<IPADDR>10.0.0.12</IPADDR>\n</MSGBODY>',
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

    await expect(fetchChatRoom('ROOM-1', 'Review', '10.0.0.12')).resolves.toEqual({
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

  it('without a local IP sends "null", never matches SENDER_IP and picks the last sender', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: {
              ITEM: [
                { ROOM_NAME: 'A', SENDER_IP: 'null' },
                { ROOM_NAME: 'B', SENDER_IP: '10.0.0.5' },
              ],
            },
          },
        }),
      },
    });

    const room = await fetchChatRoom('ROOM-1', 'Review', null);

    expect(room.recipientIp).toBe('10.0.0.5');
    expect(room.recipientId).toBe('B');
    const [, request] = vi.mocked(apiClient.post).mock.calls[0] as [string, { sMsg: string }];
    expect(request.sMsg).toContain('<IPADDR>null</IPADDR>');
  });
});
