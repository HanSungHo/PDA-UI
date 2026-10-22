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
  await new Promise((resolve) => server.close(resolve));
});
async function send(name, fields, endpoint = name.toLowerCase()) {
  const response = await fetch(`${baseUrl}/hifos/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${name}</MSGNAME><MSGBODY>${Object.entries(fields)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join('')}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}
describe('Shelf Incoming mock API', () => {
  it('handles SHELFCALL through the legacy generic endpoint and both categories', async () => {
    assert.equal(
      (await send('SHELFCALL', { SHELFNO: 'SHELF-01' }, 'message')).MSGBODY.CATEGORY,
      'S',
    );
    assert.equal(
      (await send('SHELFCALL', { SHELFNO: 'CART-01' }, 'message')).MSGBODY.CATEGORY,
      'C',
    );
    assert.equal((await send('SHELFCALL', { SHELFNO: 'BAD' }, 'message')).STATUS, 'FAIL');
  });
  it('returns metadata, reserved-LOT warning fields and ineligible LOT failures', async () => {
    assert.equal(
      (await send('CHECKINSHELFLOT', { LOTID: 'LOT-01', FACILITY: 'FAB' })).MSGBODY.PRODUCTSPECNAME,
      'PROD-DEMO',
    );
    assert.equal(
      (await send('CHECKINSHELFLOT', { LOTID: 'LOT-RESERVED' })).MSGBODY.MACHINENAME,
      'EQP-01',
    );
    assert.equal((await send('CHECKINSHELFLOT', { LOTID: 'BAD' })).STATUS, 'FAIL');
  });
  it('persists IN/OUT membership, partial errors and reset without mutating fixture defaults', () => {
    const store = createStore();
    const registry = createMessageRegistry(store);
    const fields = { SHELFNO: 'SHELF-01', USERID: 'USER', INSERTSHELFLOT: 'LOT-01|LOT-PARTIAL' };
    assert.equal(
      JSON.parse(registry.handle('LOTINSHELF', fields).result).MSGBODY.ERRORLOT,
      'LOT-PARTIAL',
    );
    assert.deepEqual(store.getShelfIncoming('SHELF-01').lots, ['LOT-01']);
    registry.handle('LOTOUTSHELF', {
      ...fields,
      DELETESHELFLOT: 'LOT-01',
      COMMANDTYPE: 'SHELF OUT',
    });
    assert.deepEqual(store.getShelfIncoming('SHELF-01').lots, []);
    registry.handle('LOTINSHELF', fields);
    store.reset();
    assert.deepEqual(store.getShelfIncoming('SHELF-01').lots, []);
    assert.deepEqual(createStore().getShelfIncoming('SHELF-01').lots, []);
  });
  it('rejects invalid transactions and preserves stored LOTs on failure', async () => {
    assert.equal(
      (await send('LOTINSHELF', { SHELFNO: 'BAD', INSERTSHELFLOT: 'LOT-01', USERID: 'USER' }))
        .STATUS,
      'FAIL',
    );
    assert.equal(
      (
        await send('LOTOUTSHELF', {
          SHELFNO: 'CART-01',
          DELETESHELFLOT: 'LOT-01',
          COMMANDTYPE: 'SHELF OUT',
          USERID: 'USER',
        })
      ).STATUS,
      'FAIL',
    );
  });
});
