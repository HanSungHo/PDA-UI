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

// route differs from MSGNAME for REMOTEEQPEENINFO (sent through MessageName.REMOTEEQPINFO).
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

describe('Remote machine select (hifos2 RemoteMachineSelectActivity)', () => {
  it('serves the PHOTO scenario LOTs through LOTINFO', async () => {
    const ready = (
      await post(
        'lotinfo',
        'LOTINFO',
        '<TYPE>MVIN</TYPE><LOTID>WP00001</LOTID><FACILITY>F</FACILITY>',
      )
    ).MSGBODY;
    assert.equal(ready.STATUS, 'WAIT');
    assert.equal(ready.AREA, 'PHOTO');
    assert.equal(ready.PHOTOTYPE, 'PH');
    const lotOf = async (id) =>
      (
        await post(
          'lotinfo',
          'LOTINFO',
          `<TYPE>MVIN</TYPE><LOTID>${id}</LOTID><FACILITY>F</FACILITY>`,
        )
      ).MSGBODY;
    assert.equal((await lotOf('WP-RUN')).STATUS, 'RUN');
    assert.equal((await lotOf('WP-HOLD')).HOLDSTATUS, 'ONHOLD');
    assert.match((await lotOf('WP-LARGE')).PRODUCT, /LONG-PRODUCT/);
  });

  it('REMOTEEQPINFO2 returns local and non-local tracks and rejects unknown machines', async () => {
    const info = (eqp) =>
      post(
        'remoteeqpinfo2',
        'REMOTEEQPINFO2',
        `<EQPID>${eqp}</EQPID><TYPE>MVIN</TYPE><LOTID>WP00001</LOTID><FACILITY>F</FACILITY><OPERATION>P</OPERATION><SUBOPERATION>00</SUBOPERATION>`,
      );
    assert.equal((await info('PHOTO01')).MSGBODY.ISLOCALTRACK, 'Y');
    assert.equal((await info('PHOTO02')).MSGBODY.ISLOCALTRACK, 'N');
    assert.equal((await info('PHOTO01')).MSGBODY.PORTNAME, 'P01,P02,P03');
    assert.equal((await info('UNKNOWN')).STATUS, 'FAIL');
  });

  it('REMOTEEQPEENINFO is accepted through the remoteeqpinfo route alias', async () => {
    const result = await post('remoteeqpinfo', 'REMOTEEQPEENINFO', '<EQPID>PHOTO01</EQPID>');
    assert.equal(result.STATUS, 'PASS');
  });

  it('MACHINEPORTSTATUS reports READY, RUN and IDLE for PHOTO ports', async () => {
    const port = async (name) =>
      await post(
        'machineportstatus',
        'MACHINEPORTSTATUS',
        `<EQPID>PHOTO01</EQPID><PORTNAME>${name}</PORTNAME>`,
      );
    assert.equal((await port('P01')).MSGBODY.PORTSTATENAME, 'READY');
    assert.equal((await port('P02')).MSGBODY.PORTSTATENAME, 'RUN');
    assert.equal((await port('P03')).MSGBODY.PORTSTATENAME, 'IDLE');
    assert.equal((await port('P99')).STATUS, 'FAIL');
  });

  it('PHOTO actions pass and fail for FAIL machines', async () => {
    assert.equal(
      (
        await post(
          'photolotreserve',
          'PHOTOLOTRESERVE',
          '<MACHINENAME>PHOTO01</MACHINENAME><PORTNAME>P01</PORTNAME><LOTNAME>WP00001</LOTNAME>',
        )
      ).STATUS,
      'PASS',
    );
    assert.equal(
      (
        await post(
          'photolotstart',
          'PHOTOLOTSTART',
          '<MACHINENAME>PHOTO01</MACHINENAME><LOTNAME>WP00001</LOTNAME>',
        )
      ).STATUS,
      'PASS',
    );
    assert.equal(
      (
        await post(
          'photochangeeqpstatus',
          'PHOTOCHANGEEQPSTATUS',
          '<MACHINENAME>PHOTO01</MACHINENAME>',
        )
      ).STATUS,
      'PASS',
    );
    assert.equal(
      (
        await post(
          'photolotstart',
          'PHOTOLOTSTART',
          '<MACHINENAME>PHOTO-FAIL</MACHINENAME><LOTNAME>X</LOTNAME>',
        )
      ).STATUS,
      'FAIL',
    );
  });
});
