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

// hifos2 sends GETSCOPELOTINFO / INPUTSCOPEDATA through MessageName.MESSAGE (/hifos/message).
async function post(route, name, body) {
  const response = await fetch(`${baseUrl}/hifos/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

const lotInfo = (lotId) => post('message', 'GETSCOPELOTINFO', `<LOTID>${lotId}</LOTID>`);
const save = (lotId) =>
  post(
    'message',
    'INPUTSCOPEDATA',
    `<FACTORYNAME>FAB1</FACTORYNAME><LOTID>${lotId}</LOTID><PROCESSOPERATIONNAME>102030</PROCESSOPERATIONNAME><MACHINENAME>SCOPE-01</MACHINENAME><LAYERID>PHOTO_01</LAYERID><SIDERINSE>1</SIDERINSE><WEE>2</WEE><LOGO>L</LOGO><SLOTLIST>01,02</SLOTLIST><FAULTCATEGORY>PARTICLE</FAULTCATEGORY><INPUTUSER>U</INPUTUSER>`,
  );

describe('Input scope data (hifos2 InputScopeDataActivity)', () => {
  it('serves the lot keys and the FAULTS.FAULT[].TYPEVALUE list', async () => {
    const result = await lotInfo('WA2409001');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.LOTNAME, 'WA2409001');
    assert.equal(result.MSGBODY.ISEXIST, 'N');
    for (const key of ['FACTORYNAME', 'PROCESSOPERATIONNAME', 'MACHINENAME', 'LAYERID']) {
      assert.ok(result.MSGBODY[key], key);
    }
    assert.ok(Array.isArray(result.MSGBODY.FAULTS.FAULT));
    assert.ok(result.MSGBODY.FAULTS.FAULT[0].TYPEVALUE);
  });

  it('reports ISEXIST=Y for EXIST lots and after a save', async () => {
    assert.equal((await lotInfo('LOT-EXIST')).MSGBODY.ISEXIST, 'Y');
    assert.equal((await lotInfo('LOT-FRESH')).MSGBODY.ISEXIST, 'N');
    assert.equal((await save('LOT-FRESH')).STATUS, 'PASS');
    assert.equal((await lotInfo('LOT-FRESH')).MSGBODY.ISEXIST, 'Y');
  });

  it('fails for an unknown lot, an empty lot and a SAVEFAIL lot', async () => {
    const missing = await lotInfo('LOT-ERR');
    assert.equal(missing.STATUS, 'FAIL');
    assert.ok(missing.ERRMSG);
    assert.equal((await lotInfo('')).STATUS, 'FAIL');
    assert.equal((await save('LOT-SAVEFAIL')).STATUS, 'FAIL');
  });
});
