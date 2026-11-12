import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStore } from '../src/data/store.js';
import { createMessageRegistry } from '../src/messages/registry.js';

const registry = createMessageRegistry(createStore());
const send = (name, payload) => JSON.parse(registry.handle(name, payload).result);

describe('legacy screens without a Vue page (AIT / XRF / Loss / PR / ESD / progress)', () => {
  it('answers with the MSGBODY keys the legacy activities read', () => {
    assert.equal(send('AITLOTINFO', { LOTID: 'LOT-AIT-01' }).MSGBODY.ITEMS[0].RECIPE, 'AIT-RCP-01');
    assert.equal(
      send('AITRECIPEINFO', { RECIPE: 'R' }).MSGBODY.ITEMS[0].RCP_PATH,
      '/AIT/RECIPE/AIT-RCP-01',
    );
    assert.equal(
      send('MEASCHAMBERCOVERAGE', { LOTID: 'LOT-1' }).MSGBODY.CHAMBERSLOTLIST,
      'A:01,03,05;B:02,04',
    );
    assert.equal(send('XRFTABLELOTINFO', { EQPID: 'XRF-01' }).MSGBODY.ITEMS[0].THICK, '1000');
    assert.deepEqual(send('MEASLOTINFO', { EQPID: 'XRF-EMPTY' }).MSGBODY.ITEMS, []);
    assert.equal(send('LOSSINFO', { LOTID: 'LOT-1' }).MSGBODY.LOSSCODEITEMS.length, 2);
    assert.equal(send('SRPRINFO', { PRID: 'PR-1' }).MSGBODY.PRDESC, 'PR DEMO RESIST');
    assert.equal(send('WETJOBLIST', { EQPID: 'WET-01' }).MSGBODY.JOB1, 'JOB-01');
    assert.equal(send('GETOPERATIONCOUNT', { LOTNAME: 'LOT-1' }).MSGBODY.COUNT, '1');
  });

  it('fails without the key field or for a FAIL scenario id', () => {
    assert.equal(send('AITREMOTESTART', {}).STATUS, 'FAIL');
    assert.equal(send('XRFREMOTESTART', { MACHINENAME: 'XRF-01' }).STATUS, 'PASS');
  });
});
