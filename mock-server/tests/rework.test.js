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

async function post(name, body) {
  const response = await fetch(`${baseUrl}/hifos/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

const info = (lotId) => post('REWORKINFO', `<LOTID>${lotId}</LOTID><FACILITY>GUMI</FACILITY>`);
const rework = (lotId, code = 'RW01') =>
  post(
    'REWORK',
    `<LOTID>${lotId}</LOTID><FACILITY>GUMI</FACILITY><EQPID>E</EQPID><REWORKCODE>${code}</REWORKCODE><COMMENT></COMMENT><OPERATORID>U</OPERATORID><OPERATION>OP10</OPERATION><SUBOPERATION>00</SUBOPERATION><ISCARRY>N</ISCARRY><BAY></BAY><STOCKER></STOCKER><QUANTITY>25</QUANTITY>`,
  );

describe('Rework (hifos2 ReworkActivity)', () => {
  it('serves the keys the legacy Activity reads, WIP and not on hold', async () => {
    const result = await info('LOT-1');
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.STATE, 'WIP');
    assert.equal(result.MSGBODY.HOLDSTATUS, 'NONE');
    for (const key of [
      'PRODUCT',
      'OPERATION',
      'SUBOPERATION',
      'PROCESSSTEP',
      'EQPID',
      'STATUS',
      'QUANTITY',
    ]) {
      assert.equal(typeof result.MSGBODY[key], 'string', key);
    }
    assert.ok(result.MSGBODY.REWORKITEMS.ITEM.length > 0);
    assert.ok(result.MSGBODY.REWORKITEMS.ITEM[0].REWORKCODE);
  });

  it('covers the Activity guards: not WIP, on hold, no codes, not found', async () => {
    assert.equal((await info('LOT-NOTWIP')).MSGBODY.STATE, 'WAIT');
    assert.equal((await info('LOT-HOLD')).MSGBODY.HOLDSTATUS, 'ONHOLD');
    assert.equal((await info('LOT-NOCODE')).MSGBODY.REWORKITEMS.ITEM.length, 0);
    const missing = await info('LOT-NOTFOUND');
    assert.equal(missing.STATUS, 'FAIL');
    assert.ok(missing.ERRMSG);
    assert.equal((await info('')).STATUS, 'FAIL');
  });

  it('executes rework, and fails for REWORKFAIL lots and a missing code', async () => {
    assert.equal((await rework('LOT-1')).STATUS, 'PASS');
    assert.equal((await rework('LOT-REWORKFAIL')).STATUS, 'FAIL');
    assert.equal((await rework('LOT-1', '')).STATUS, 'FAIL');
  });

  it('serves the shared bay and stocker lists in the BAYS/STOCKERS ITEM shape', async () => {
    const bays = await post('AREABAYINFO', '<FACILITY>GUMI</FACILITY>');
    assert.equal(bays.STATUS, 'PASS');
    assert.ok(bays.MSGBODY.BAYS.ITEM[0].BAY);
    const stockers = await post(
      'BAYSTOCKERINFO',
      `<BAY>${bays.MSGBODY.BAYS.ITEM[0].BAY}</BAY><FACILITY>GUMI</FACILITY>`,
    );
    assert.equal(stockers.STATUS, 'PASS');
    assert.ok(Array.isArray(stockers.MSGBODY.STOCKERS.ITEM));
  });
});
