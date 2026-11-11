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

// Same wire format as hifos2 MessageSender: POST /hifos/<MessageName value> with the AIFMSG in sMsg.
// The route (MessageName.ETCHINSPINFO = "EtchInspectionInfo") differs from the AIFMSG name.
async function post(route, msgName, body) {
  const response = await fetch(`${baseUrl}/hifos/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${msgName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

const search = (lotId) =>
  post('EtchInspectionInfo', 'ETCHINSPINFO', `<TYPE>S</TYPE><LOTID>${lotId}</LOTID>`);
const execute = (lotId) =>
  post(
    'EtchInspectionexecution',
    'ETCHINSPEXCUTION',
    `<FACILITY>GUMI</FACILITY><LOTNAME>${lotId}</LOTNAME><PRODUCTSPEC>P</PRODUCTSPEC><MACHINE>M</MACHINE><OPERATION>O</OPERATION><OPERATIONDESC>D</OPERATIONDESC><USERID>U</USERID><COMMENT>c</COMMENT>`,
  );

describe('Etch inspection (hifos2 EtchInspectionActivity)', () => {
  it('serves the keys the legacy Activity reads through the legacy route name', async () => {
    const result = await search('LOT-1');
    assert.equal(result.STATUS, 'PASS');
    for (const key of [
      'OLDPROCESSOPERATIONNAME',
      'OLDOPERATIONDESCRIPTION',
      'OLDMACHINENAME',
      'NOWPROCESSOPERATIONNAME',
      'NOWOPERATIONDESCRIPTION',
      'INSPDATE',
      'PRODUCTSPECNAME',
    ]) {
      assert.equal(typeof result.MSGBODY[key], 'string', key);
    }
    assert.equal(result.MSGBODY.INSPDATE, '');
  });

  it('reports a previous inspection date for an EXIST lot', async () => {
    assert.notEqual((await search('LOT-EXIST')).MSGBODY.INSPDATE, '');
  });

  it('fails with ERRMSG for an unknown lot and an empty lot id', async () => {
    const missing = await search('LOT-NOTFOUND');
    assert.equal(missing.STATUS, 'FAIL');
    assert.ok(missing.ERRMSG);
    assert.equal((await search('')).STATUS, 'FAIL');
  });

  it('records an execution so the next search shows INSPDATE', async () => {
    assert.equal((await search('LOT-RECORD')).MSGBODY.INSPDATE, '');
    assert.equal((await execute('LOT-RECORD')).STATUS, 'PASS');
    assert.notEqual((await search('LOT-RECORD')).MSGBODY.INSPDATE, '');
  });

  it('fails execution for an EXECFAIL lot', async () => {
    const result = await execute('LOT-EXECFAIL');
    assert.equal(result.STATUS, 'FAIL');
    assert.ok(result.ERRMSG);
  });
});

describe('eSheet -> EDC scenario link', () => {
  it('serves EDC data for the eSheet LOT that enables the D column', async () => {
    const result = await post('getEdcData', 'GETEDCDATA', '<LOTID>WP-EDC</LOTID>');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PROCESSTYPE, 'THICK');
  });
});
