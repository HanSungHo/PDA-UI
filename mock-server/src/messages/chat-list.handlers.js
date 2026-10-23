import { pass } from '../utils/response.js';

export function createChatListHandlers() {
  return {
    NEWPDALIST: () =>
      pass({
        ITEMS: [
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
        ],
      }),
  };
}
