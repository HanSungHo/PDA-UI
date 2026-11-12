import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

// hifos2 sends every chat message through MessageName.NEWPDALIST.
async function viaNewPdaList(name, body) {
  const response = await fetch(`${baseUrl}/hifos/NEWPDALIST`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

describe('Chat messages (hifos2 ChatListActivity / ChatRoomActivity)', () => {
  it('GETPDAMESSAGE returns ITEMS.ITEM rooms', async () => {
    const result = await viaNewPdaList(
      'GETPDAMESSAGE',
      '<FACILITY>F</FACILITY><AREA></AREA><IPADDR>1</IPADDR>',
    );
    assert.equal(result.STATUS, 'PASS');
    assert.ok(result.MSGBODY.ITEMS.ITEM[0].ROOM_ID);
  });

  it('NEWPDALIST returns PDAS.ITEM devices', async () => {
    const result = await viaNewPdaList('NEWPDALIST', '<FACILITY>F</FACILITY>');
    assert.ok(result.MSGBODY.PDAS.ITEM[0].PDAID);
  });

  it('GETPDAROOMMESSAGEBYROOM returns messages and USERS.USER', async () => {
    const result = await viaNewPdaList(
      'GETPDAROOMMESSAGEBYROOM',
      '<FACILITY>F</FACILITY><ROOMID>R1</ROOMID><ROOMNAME>N</ROOMNAME><IPADDR>1</IPADDR>',
    );
    assert.equal(result.STATUS, 'PASS');
    for (const key of ['ROOM_NAME', 'CONTENT', 'CREATED_AT', 'MESSAGE_LEVEL', 'SENDER_IP']) {
      assert.ok(result.MSGBODY.ITEMS.ITEM[0][key], key);
    }
    assert.ok(result.MSGBODY.USERS.USER[0].PDAID);
    const empty = await viaNewPdaList('GETPDAROOMMESSAGEBYROOM', '<ROOMID>R-EMPTY</ROOMID>');
    assert.equal(empty.MSGBODY.ITEMS.ITEM.length, 0);
    assert.equal(
      (await viaNewPdaList('GETPDAROOMMESSAGEBYROOM', '<ROOMID>R-FAIL</ROOMID>')).STATUS,
      'FAIL',
    );
  });
});
