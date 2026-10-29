import assert from 'node:assert/strict';
import { after, before, it } from 'node:test';

import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function send(name, type, content) {
  const fields = `<FACTORYNAME>FAB1</FACTORYNAME><TYPE>${type}</TYPE><MACHINENAME>EQP-1</MACHINENAME>${content === undefined ? '' : `<CONTENT>${content}</CONTENT><USERID>OP1</USERID>`}`;
  const response = await fetch(`${baseUrl}/hifos/${name.toLowerCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${fields}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

it('stores machine and process INFORM independently and resets mock state', async () => {
  assert.equal((await send('GETMACHINEINFORM', 'MACHINE')).MSGBODY.INFORM_CONTENT, '');
  assert.equal(
    (await send('ADDMACHINEINFORM', 'MACHINE', 'machine memo')).MSGBODY.INFORM_CONTENT,
    'machine memo',
  );
  assert.equal((await send('GETMACHINEINFORM', 'MACHINE')).MSGBODY.INFORM_CONTENT, 'machine memo');
  assert.equal((await send('GETMACHINEINFORM', 'PROCESS')).MSGBODY.INFORM_CONTENT, '');
  await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
  assert.equal((await send('GETMACHINEINFORM', 'MACHINE')).MSGBODY.INFORM_CONTENT, '');
});
