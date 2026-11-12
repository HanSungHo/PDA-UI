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

// Remote Furnace KEC posts a raw <BODY> XML with a MESSAGENAME header and reads the JSON text.
async function postRawXml(name, body) {
  const response = await fetch(`${baseUrl}/hifos/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml', MESSAGENAME: name, ORIGIN: 'P', ACK: 'YES' },
    body: `<BODY>${body}</BODY>`,
  });
  assert.equal(response.status, 200);
  return JSON.parse(await response.text());
}

const machineBody = (machine) =>
  `<MACHINENAME>${machine}</MACHINENAME><BATCHID>B</BATCHID><RECIPENAME>R</RECIPENAME><LOTLIST>L</LOTLIST>`;
const portBody = (eqp, port) =>
  `<EQPID>${eqp}</EQPID><PORTNAME>${port}</PORTNAME><LOTID>L1</LOTID><RECIPE>R</RECIPE>`;

describe('Remote furnace / IMP / RAM (hifos2 Remote*Activity)', () => {
  it('FURNACEDUMMYRCP returns a recipe list, or fails for NORECIPE machines', async () => {
    const ok = await post('furnacedummyrcp', 'FURNACEDUMMYRCP', '<MACHINENAME>FUR-1</MACHINENAME>');
    assert.ok(ok.MSGBODY.RECIPE.split(',').length > 1);
    const none = await post(
      'furnacedummyrcp',
      'FURNACEDUMMYRCP',
      '<MACHINENAME>FUR-NORECIPE</MACHINENAME>',
    );
    assert.equal(none.STATUS, 'FAIL');
  });

  it('FURNACEINTLKCHECK reports RET and INTLK', async () => {
    const check = async (machine) =>
      (await post('furnaceintlkcheck', 'FURNACEINTLKCHECK', machineBody(machine))).MSGBODY;
    assert.deepEqual(await check('FUR-1'), { RET: '', INTLK: 'N' });
    assert.equal((await check('FUR-INTLK')).INTLK, 'Y');
  });

  it('start messages pass and fail for FAIL machines (furnace, KEC underscore name, IMP)', async () => {
    const start = (route, name, machine) => post(route, name, machineBody(machine));
    assert.equal((await start('furnaceremotestart', 'FURNACEREMOTESTART', 'FUR-1')).STATUS, 'PASS');
    assert.equal(
      (await start('furnaceremotestart', 'FURNACEREMOTESTART', 'FUR-FAIL')).STATUS,
      'FAIL',
    );
    assert.equal(
      (await start('furnaceremotestart_kec', 'FURNACEREMOTESTART_KEC', 'FUR-1')).STATUS,
      'PASS',
    );
    assert.equal((await start('impremotestart', 'IMPREMOTESTART', 'IMP-1')).STATUS, 'PASS');
    assert.equal((await start('impremotestart', 'IMPREMOTESTART', 'IMP-FAIL')).STATUS, 'FAIL');
  });

  it('MACHINEPORTSTATUS_KJ covers idle, run, batch counts, empty and failure', async () => {
    const port = (eqp, name) =>
      post('machineportstatus_kj', 'MACHINEPORTSTATUS_KJ', portBody(eqp, name));
    assert.deepEqual((await port('E', 'P1')).MSGBODY, {
      PORTSTATENAME1: 'IDLE',
      PORTLOTNAME: '',
      BATCH_CNT: '0',
      EXIST_BATCH: '0',
      ACKMSG: '',
    });
    assert.equal((await port('E', 'P-RUN')).MSGBODY.PORTSTATENAME1, 'RUN');
    assert.equal((await port('E', 'P-BATCH1')).MSGBODY.EXIST_BATCH, '1');
    assert.equal((await port('E', 'P-BATCH2')).MSGBODY.BATCH_CNT, '2');
    assert.equal((await port('E', 'P-EMPTY')).MSGBODY.PORTSTATENAME1, '');
    assert.equal((await port('E-PORTERR', 'P1')).STATUS, 'FAIL');
  });

  it('RAMJOBCANCEL returns RET 0 on success', async () => {
    const cancel = (machine) =>
      post(
        'ramjobcancel',
        'RAMJOBCANCEL',
        `<MACHINETYPE>RAM</MACHINETYPE><MACHINENAME>${machine}</MACHINENAME><EVENTUSER>U</EVENTUSER><JOBNAME1>J</JOBNAME1>`,
      );
    assert.equal((await cancel('RAM-1')).MSGBODY.RET, '0');
    assert.equal((await cancel('RAM-RETFAIL')).MSGBODY.RET, '1');
    assert.equal((await cancel('RAM-FAIL')).STATUS, 'FAIL');
  });

  it('serves the KEC raw-XML contract with the handler JSON text', async () => {
    const dummy = await postRawXml('FURNACEDUMMYRCP', '<MACHINENAME>FUR-1</MACHINENAME>');
    assert.equal(dummy.STATUS, 'PASS');
    assert.ok(dummy.MSGBODY.RECIPE);
    const port = await postRawXml('MACHINEPORTSTATUS_KJ', portBody('E', 'P1'));
    assert.equal(port.MSGBODY.PORTSTATENAME1, 'IDLE');
    const failed = await postRawXml('FURNACEREMOTESTART_KEC', machineBody('FUR-FAIL'));
    assert.equal(failed.STATUS, 'FAIL');
  });
});

describe('Remote Furnace KJ (hifos2 RemoteFurnaceKjActivity)', () => {
  it('serves the KJ LOT, its batch, the KJ furnace and the KJ start', async () => {
    const lot = await post('lotinfo', 'LOTINFO', '<LOTID>LOT-KJ-001</LOTID><TYPE>MVIN</TYPE>');
    assert.equal(lot.MSGBODY.BATCHID, 'BAT-KJ-01');
    const ext = await post('lotinfo', 'LOTINFO', '<LOTID>LOT-KJ-EXT</LOTID><TYPE>MVIN</TYPE>');
    assert.equal(ext.MSGBODY.OXMACHINE, 'KJ-EXT-01');
    const batch = await post('batchlistbylot', 'BATCHLISTBYLOT', '<LOTID>LOT-KJ-001</LOTID>');
    assert.deepEqual(
      batch.MSGBODY.BATCHITEMS.map((item) => item.LOTID),
      ['LOT-KJ-001', 'LOT-KJ-EXT'],
    );
    const eqp = await post('remoteeqpinfo', 'REMOTEEQPINFO', '<EQPID>KJ-01</EQPID>');
    assert.equal(eqp.MSGBODY.FURNACE, 'KJ');
    const start = await post(
      'furnaceremotestart_kj',
      'FURNACEREMOTESTART_KJ',
      '<MACHINENAME>KJ-01</MACHINENAME><CMDTYPE>S</CMDTYPE>',
    );
    assert.equal(start.STATUS, 'PASS');
  });
});
