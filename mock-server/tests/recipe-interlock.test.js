import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

describe('Recipe Interlock mock handlers', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('handles INTLKPOPUPCHECK via /message/send', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          MASTERTIMESTAMP: '2026/06/01_21:37:02',
          EVENT_TYPE: 'RECIPE',
          NOTICE_TYPE: 'POP-UP',
          EQPID: 'EQP-TEST01',
          RECIPE: 'RCP_REMOTE_001',
          USER_CONFIRM: 'Y',
          USER_CONFIRM_ID: 'TEST_USER',
          USER_CONFIRM_TIME: '2026/06/01_21:40:00',
        },
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.statusCode, 200);
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'PASS');
  });

  it('handles legacy alias SetGasusage with INTLKPOPUPCHECK envelope via /hifos/SetGasusage', async () => {
    const xml = `<AIFMSG>
<MSGNAME>INTLKPOPUPCHECK</MSGNAME>
<RECEIVER>HIFOS_MOBILE</RECEIVER>
<SENDER>PDA001</SENDER>
<MSGTYPE>P</MSGTYPE>
<WITHREPLY>YES</WITHREPLY>
<STATUS></STATUS>
<ERRMSG></ERRMSG>
<TID></TID>
<MSGBODY>
<MASTERTIMESTAMP>2026/06/01_21:37:02</MASTERTIMESTAMP>
<EVENT_TYPE>RECIPE</EVENT_TYPE>
<NOTICE_TYPE>POP-UP</NOTICE_TYPE>
<IP>PDA001</IP>
<CLIENT_TYPE>PDA</CLIENT_TYPE>
<HOSTNAME>PDA001</HOSTNAME>
<TARGET_URL>"NULL"</TARGET_URL>
<USER_CONFIRM>Y</USER_CONFIRM>
<USER_CONFIRM_ID>TEST_USER</USER_CONFIRM_ID>
<USER_CONFIRM_TIME>2026/06/01_21:40:00</USER_CONFIRM_TIME>
<EQPID>EQP-TEST01</EQPID>
<RECIPE>RCP_REMOTE_001</RECIPE>
<LOTID>NULL</LOTID>
<SLOT>NULL</SLOT>
</MSGBODY>
</AIFMSG>`;

    const response = await fetch(`${baseUrl}/hifos/SetGasusage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sMsg: xml }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.statusCode, 200);
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'PASS');
  });

  it('returns failure when EQPID is FAIL_EQP', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          EQPID: 'FAIL_EQP',
          USER_CONFIRM: 'Y',
        },
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, 'Recipe interlock confirmation failed.');
  });
});
