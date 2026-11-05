import assert from 'node:assert/strict';
import { after, before, beforeEach, it } from 'node:test';

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

beforeEach(async () => {
  await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
});

async function send(endpoint, name, fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('\n');
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

const stockers = (items) =>
  items
    .map(
      ([lotId, stocker]) =>
        `<ITEM>\n<LOTID>${lotId}</LOTID>\n<STOCKER>${stocker}</STOCKER>\n</ITEM>`,
    )
    .join('');

const lotIds = (result) => result.MSGBODY.BLSTITEMS.ITEM.map((item) => item.LOTID);

it('serves BAYS and STOCKERS in the Android ITEM list shape', async () => {
  const bays = await send('AREABAYINFO', 'AREABAYINFO', { AREA: 'AREA', FACILITY: 'FAB' });
  assert.equal(bays.STATUS, 'PASS');
  assert.deepEqual(
    bays.MSGBODY.BAYS.map((item) => item.BAY),
    ['BAY-A', 'BAY-B', 'BAY-01'],
  );

  // A configured Setting location keeps its own bay list.
  const settingBays = await send('AREABAYINFO', 'AREABAYINFO', { AREA: 'PHOTO', FACILITY: 'GUMI' });
  assert.deepEqual(settingBays.MSGBODY.BAYS, [{ BAY: 'P01' }, { BAY: 'P02' }]);

  const stk = await send('BAYSTOCKERINFO', 'BAYSTOCKERINFO', { BAY: 'BAY-A', FACILITY: 'FAB' });
  assert.deepEqual(stk.MSGBODY.STOCKERS.ITEM, [{ STOCKER: 'STK-A' }, { STOCKER: 'STK-B' }]);
  // Move Out still reads the indexed keys.
  assert.equal(stk.MSGBODY.STOCKER0, 'STK-A');
});

it('filters BLSTINFO by BAY, STOCKER (모두 = all) and JOBCODE', async () => {
  const all = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: '모두',
    JOBCODE: '',
    FACILITY: 'FAB',
  });
  assert.equal(all.STATUS, 'PASS');
  assert.equal(lotIds(all).length, 8);
  assert.deepEqual(Object.keys(all.MSGBODY.BLSTITEMS.ITEM[0]).sort(), [
    'BAY',
    'JOBCODE',
    'LOCATION',
    'LOC_TYPE',
    'LOTID',
    'PROCESSSTEP',
    'QUANTITY',
  ]);

  const byStocker = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: 'STK-B',
    JOBCODE: '',
    FACILITY: 'FAB',
  });
  assert.deepEqual(lotIds(byStocker), ['LOT-A003', 'LOT-A005', 'LOT-FAIL01']);

  const byJob = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: '모두',
    JOBCODE: 'J200',
    FACILITY: 'FAB',
  });
  assert.deepEqual(lotIds(byJob), ['LOT-A003', 'LOT-A004']);

  const empty = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-B',
    STOCKER: '모두',
    JOBCODE: 'NONE',
    FACILITY: 'FAB',
  });
  assert.deepEqual(empty.MSGBODY.BLSTITEMS.ITEM, []);

  const failed = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: '모두',
    JOBCODE: 'FAIL',
    FACILITY: 'FAB',
  });
  assert.equal(failed.STATUS, 'FAIL');
  assert.equal(failed.ERRMSG, 'JOB [FAIL] 조회에 실패하였습니다.');
});

it('moves stocker LOTs to the requested port with STOCKOUT and rejects invalid rows', async () => {
  const out = await send('STOCKOUT', 'STOCKOUT', {
    FACILITY: 'FAB',
    PORT: '2OUT',
    ROWNO: '2',
    STOCKERS: stockers([
      ['LOT-A001', 'STK-A'],
      ['LOT-A002', 'STK-A'],
    ]),
  });
  assert.equal(out.STATUS, 'PASS');

  const after = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: '모두',
    JOBCODE: 'J100',
    FACILITY: 'FAB',
  });
  assert.deepEqual(
    after.MSGBODY.BLSTITEMS.ITEM.map(({ LOCATION, LOC_TYPE }) => [LOCATION, LOC_TYPE]),
    [
      ['STK-A-2OUT', 'P'],
      ['STK-A-2OUT', 'P'],
    ],
  );

  for (const [fields, message] of [
    [
      { ROWNO: '1', STOCKERS: stockers([['LOT-A004', 'EQP-ETCH01']]) },
      'LOT NO [LOT-A004]는 STOCKER내에 있지 않습니다',
    ],
    [
      { ROWNO: '1', STOCKERS: stockers([['LOT-NONE', 'STK-A']]) },
      'LOT NO [LOT-NONE]가 존재하지 않습니다.',
    ],
    [
      { ROWNO: '1', STOCKERS: stockers([['LOT-FAIL01', 'STK-B']]) },
      'LOT NO [LOT-FAIL01] 출고에 실패하였습니다.',
    ],
    [
      { ROWNO: '2', STOCKERS: stockers([['LOT-A003', 'STK-B']]) },
      'ROWNO가 STOCKERS와 일치하지 않습니다.',
    ],
  ]) {
    const result = await send('STOCKOUT', 'STOCKOUT', { FACILITY: 'FAB', PORT: 'OUT', ...fields });
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, message);
  }

  // A failed request leaves every LOT in its stocker.
  const untouched = await send('BLSTINFO', 'BLSTINFO', {
    BAY: 'BAY-A',
    STOCKER: 'STK-B',
    JOBCODE: '',
    FACILITY: 'FAB',
  });
  assert.deepEqual(lotIds(untouched), ['LOT-A003', 'LOT-A005', 'LOT-FAIL01']);
});
