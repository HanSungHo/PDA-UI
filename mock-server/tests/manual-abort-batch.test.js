import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createManualAbortBatchHandlers } from '../src/messages/manual-abort-batch.handlers.js';

const handlers = createManualAbortBatchHandlers();

function reply(result) {
  assert.equal(result.statusCode, 200);
  return JSON.parse(result.result);
}

const lookup = (lotId) => reply(handlers.FURNACEREMANUALLOT({ payload: { LOTID: lotId } }));
const save = (payload) => reply(handlers.FURNACEREMANUALSAVE({ payload }));

describe('Manual Abort Batch mock API', () => {
  it('is keyed by the FURNACEREMANUALLOT and FURNACEREMANUALSAVE route names', () => {
    assert.deepEqual(Object.keys(handlers), ['FURNACEREMANUALLOT', 'FURNACEREMANUALSAVE']);
  });

  it('lists the abort batch with a 자 row', () => {
    const result = lookup('lot-1');

    assert.equal(result.STATUS, 'PASS');
    const rows = result.MSGBODY.ITEMS.ITEM;
    assert.deepEqual(Object.keys(rows[0]), ['BATCHINFO', 'ZONE', 'LOT']);
    assert.ok(rows.some((row) => row.BATCHINFO === '자'));
  });

  it('answers an empty ITEMS list and a failure', () => {
    assert.equal(lookup('LOT-EMPTY').MSGBODY.ITEMS, '');

    const error = lookup('LOT-ERROR');
    assert.equal(error.STATUS, 'FAIL');
    assert.equal(error.ERRMSG, 'Abort Batch 정보가 없습니다.');
  });

  it('saves unless the LOT or recipe asks for a failure', () => {
    const payload = { LOTID: 'LOT-1', EQPID: 'FURNACE-01', RCPID: 'RCP-1', USERID: 'OP1' };

    assert.equal(save(payload).STATUS, 'PASS');
    assert.equal(save({ ...payload, LOTID: 'LOT-FAIL' }).STATUS, 'FAIL');
    assert.equal(save({ ...payload, RCPID: 'RCP-ERROR' }).ERRMSG, '매뉴얼 등록에 실패하였습니다.');
  });
});
