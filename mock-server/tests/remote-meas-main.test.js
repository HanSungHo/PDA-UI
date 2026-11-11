import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMessageRegistry } from '../src/messages/registry.js';
import { createRemoteMeasMainHandlers } from '../src/messages/remote-meas-main.handlers.js';

const handlers = createRemoteMeasMainHandlers();

function reply(result) {
  assert.equal(result.statusCode, 200);
  return JSON.parse(result.result);
}

const check = (eqpId) => reply(handlers.XRFEQPTYPECHECK({ payload: { EQPID: eqpId } }));

describe('Remote MEAS main mock API', () => {
  it('is keyed by the XRFEQPTYPECHECK message name', () => {
    assert.deepEqual(Object.keys(handlers), ['XRFEQPTYPECHECK']);
  });

  it('answers MODEL and MAINEQPID in ITEMS.ITEM for AIT, AEGIS and XRF equipment', () => {
    assert.deepEqual(check('ait-01-a').MSGBODY.ITEMS.ITEM, [
      { MODEL: 'AIT-XP', MAINEQPID: 'AIT-01' },
    ]);
    assert.match(check('AEGIS-01').MSGBODY.ITEMS.ITEM[0].MODEL, /AEGIS/);
    assert.match(check('XRF-01').MSGBODY.ITEMS.ITEM[0].MODEL, /XRF/);
  });

  it('answers an empty ITEM list and failures', () => {
    assert.deepEqual(check('MEAS-EMPTY').MSGBODY.ITEMS.ITEM, []);

    const unknown = check('XRF-99');
    assert.equal(unknown.STATUS, 'FAIL');
    assert.equal(unknown.ERRMSG, 'XRF-99 장비 정보가 없습니다.');
    assert.equal(check('XRF-FAIL').ERRMSG, '장비 TYPE 조회에 실패하였습니다.');
  });

  it('is reachable through the message registry', () => {
    const registry = createMessageRegistry({});

    assert.equal(registry.has('XrfEqpTypeCheck'), true);
    assert.equal(reply(registry.handle('XRFEQPTYPECHECK', { EQPID: 'XRF-01' })).STATUS, 'PASS');
  });
});
