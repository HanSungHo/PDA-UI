import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEtchConditionHandlers } from '../src/messages/etch-condition.handlers.js';
import { normalizeAifMessageName } from '../src/utils/xml.js';

// Exercised through the handler: on main, createApp() still throws on the duplicate
// MACHINEPORTSTATUS registration that MR !176 resolves.
const handlers = createEtchConditionHandlers();

function send(lotId, machine = '') {
  const result = handlers.ETCHCOMMRCPFROMB({ payload: { LOTID: lotId, CHKEQPID: machine } });
  assert.equal(result.statusCode, 200);
  return JSON.parse(result.result);
}

describe('ETCH condition mock API', () => {
  it('is keyed by the route name that matches the ETCH_COMMRCPFROMB AIFMSG', () => {
    assert.deepEqual(Object.keys(handlers), ['ETCHCOMMRCPFROMB']);
    assert.equal(normalizeAifMessageName('ETCH_COMMRCPFROMB'), 'ETCHCOMMRCPFROMB');
  });

  it('serves the DPS POLY chamber grid with the continuity check for a machine', () => {
    const result = send('LOT-DPS', '4E03-21');

    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PROCESS_TYPE, 'DPS POLY');
    assert.equal(result.MSGBODY.COMM2ND, '실비 조건을 확인하세요.');
    assert.deepEqual(
      result.MSGBODY.COMMRCP.ITEM.map((row) => row.CHKCHK),
      ['가능', '불가'],
    );
  });

  it('leaves CHKCHK blank when no machine is selected', () => {
    assert.deepEqual(
      send('LOT-DPS').MSGBODY.COMMRCP.ITEM.map((row) => row.CHKCHK),
      ['', ''],
    );
  });

  it('covers the eMAX CT, TE8500, EEN, empty, other and error branches', () => {
    const emax = send('lot-emax', '5E03-21');
    assert.equal(emax.MSGBODY.PROCESS_TYPE, 'eMAX CT');
    assert.equal(emax.MSGBODY.PARA2ND, 'RF');

    const te8500 = send('LOT-TE8500');
    assert.equal(te8500.MSGBODY.PROCESS_TYPE, 'TE8500');
    assert.equal(te8500.MSGBODY.COMMRCP.ITEM.at(-1).COL, '진행 TIME');

    assert.equal(send('LOT-EEN').MSGBODY.HMEEN, 'EEN 적용 LOT입니다.');
    assert.equal(send('LOT-EMPTY').MSGBODY.COMMRCP, '');
    assert.equal(send('LOT-OTHER').MSGBODY.PROCESS_TYPE, 'OTHER');

    const error = send('LOT-ERROR');
    assert.equal(error.STATUS, 'FAIL');
    assert.equal(error.ERRMSG, 'LOT 정보가 없습니다.');
  });
});
