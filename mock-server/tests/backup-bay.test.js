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

// hifos2 sends these through MessageName.MESSAGE (/hifos/message) and reads JSON.
async function post(name, body = '') {
  const response = await fetch(`${baseUrl}/hifos/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

describe('Backup bay (hifos2 BackupBayDialogActivity)', () => {
  it('lists floors and the bays of a floor in FABS.ITEM', async () => {
    const floors = await post('GETFLOORDATA');
    assert.deepEqual(
      floors.MSGBODY.FABS.ITEM.map((item) => item.FLOOR),
      ['1F', '2F', '3F'],
    );
    const bays = await post('GETBAYDATA', '<FLOOR>2F</FLOOR>');
    assert.deepEqual(
      bays.MSGBODY.FABS.ITEM.map((item) => item.AREANAME),
      ['BAY-B01', 'BAY-B02', 'BAY-B03', 'BAY-B04'],
    );
    assert.equal((await post('GETBAYDATA', '<FLOOR>9F</FLOOR>')).STATUS, 'FAIL');
  });

  it('GETPROCESSFACTORYLOT covers wait, run, on hold, not released and not found', async () => {
    const lot = async (id) => post('GETPROCESSFACTORYLOT', `<LOTID>${id}</LOTID>`);
    assert.equal((await lot('WA2409001')).MSGBODY.LOTPROCESSSTATE, 'WAIT');
    assert.equal((await lot('WA2409002')).MSGBODY.LOTPROCESSSTATE, 'RUN');
    assert.equal((await lot('WA2409003')).MSGBODY.LOTHOLDSTATE, 'OnHold');
    assert.equal((await lot('WA2409004')).MSGBODY.LOTSTATE, 'Created');
    assert.equal((await lot('ANY-LOT')).MSGBODY.LOTSTATE, 'Released');
    assert.equal((await lot('LOT-NOTFOUND')).STATUS, 'FAIL');
  });

  it('INFACTORY counts the filled CHANGEFACTORY rows and can fail', async () => {
    const ok = await post(
      'INFACTORY',
      '<CHANGEFACTORY0>A|BAY-A01|U</CHANGEFACTORY0><CHANGEFACTORY1>B|BAY-A02|U</CHANGEFACTORY1><CHANGEFACTORY2></CHANGEFACTORY2>',
    );
    assert.equal(ok.MSGBODY.SUCCESSLOT, '2');
    assert.equal(
      (await post('INFACTORY', '<CHANGEFACTORY0>INFAIL|BAY-A01|U</CHANGEFACTORY0>')).STATUS,
      'FAIL',
    );
  });
});
