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

async function getEdcData(lotId) {
  const response = await fetch(`${baseUrl}/hifos/getEdcData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGBODY><LOTID>${lotId}</LOTID></MSGBODY></AIFMSG>`,
    }),
  });
  return JSON.parse((await response.json()).result);
}

describe('GETEDCDATA message', () => {
  it('returns THICK data in the legacy MSGBODY.ITEMS.ITEM shape', async () => {
    const result = await getEdcData('LOT-DEMO-01');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PROCESSTYPE, 'THICK');
    assert.equal(result.MSGBODY.ITEMS.ITEM[0].VALUE9, '1.31');
  });

  it('returns the OVERLAY process-specific row fields', async () => {
    const result = await getEdcData('LOT-EDC-OVERLAY-01');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PROCESSTYPE, 'OVERLAY');
    assert.equal(result.MSGBODY.ITEMS.ITEM[0].RANGEX, '0.31');
    assert.equal(result.MSGBODY.ITEMS.ITEM[0].VALUE19, '0.01');
  });

  it('preserves a successful empty result', async () => {
    const result = await getEdcData('LOT-EDC-EMPTY-01');
    assert.equal(result.STATUS, 'PASS');
    assert.deepEqual(result.MSGBODY.ITEMS.ITEM, []);
  });

  it('restores EDC fixture data after mock reset', async () => {
    const reset = await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
    assert.equal(reset.status, 200);

    const result = await getEdcData('LOT-DEMO-01');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PROCESSTYPE, 'THICK');
  });

  it('returns the legacy failure envelope for an unknown LOT', async () => {
    const result = await getEdcData('LOT-EDC-UNKNOWN');
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, 'EDC DATA 조회에 실패하였습니다.');
  });
});
