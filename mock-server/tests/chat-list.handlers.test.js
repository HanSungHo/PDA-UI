import assert from 'node:assert/strict';
import test from 'node:test';

import { createChatListHandlers } from '../src/messages/chat-list.handlers.js';

test('NEWPDALIST returns legacy room ITEMS', () => {
  const response = createChatListHandlers().NEWPDALIST({ payload: {} });
  const result = JSON.parse(response.result);

  assert.equal(response.statusCode, 200);
  assert.equal(result.STATUS, 'PASS');
  assert.deepEqual(result.MSGBODY.ITEMS, [
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
  ]);
});
