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
  if (!server) return;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

async function postMessage(routeName, messageName, fields) {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('');
  const response = await fetch(`${baseUrl}/hifos/${routeName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });

  return { response, result: JSON.parse((await response.json()).result) };
}

describe('Wafercodecheck mock messages', () => {
  it('returns GETWAFERTYPE items and legacy reason options', async () => {
    const { response, result } = await postMessage('getWaferTYpe', 'GETWAFERTYPE', {
      LOTNAME: 'RUN-DEMO-01',
    });

    assert.equal(response.status, 200);
    assert.equal(result.STATUS, 'PASS');
    assert.deepEqual(result.MSGBODY.ITEMS.ITEM, [
      { LOTNAME: 'LOT-WAFER-01', WAFERTYPE: 'SILICON-200MM' },
    ]);
    assert.deepEqual(result.MSGBODY.COMMNETLIST.ITEM, [
      { TYPEVALUE: 'NORMAL' },
      { TYPEVALUE: 'MATERIAL CHANGE' },
    ]);
  });

  it('returns a business failure for an unknown RUN and an empty successful result fixture', async () => {
    const failed = await postMessage('getWaferTYpe', 'GETWAFERTYPE', {
      LOTNAME: 'RUN-FAIL',
    });
    assert.equal(failed.result.STATUS, 'FAIL');
    assert.equal(failed.result.ERRMSG, 'RUN NAME을 찾을 수 없습니다.');

    const empty = await postMessage('getWaferTYpe', 'GETWAFERTYPE', {
      LOTNAME: 'RUN-EMPTY-01',
    });
    assert.equal(empty.result.STATUS, 'PASS');
    assert.deepEqual(empty.result.MSGBODY.ITEMS.ITEM, []);
  });

  it('returns compare success or NG based on the resolved LOTNAME', async () => {
    const success = await postMessage('ComPareWaferType', 'COMPAREWAFERTYPE', {
      LOTNAME: 'LOT-WAFER-01',
      WAFERTYPE: 'SILICON-200MM',
      INITIALBOXNAME: 'INITIAL-01',
      COMMENT: 'NORMAL',
      USERID: 'OPERATOR-01',
    });
    assert.equal(success.result.STATUS, 'PASS');
    assert.equal(success.result.MSGBODY.COMPARERESULT, 'OK');

    const failure = await postMessage('ComPareWaferType', 'COMPAREWAFERTYPE', {
      LOTNAME: 'LOT-WAFER-NG-01',
      WAFERTYPE: 'SILICON-300MM',
      INITIALBOXNAME: '',
      COMMENT: '',
      USERID: 'OPERATOR-01',
    });
    assert.equal(failure.result.STATUS, 'PASS');
    assert.equal(failure.result.MSGBODY.COMPARERESULT, 'NG');
  });
});
