import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

const premptyAifXml = (eqpId = 'EQP-PUMP-01') => `<AIFMSG>
<MSGNAME>INTLKPOPUPCHECK</MSGNAME>
<RECEIVER>HIFOS_MOBILE</RECEIVER>
<SENDER>PDA001</SENDER>
<MSGTYPE>P</MSGTYPE>
<WITHREPLY>YES</WITHREPLY>
<STATUS></STATUS>
<ERRMSG></ERRMSG>
<TID></TID>
<MSGBODY>
<MASTERTIMESTAMP>2026/10/26_09:15:30</MASTERTIMESTAMP>
<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>
<NOTICE_TYPE>POP-UP</NOTICE_TYPE>
<IP>PDA001</IP>
<CLIENT_TYPE>PDA</CLIENT_TYPE>
<HOSTNAME>PDA001</HOSTNAME>
<TARGET_URL>"NULL"</TARGET_URL>
<USER_CONFIRM>Y</USER_CONFIRM>
<USER_CONFIRM_ID>OPERATOR_01</USER_CONFIRM_ID>
<USER_CONFIRM_TIME>2026/10/26_09:20:00</USER_CONFIRM_TIME>
<EQPID>${eqpId}</EQPID>
<RECIPE>NULL</RECIPE>
<LOTID>NULL</LOTID>
<SLOT>NULL</SLOT>
</MSGBODY>
</AIFMSG>`;

describe('PR_EMPTY (prempty) mock handlers', () => {
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

  it('handles INTLKPOPUPCHECK with EVENT_TYPE=PR_EMPTY via /message/send', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          MASTERTIMESTAMP: '2026/10/26_09:15:30',
          EVENT_TYPE: 'PR_EMPTY',
          NOTICE_TYPE: 'POP-UP',
          IP: 'PDA001',
          CLIENT_TYPE: 'PDA',
          HOSTNAME: 'PDA001',
          TARGET_URL: '"NULL"',
          USER_CONFIRM: 'Y',
          USER_CONFIRM_ID: 'OPERATOR_01',
          USER_CONFIRM_TIME: '2026/10/26_09:20:00',
          EQPID: 'EQP-PUMP-01',
          RECIPE: 'NULL',
          LOTID: 'NULL',
          SLOT: 'NULL',
        },
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.statusCode, 200);
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.RESULT, 'OK');
  });

  it('handles PR_EMPTY via legacy alias /hifos/SetGasusage with AIFMSG envelope', async () => {
    const response = await fetch(`${baseUrl}/hifos/SetGasusage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sMsg: premptyAifXml() }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.statusCode, 200);
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'PASS');
  });

  it('returns failure when EQPID is FAIL_EQP for PR_EMPTY event', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          EVENT_TYPE: 'PR_EMPTY',
          EQPID: 'FAIL_EQP',
          USER_CONFIRM: 'Y',
        },
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, 'PR_EMPTY interlock confirmation failed.');
  });

  it('does not affect recipe-interlock path when EVENT_TYPE is RECIPE', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          EVENT_TYPE: 'RECIPE',
          EQPID: 'EQP-TEST01',
          USER_CONFIRM: 'Y',
        },
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    const result = JSON.parse(data.result);
    assert.equal(result.STATUS, 'PASS');
  });

  it('returns failure for recipe-interlock path when EQPID is FAIL_EQP and EVENT_TYPE is RECIPE', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'INTLKPOPUPCHECK',
        payload: {
          EVENT_TYPE: 'RECIPE',
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
