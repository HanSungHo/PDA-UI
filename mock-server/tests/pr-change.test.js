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

async function send(endpoint, name, fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('');
  const response = await fetch(`${baseUrl}/hifos/${endpoint.toLowerCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

it('serves the PR change flow end to end and resets mock state', async () => {
  const pump = await send('PUMPSTATUS', 'PUMPSTATUS', { PUMPID: 'pump-001' });
  assert.equal(pump.STATUS, 'PASS');
  assert.equal(pump.MSGBODY.FLAG, '1');
  assert.equal(pump.MSGBODY.EQPID, 'EQP-PUMP-01');

  assert.equal((await send('PUMPSTATUS', 'PUMPSTATUS', { PUMPID: 'NOPE' })).STATUS, 'FAIL');

  const current = { EQPID: 'EQP-PUMP-01', PUMPNAME: 'PUMP-001', PRID: '1001' };
  assert.equal((await send('CURRENTPRINFO', 'CURRENTPRINFO', current)).MSGBODY.PRID, '1001');
  assert.equal(
    (await send('CURRENTPRINFO', 'CURRENTPRINFO', { ...current, PRID: '1003' })).STATUS,
    'FAIL',
  );

  const info = await send('PRINFO', 'PRINFO', { ...current, PRID: '1003' });
  assert.equal(info.MSGBODY.PRCOMP, 'SHIN-ETSU');
  assert.match(info.MSGBODY.TIME, /^\d{14}$/);
  assert.equal((await send('PRINFO', 'PRINFO', { ...current, PRID: '9999' })).STATUS, 'FAIL');

  assert.equal((await send('COMPAREPRINFO', 'COMPAREPRINFO', current)).STATUS, 'FAIL');
  assert.equal(
    (await send('COMPAREPRINFO', 'COMPAREPRINFO', { ...current, BANJANGID: 'OP1' })).STATUS,
    'PASS',
  );

  // Legacy posts the PRCHANGE message to the currentprinfo endpoint.
  const changed = await send('CURRENTPRINFO', 'PRCHANGE', {
    ...current,
    PRID: '1003',
    PRDESC: 'SE-PR-1003',
    PRCOMP: 'SHIN-ETSU',
    USERID: 'OP1',
    USERNAME: 'Operator',
    LEAK: 'false',
    INDATE: '202610270900',
  });
  assert.equal(changed.STATUS, 'PASS');
  assert.equal(
    (await send('PUMPSTATUS', 'PUMPSTATUS', { PUMPID: 'PUMP-001' })).MSGBODY.PRID,
    '1003',
  );

  await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
  assert.equal(
    (await send('PUMPSTATUS', 'PUMPSTATUS', { PUMPID: 'PUMP-001' })).MSGBODY.PRID,
    '1001',
  );
});
