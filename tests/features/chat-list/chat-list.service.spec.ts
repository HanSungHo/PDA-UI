import { createPinia, setActivePinia } from 'pinia';
import { DeviceInfo } from 'src/constants/device-info';
import {
  createPdaMessageRoom,
  fetchPdaList,
  legacyItems,
} from 'src/features/chat-list/services/chat-legacy.service';
import { fetchChatRooms } from 'src/features/chat-list/services/chat-list.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));

const initialFacility = DeviceInfo.FACILITY;

beforeEach(() => setActivePinia(createPinia()));

afterEach(() => {
  DeviceInfo.FACILITY = initialFacility;
  vi.resetAllMocks();
});

describe('fetchChatRooms', () => {
  it('uses the legacy NEWPDALIST transport and getPdaMessage payload fields', async () => {
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

    await expect(fetchChatRooms('10.0.0.12')).resolves.toEqual([
      {
        id: 'ROOM-1',
        name: 'Message',
        lastMessage: 'Description',
        time: 'hh/mm',
        unreadCount: '1',
      },
    ]);
    const [route, request] = vi.mocked(apiClient.post).mock.calls[0] as [string, { sMsg: string }];
    expect(route).toBe('/hifos/newpdalist');
    expect(request.sMsg).toContain('<MSGNAME>GETPDAMESSAGE</MSGNAME>');
    expect(request.sMsg).toContain(
      '<MSGBODY>\n<FACILITY>FAB1</FACILITY>\n<AREA></AREA>\n<IPADDR>10.0.0.12</IPADDR>\n</MSGBODY>',
    );
  });

  it('sends the literal "null" for IPADDR / MYIP when there is no local IP', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { statusCode: 200, result: '{}' } });

    await fetchChatRooms(null);
    await fetchPdaList(null);

    const bodies = vi
      .mocked(apiClient.post)
      .mock.calls.map(([, request]) => (request as { sMsg: string }).sMsg);
    expect(bodies[0]).toContain('<IPADDR>null</IPADDR>');
    expect(bodies[1]).toContain('<MYIP>null</MYIP>');
  });

  it('returns no rooms when the legacy message response fails', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'failed' }),
      },
    });

    await expect(fetchChatRooms(null)).resolves.toEqual([]);
  });

  it('uses empty strings for missing room fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { ITEMS: { ITEM: [{ ROOM_ID: null }] } },
        }),
      },
    });

    await expect(fetchChatRooms(null)).resolves.toEqual([
      { id: '', name: '', lastMessage: '', time: '', unreadCount: '' },
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
    const [route, request] = vi.mocked(apiClient.post).mock.calls[0] as [string, { sMsg: string }];
    expect(route).toBe('/hifos/newpdalist');
    expect(request.sMsg).toContain('<MSGNAME>NEWPDALIST</MSGNAME>');
    expect(request.sMsg).toContain(
      `<MSGBODY>\n<FACILITY>${DeviceInfo.FACILITY}</FACILITY>\n<AREA></AREA>\n<BAY></BAY>\n<MYIP>10.0.0.12</MYIP>\n</MSGBODY>`,
    );
    expect(legacyItems({ ITEMS: [{ id: 1 }] }, 'ITEMS')).toEqual([{ id: 1 }]);
    expect(legacyItems({ ITEMS: { ITEM: [{ id: 2 }] } }, 'ITEMS')).toEqual([{ id: 2 }]);
    expect(legacyItems({ ITEMS: null }, 'ITEMS')).toEqual([]);
  });

  it('sends the legacy create-room request and handles failed responses', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { statusCode: 200, result: '{}' } });

    await expect(
      createPdaMessageRoom({ roomType: 'GROUP', roomName: 'Shift A', ipAddrList: ['1', '2'] }),
    ).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenLastCalledWith('/hifos/createPdaMessageRoom', {
      roomType: 'GROUP',
      roomName: 'Shift A',
      ipAddrList: ['1', '2'],
      creatorId: '',
    });
  });
});
