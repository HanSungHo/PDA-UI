import { DeviceInfo } from 'src/constants/device-info';
import {
  createPdaMessageRoom,
  fetchPdaList,
  legacyItems,
  sendLegacyChatMessage,
  xmlMessage,
} from 'src/features/chat-list/services/chat-legacy.service';
import { fetchChatRooms } from 'src/features/chat-list/services/chat-list.service';
import apiClient from 'src/services/api-client';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));
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
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            ITEMS: {
              ITEM: [
                {
                  ROOM_ID: 'ROOM-1',
                  ROOM_KEY: 'Message',
                  LAST_MESSAGE: 'Description',
                  LAST_MESSAGE_AT: 'hh/mm',
                  UNREAD_COUNT: '1',
                },
              ],
            },
          },
        }),
      },
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
    expect(apiClient.post).toHaveBeenCalledWith(
      '/hifos/NEWPDALIST',
      expect.objectContaining({
        sMsg: expect.stringContaining('<MSGNAME>GETPDAMESSAGE</MSGNAME>'),
      }),
    );
  });

  it('returns no rooms when the legacy message response fails', async () => {
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue(null);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'failed' }),
      },
    });

    await expect(fetchChatRooms()).resolves.toEqual([]);
  });

  it('uses empty strings for missing room fields', async () => {
    vi.mocked(CommonUtil.wifiIpAddress).mockResolvedValue(undefined);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { ITEMS: [{ ROOM_ID: null }] } }),
      },
    });

    await expect(fetchChatRooms()).resolves.toEqual([
      { id: '', name: '', lastMessage: '', time: '', unreadCount: '0' },
    ]);
  });
});

describe('chat legacy service', () => {
  it('maps PDA list values and supports legacy item shapes', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            PDAS: {
              ITEM: [
                { PDAID: 1, IPADDRESS: '10.0.0.1', BAY: 'BAY-1', AREA: 'AREA-1', USERNAME: null },
              ],
            },
          },
        }),
      },
    });

    await expect(fetchPdaList('10.0.0.12')).resolves.toEqual([
      { id: '1', ip: '10.0.0.1', bay: 'BAY-1', area: 'AREA-1', userName: '' },
    ]);
    expect(legacyItems({ ITEMS: [{ id: 1 }] }, 'ITEMS')).toEqual([{ id: 1 }]);
    expect(legacyItems({ ITEMS: { ITEM: [{ id: 2 }] } }, 'ITEMS')).toEqual([{ id: 2 }]);
    expect(legacyItems({ ITEMS: null }, 'ITEMS')).toEqual([]);
  });

  it('sends the legacy create-room request and handles failed responses', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { statusCode: 200, result: '{}' } });

    await expect(sendLegacyChatMessage('<BODY />')).resolves.toEqual({});
    await expect(
      createPdaMessageRoom({ roomType: 'GROUP', roomName: 'Shift A', ipAddrList: ['1', '2'] }),
    ).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenLastCalledWith('/hifos/createPdaMessageRoom', {
      roomType: 'GROUP',
      roomName: 'Shift A',
      ipAddrList: ['1', '2'],
      creatorId: '',
    });
    expect(xmlMessage('PING', '<BODY />')).toContain('<MSGNAME>PING</MSGNAME>');
  });
});
