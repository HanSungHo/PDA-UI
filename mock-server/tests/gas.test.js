import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { createStore } from '../src/data/store.js';
import { createMessageRegistry } from '../src/messages/registry.js';

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

describe('Gas mock messages', () => {
  it('returns GETCABINETINFO for a TYPE=N cabinet', async () => {
    const { response, result } = await postMessage('GetCabinetInfo', 'GETCABINETINFO', {
      CABINETNAME: 'gas-cab-01',
    });
    assert.equal(response.status, 200);
    assert.equal(result.STATUS, 'PASS');
    assert.deepEqual(result.MSGBODY.ITEMS.ITEM, [{ CABINET: 'GAS-CAB-01', GAS: 'N2', TYPE: 'N' }]);
    assert.equal(result.MSGBODY.PRESSURE, '5.2');
  });

  it('returns GETCABINETINFO for a TYPE=Y cabinet with weight and USAGES', async () => {
    const { result } = await postMessage('GetCabinetInfo', 'GETCABINETINFO', {
      CABINETNAME: 'GAS-CAB-02',
    });
    assert.equal(result.MSGBODY.ITEMS.ITEM[0].TYPE, 'Y');
    assert.equal(result.MSGBODY.WEIGHT, '41.7');
    assert.equal(result.MSGBODY.USAGES.ITEM.length, 1);
  });

  it('returns a failure for an unknown cabinet and empty ITEMS for the empty fixture', async () => {
    const failed = await postMessage('GetCabinetInfo', 'GETCABINETINFO', {
      CABINETNAME: 'NOPE',
    });
    assert.equal(failed.result.STATUS, 'FAIL');
    const empty = await postMessage('GetCabinetInfo', 'GETCABINETINFO', {
      CABINETNAME: 'GAS-CAB-EMPTY',
    });
    assert.equal(empty.result.STATUS, 'PASS');
    assert.deepEqual(empty.result.MSGBODY.ITEMS.ITEM, []);
  });

  it('accepts SETGASUSAGE with the Gas payload and no EVENT_TYPE', async () => {
    const { response, result } = await postMessage('SetGasusage', 'SETGASUSAGE', {
      CABINETNAME: 'GAS-CAB-02',
      USERID: 'OPERATOR-01',
      PRESSURE: '3.0',
      WEIGHT: '40.1',
      COMMENT: 'note',
    });
    assert.equal(response.status, 200);
    assert.equal(result.STATUS, 'PASS');
  });

  it('accepts SETGASUSAGE with an empty WEIGHT (weight row hidden)', async () => {
    const { result } = await postMessage('SetGasusage', 'SETGASUSAGE', {
      CABINETNAME: 'GAS-CAB-01',
      USERID: 'OPERATOR-01',
      PRESSURE: '5.0',
      WEIGHT: '',
      COMMENT: '',
    });
    assert.equal(result.STATUS, 'PASS');
  });

  it('fails SETGASUSAGE for an unknown cabinet', async () => {
    const { result } = await postMessage('SetGasusage', 'SETGASUSAGE', {
      CABINETNAME: 'NOPE',
      USERID: 'OPERATOR-01',
      PRESSURE: '1',
      WEIGHT: '',
      COMMENT: '',
    });
    assert.equal(result.STATUS, 'FAIL');
  });

  it('keeps interlock SETGASUSAGE dispatch intact', async () => {
    const pass = await postMessage('SetGasusage', 'SETGASUSAGE', {
      EVENT_TYPE: 'EQPSPC',
      USER_CONFIRM: 'Y',
    });
    assert.equal(pass.result.STATUS, 'PASS');
    const bad = await postMessage('SetGasusage', 'SETGASUSAGE', { EVENT_TYPE: 'UNKNOWN' });
    assert.equal(bad.result.STATUS, 'FAIL');
    assert.equal(bad.result.ERRMSG, 'Unsupported interlock confirmation.');
  });
});

describe('Gas mock request recording', () => {
  it('records the exact GETCABINETINFO and SETGASUSAGE payloads', () => {
    const store = createStore();
    const registry = createMessageRegistry(store);
    registry.handle('GETCABINETINFO', { CABINETNAME: 'GAS-CAB-02' });
    registry.handle('SETGASUSAGE', {
      CABINETNAME: 'GAS-CAB-01',
      USERID: 'OP-1',
      PRESSURE: '5.0',
      WEIGHT: '',
      COMMENT: 'c',
    });
    assert.deepEqual(store.getGasRequests(), [
      { MSGNAME: 'GETCABINETINFO', CABINETNAME: 'GAS-CAB-02' },
      {
        MSGNAME: 'SETGASUSAGE',
        CABINETNAME: 'GAS-CAB-01',
        USERID: 'OP-1',
        PRESSURE: '5.0',
        WEIGHT: '',
        COMMENT: 'c',
      },
    ]);
  });
});
