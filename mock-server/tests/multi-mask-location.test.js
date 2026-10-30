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
  await new Promise((resolve) => server.close(resolve));
});

async function post(route, messageName, fields) {
  const response = await fetch(`${baseUrl}/hifos/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${Object.entries(fields)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join('')}</MSGBODY></AIFMSG>`,
    }),
  });
  return { status: response.status, body: await response.json() };
}

async function send(route, messageName, fields) {
  const { status, body } = await post(route, messageName, fields);
  assert.equal(status, 200);
  return JSON.parse(body.result);
}

describe('Multi mask location mock API', () => {
  it('serves the dependent status, location group and detail location lists', async () => {
    const statuses = await send('maskstatusinfo', 'MASKSTATUSINFO', { FACILITY: 'GUMI' });
    assert.deepEqual(
      statuses.MSGBODY.STATUSES.ITEM.map((item) => item.STATUS),
      ['STOCK', 'INUSE', 'CLEAN', 'READY', 'EMPTY'],
    );

    const groups = await send('masklocgroupinfo', 'MASKLOCGROUPINFO', {
      STATUS: 'STOCK',
      FLOOR: '2F',
      FACILITY: 'GUMI',
    });
    assert.deepEqual(
      groups.MSGBODY.LOCGROUPS.ITEM.map((item) => item.LOCGROUP),
      ['STOCKER-A', 'STOCKER-B'],
    );

    // Android sends MASKLOCATIONINFO through the masklocgroupinfo route.
    const locations = await send('masklocgroupinfo', 'MASKLOCATIONINFO', {
      STATUS: 'STOCK',
      LOCGROUP: 'STOCKER-A',
      FLOOR: '2F',
      FACILITY: 'GUMI',
    });
    assert.deepEqual(
      locations.MSGBODY.LOCATIONS.ITEM.map((item) => item.LOCATION),
      ['A-01', 'A-02'],
    );
  });

  it('returns single-mask MASKINFO fields without ID_IDENT and keeps the eSheet list shape', async () => {
    const single = await send('maskinfo', 'MASKINFO', { RETICLEID: 'RT-0001', FACILITY: 'GUMI' });
    assert.equal(single.STATUS, 'PASS');
    assert.equal(single.MSGBODY.RETICLETAG, 'MASK-0001');
    assert.equal(single.MSGBODY.CURRLOC, 'STOCKER-A');

    const missing = await send('maskinfo', 'MASKINFO', { RETICLEID: 'RT-NONE', FACILITY: 'GUMI' });
    assert.equal(missing.STATUS, 'FAIL');

    const esheet = await send('maskinfo', 'MASKINFO', {
      ID_IDENT: 'T',
      RETICLEID: 'MASK-001',
      FACILITY: 'GUMI',
    });
    assert.equal(esheet.MSGBODY.ITEMS.ITEM[0].RETICLETAG, 'MASK-001');
  });

  it('changes the mask location through the checkpellicle route and fails the demo FAIL mask', async () => {
    const fields = {
      FACILITY: 'GUMI',
      LOCTYPE: 'MULTI',
      LOCATION: '',
      ETCSTATUS: 'CLEAN',
      ETCLOCATION: 'CLEAN-ROOM',
      ETCDETAILLOC: 'CR-01',
      SUBLOCATION3: '',
      OPERATORID: 'OPERATOR',
      FLOOR: '4F',
    };
    const changed = await send('checkpellicle', 'CHANGEMASKLOCATION', {
      RETICLEID: 'RT-0002',
      ...fields,
    });
    assert.equal(changed.STATUS, 'PASS');
    assert.equal(changed.MSGBODY.SCOUNT, '1');

    const after = await send('maskinfo', 'MASKINFO', { RETICLEID: 'RT-0002', FACILITY: 'GUMI' });
    assert.equal(after.MSGBODY.STATUS, 'CLEAN');
    assert.equal(after.MSGBODY.CURRLOC, 'CLEAN-ROOM');

    const failed = await send('checkpellicle', 'CHANGEMASKLOCATION', {
      RETICLEID: 'RT-FAIL',
      ...fields,
    });
    assert.equal(failed.STATUS, 'FAIL');
  });

  it('still rejects unrelated message names on an aliased route', async () => {
    const { status } = await post('checkpellicle', 'MASKSTATUSINFO', { FACILITY: 'GUMI' });
    assert.equal(status, 400);
  });
});
