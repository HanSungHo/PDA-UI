import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// Source: hifos2 ChatListActivity.kt / ChatRoomActivity.kt. All chat messages are sent through
// MessageName.NEWPDALIST, so the router dispatches them by AIFMSG name (legacy route aliases).
//  - NEWPDALIST            -> PDAS.ITEM[{PDAID, IPADDRESS, BAY, AREA, USERNAME}] (PDA picker)
//  - GETPDAMESSAGE         -> ITEMS.ITEM[{ROOM_ID, ROOM_KEY, LAST_MESSAGE, LAST_MESSAGE_AT, UNREAD_COUNT}]
//  - GETPDAROOMMESSAGEBYROOM (ROOMID) -> ITEMS.ITEM[{ROOM_NAME, CONTENT, CREATED_AT, MESSAGE_LEVEL,
//    SENDER_IP}] and USERS.USER[{PDAID}]
// Scenario ROOMID: ...EMPTY -> no messages, ...FAIL -> FAIL.
const rooms = [
  {
    ROOM_ID: 'MOCK-ROOM-001',
    ROOM_KEY: 'Message',
    LAST_MESSAGE: 'Description',
    LAST_MESSAGE_AT: 'hh/mm',
    UNREAD_COUNT: '1',
  },
  {
    ROOM_ID: 'MOCK-ROOM-002',
    ROOM_KEY: 'Message',
    LAST_MESSAGE: 'Description',
    LAST_MESSAGE_AT: 'hh/mm',
    UNREAD_COUNT: '2',
  },
];

const pdas = [
  {
    PDAID: 'PDA-0001',
    IPADDRESS: '10.0.0.11',
    BAY: 'BAY-A',
    AREA: 'PHOTO',
    USERNAME: 'Operator One',
  },
  {
    PDAID: 'PDA-0002',
    IPADDRESS: '10.0.0.12',
    BAY: 'BAY-B',
    AREA: 'ETCH',
    USERNAME: 'Operator Two',
  },
];

const messagesFor = (roomId) => [
  {
    ROOM_NAME: 'PDA-03',
    CONTENT: `Hello from ${roomId}`,
    CREATED_AT: '10:32',
    MESSAGE_LEVEL: 'NORMAL',
    SENDER_IP: '10.0.0.3',
  },
  {
    ROOM_NAME: 'PDA-04',
    CONTENT: '긴급: LOT 확인 부탁드립니다.',
    CREATED_AT: '10:31',
    MESSAGE_LEVEL: 'HIGH',
    SENDER_IP: '10.0.0.4',
  },
  {
    ROOM_NAME: 'PDA-05',
    CONTENT: 'Acknowledged',
    CREATED_AT: '10:30',
    MESSAGE_LEVEL: 'NORMAL',
    SENDER_IP: '10.0.0.5',
  },
];

export function createChatListHandlers() {
  return {
    NEWPDALIST: () =>
      pass({
        ITEMS: rooms.map((room) => ({ ...room })),
        PDAS: { ITEM: pdas.map((pda) => ({ ...pda })) },
      }),

    GETPDAMESSAGE: () => pass({ ITEMS: { ITEM: rooms.map((room) => ({ ...room })) } }),

    GETPDAROOMMESSAGEBYROOM: ({ payload } = {}) => {
      const roomId = readPayloadField(payload, 'ROOMID').trim();
      if (roomId.toUpperCase().includes('FAIL')) return fail('채팅방 정보를 불러오지 못했습니다.');

      return pass({
        ITEMS: { ITEM: roomId.toUpperCase().includes('EMPTY') ? [] : messagesFor(roomId) },
        USERS: { USER: pdas.map(({ PDAID }) => ({ PDAID })) },
      });
    },

    SENDPDAMESSAGE: () => pass(),
    CREATEPDAMESSAGEROOM: () => pass(),
  };
}
