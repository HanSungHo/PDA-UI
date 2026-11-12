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

const q = (name, tags) => post(name, tags);

describe('Move In (hifos2 MoveInActivity)', () => {
  it('MCFDCEQPINFO distinguishes Local, Remote and unknown equipment', async () => {
    assert.equal((await q('MCFDCEQPINFO', '<EQPID>EQP-1</EQPID>')).MSGBODY.STATUS, 'Local');
    assert.equal((await q('MCFDCEQPINFO', '<EQPID>EQP-REMOTE</EQPID>')).MSGBODY.STATUS, 'Remote');
    const missing = await q('MCFDCEQPINFO', '<EQPID>EQP-NOTFOUND</EQPID>');
    assert.equal(missing.STATUS, 'FAIL');
    assert.ok(missing.ERRMSG);
  });

  it('EQPINFO returns MAINEQPID/SUBEQPID and an interlock text on demand', async () => {
    const plain = (
      await q('EQPINFO', '<EQPID>EQP-1</EQPID><MOVEIN>MOVEIN</MOVEIN><LOTID>L</LOTID>')
    ).MSGBODY;
    assert.equal(plain.MAINEQPID, 'EQP-1');
    assert.equal(plain.SUBEQPID, 'EQP-1');
    assert.equal(plain.CHECKINTERLOCK, '');
    const sub = (await q('EQPINFO', '<EQPID>EQP-SUB</EQPID>')).MSGBODY;
    assert.notEqual(sub.SUBEQPID, sub.MAINEQPID);
    assert.notEqual(
      (await q('EQPINFO', '<EQPID>EQP-INTERLOCK</EQPID>')).MSGBODY.CHECKINTERLOCK,
      '',
    );
  });

  it('CHECKDICYCLE reports DICYCLE Y only for DICYCLE lots', async () => {
    assert.equal((await q('CHECKDICYCLE', '<LOTID>LOT-DICYCLE</LOTID>')).MSGBODY.DICYCLE, 'Y');
    assert.equal((await q('CHECKDICYCLE', '<LOTID>LOT-1</LOTID>')).MSGBODY.DICYCLE, 'N');
  });

  it('MOVEIN succeeds, fails, and fails with the -1 transaction error', async () => {
    assert.equal((await q('MOVEIN', '<LOTID>LOT-1</LOTID>')).STATUS, 'PASS');
    assert.equal((await q('MOVEIN', '<LOTID>LOT-MVINFAIL</LOTID>')).STATUS, 'FAIL');
    assert.equal((await q('MOVEIN', '<LOTID>LOT-MVINTRANS</LOTID>')).ERRMSG, '-1');
  });

  it('LOTINFOEND returns MVINMSG/MVINACTION', async () => {
    assert.equal((await q('LOTINFOEND', '<LOTID>LOT-1</LOTID>')).MSGBODY.MVINMSG, '');
    assert.notEqual((await q('LOTINFOEND', '<LOTID>LOT-MVINMSG</LOTID>')).MSGBODY.MVINMSG, '');
  });

  it('PROBECARDINFO / PROBECARDVALUE cover the usable, bad and last-probe cases', async () => {
    const ok = (await q('PROBECARDINFO', '<PROBECARD>PC1</PROBECARD><MACHINE>E</MACHINE>')).MSGBODY;
    assert.equal(ok.PROBECARDSTATUS, 'Y');
    assert.ok(ok.PROBECARDNO);
    assert.equal(
      (await q('PROBECARDINFO', '<PROBECARD>PC-LAST</PROBECARD>')).MSGBODY.CHECKLASTPROBE,
      'Y',
    );
    const bad = (await q('PROBECARDINFO', '<PROBECARD>PC-BAD</PROBECARD>')).MSGBODY;
    assert.equal(bad.PROBECARDSTATUS, 'N');
    assert.ok(bad.PROBECARDMSG);
    const value = (
      await q(
        'PROBECARDVALUE',
        '<PROBECARD>PC1</PROBECARD><PRODUCT>P</PRODUCT><MACHINE>E</MACHINE>',
      )
    ).MSGBODY;
    assert.ok(value.VALUE_OD && value.VALUE_Z);
  });

  it('serves the Vue move-in demo LOTs through LOTINFO', async () => {
    const batch = await q(
      'LOTINFO',
      '<LOTID>LOT-DEMO-BATCH</LOTID><FACILITY>F</FACILITY><TYPE>MVIN</TYPE><OPERATORID>U</OPERATORID>',
    );
    assert.equal(batch.MSGBODY.BATCHID, 'BAT-A260915-001');
    const auto = await q(
      'LOTINFO',
      '<LOTID>LOT-DEMO-AUTOMOTIVE</LOTID><FACILITY>F</FACILITY><TYPE>MVIN</TYPE><OPERATORID>U</OPERATORID>',
    );
    assert.equal(auto.MSGBODY.AUTOMOTIVEFLAG, 'Y');
  });
  it('BATCHLISTBYLOT lists the Move In batch of LOT-DEMO-BATCH with NWCOMMENTQTY', async () => {
    const body = (
      await q(
        'BATCHLISTBYLOT',
        '<LOTID>LOT-DEMO-BATCH</LOTID><FACILITY>KFAB</FACILITY><STATUS>RCP-DEMO-01</STATUS>',
      )
    ).MSGBODY;
    assert.equal(body.BATCHID, 'BAT-A260915-001');
    assert.equal(body.NWCOMMENTQTY, '0');
    assert.deepEqual(
      body.BATCHITEMS.map((item) => [item.LOTID, item.STATUS, item.PROCESSNAME]),
      [
        ['LOT-DEMO-BATCH', 'WAIT', ''],
        ['LOT-A260915-019', 'WAIT', ''],
        ['LOT-MW-TEST', 'WAIT', 'MW_TEST'],
      ],
    );
  });
  it('MEASUREINFO lists the measure rows, MEASDONE ends the inquiry and MEASURESET returns the recipe', async () => {
    const info = (await q('MEASUREINFO', '<LOTID>WP-MEASURE</LOTID><OPERATION>P00002</OPERATION>'))
      .MSGBODY;
    assert.equal(info.PROCESSSTEP, 'VI');
    assert.deepEqual(
      info.MEASUREITEMS.MEASUREITEM.map((row) => [row.SUBOPERATION, row.ISCOMPLETE]),
      [
        ['CD', 'N'],
        ['OV', 'Y'],
        ['TH', 'N'],
      ],
    );
    const done = await q('MEASUREINFO', '<LOTID>WP-MEASDONE</LOTID>');
    assert.equal(done.STATUS, 'FAIL');
    assert.match(done.ERRMSG, /검색한 MEASURE/);
    const set = await q('MEASURESET', '<LOTID>WP-MEASURE</LOTID><SUBOPERATION>CD</SUBOPERATION>');
    assert.equal(set.MSGBODY.RECIPE, 'RCP-MEASURE-01');
    assert.equal(
      (await q('MEASURESET', '<LOTID>WP-MSETFAIL</LOTID><SUBOPERATION>CD</SUBOPERATION>')).STATUS,
      'FAIL',
    );
    const di = (await q('CHECKDICYCLE', '<LOTID>WP-MEASURE-DICYCLE</LOTID>')).MSGBODY;
    assert.deepEqual(di.ITEMS, [{ PHOTOOPERTYPE: 'CD' }, { PHOTOOPERTYPE: 'OVER' }]);
  });
});
