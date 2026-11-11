import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { createApp } from '../src/app.js';
import { createStore } from '../src/data/store.js';
import { createChatListHandlers } from '../src/messages/chat-list.handlers.js';

const store = createStore();
let server;
let baseUrl;

before(async () => {
  server = createApp({ store }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function aifMessage(messageName, fields) {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('');
  return `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`;
}

function postNewPdaList(messageName, fields) {
  return fetch(`${baseUrl}/hifos/NEWPDALIST`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sMsg: aifMessage(messageName, fields) }),
  });
}

test('GETPDAMESSAGE returns legacy room ITEMS', () => {
  const result = JSON.parse(createChatListHandlers().GETPDAMESSAGE().result);

  assert.equal(result.STATUS, 'PASS');
  assert.deepEqual(
    result.MSGBODY.ITEMS.ITEM.map((room) => [room.ROOM_ID, room.UNREAD_COUNT]),
    [
      ['MOCK-ROOM-001', '1'],
      ['MOCK-ROOM-002', '2'],
    ],
  );
});

test('room list is served from the NEWPDALIST endpoint with the GETPDAMESSAGE message', async () => {
  const response = await postNewPdaList('GETPDAMESSAGE', {
    FACILITY: 'FAB1',
    AREA: '',
    IPADDR: '10.0.0.12',
  });

  assert.equal(response.status, 200);
  const result = JSON.parse((await response.json()).result);
  assert.equal(result.STATUS, 'PASS');
  assert.equal(result.MSGBODY.ITEMS.ITEM.length, 2);
  assert.deepEqual(
    store
      .getMessageRequests()
      .filter((request) => request.messageName === 'NEWPDALIST')
      .at(-1)?.payload,
    { FACILITY: 'FAB1', AREA: '', IPADDR: '10.0.0.12' },
  );
});

test('NEWPDALIST returns the selectable PDAS and records MYIP', async () => {
  const response = await postNewPdaList('NEWPDALIST', {
    FACILITY: 'FAB1',
    AREA: '',
    BAY: '',
    MYIP: '10.0.0.12',
  });

  const result = JSON.parse((await response.json()).result);
  assert.equal(result.STATUS, 'PASS');
  assert.deepEqual(Object.keys(result.MSGBODY.PDAS.ITEM[0]), [
    'PDAID',
    'IPADDRESS',
    'BAY',
    'AREA',
    'USERNAME',
  ]);
  assert.deepEqual(
    store
      .getMessageRequests()
      .filter((request) => request.messageName === 'NEWPDALIST')
      .at(-1)?.payload,
    { FACILITY: 'FAB1', AREA: '', BAY: '', MYIP: '10.0.0.12' },
  );
});

test('chat-room GETPDAROOMMESSAGEBYROOM answers ITEMS.ITEM and USERS.USER arrays', () => {
  const body = JSON.parse(createChatListHandlers().GETPDAROOMMESSAGEBYROOM().result).MSGBODY;

  assert.ok(Array.isArray(body.ITEMS.ITEM));
  assert.ok(Array.isArray(body.USERS.USER));
  assert.equal(body.ITEMS.ITEM.length, 3);
});

test('createPdaMessageRoom accepts the plain JSON create-room request', async () => {
  const payload = {
    roomType: 'GROUP',
    roomName: 'Shift A',
    creatorId: '',
    ipAddrList: ['10.0.0.12', '10.0.0.3'],
  };
  const response = await fetch(`${baseUrl}/hifos/createPdaMessageRoom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 200);
  assert.equal(JSON.parse((await response.json()).result).STATUS, 'PASS');
  assert.deepEqual(
    store
      .getMessageRequests()
      .filter((request) => request.messageName === 'createPdaMessageRoom')
      .at(-1)?.payload,
    payload,
  );
});

test('other messages are still rejected on the NEWPDALIST endpoint', async () => {
  const response = await postNewPdaList('GETMACHINEINFORM', {});

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'MESSAGE_NAME_MISMATCH');
});
