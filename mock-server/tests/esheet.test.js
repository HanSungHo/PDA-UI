import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStore } from '../src/data/store.js';
import { createESheetHandlers } from '../src/messages/esheet.handlers.js';

async function sendMessage(messageName, payload) {
  const store = createStore();
  const handlers = createESheetHandlers(store);
  const handler = handlers[messageName];
  assert.equal(typeof handler, 'function');
  const response = handler({ payload, store });
  return JSON.parse(response.result);
}

describe('eSheet mock messages', () => {
  it('returns the Android ESHEETINFO response for a known LOT', async () => {
    const result = await sendMessage('ESHEETINFO', {
      LOTID: 'wp00001',
      HISTORYCOUNT: '10',
      FORWARDCOUNT: '10',
      FACILITY: 'GUMI',
    });

    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PRODUCT, 'P-DM-TEST-6F');
    assert.equal(result.MSGBODY.PHOTOJOBCODE, '20151115');
    assert.equal(result.MSGBODY.ESHEETITEMS.length, 20);
    assert.equal(result.MSGBODY.ESHEETITEMS[0].PROCESSSTEP, 'PHOTO');
  });

  it('preserves successful empty process results and reports unknown LOT failures', async () => {
    const empty = await sendMessage('ESHEETINFO', { LOTID: 'WP-EMPTY' });
    assert.equal(empty.STATUS, 'PASS');
    assert.deepEqual(empty.MSGBODY.ESHEETITEMS, []);

    const missing = await sendMessage('ESHEETINFO', { LOTID: 'UNKNOWN' });
    assert.equal(missing.STATUS, 'FAIL');
    assert.equal(missing.ERRMSG, 'LOT UNKNOWN을(를) 찾을 수 없습니다.');

    const failed = await sendMessage('ESHEETINFO', { LOTID: 'WP-ERROR' });
    assert.equal(failed.STATUS, 'FAIL');
    assert.equal(failed.ERRMSG, 'eSheet 조회에 실패하였습니다.');
  });

  it('serves GETWAFER, MASKINFO, PCMREWORKRECIPE, CHECKFUTURE, and CHECKPHOTOSAMPLE', async () => {
    const wafers = await sendMessage('GETWAFER', { LOTID: 'WP00001' });
    assert.equal(wafers.STATUS, 'PASS');
    assert.equal(wafers.MSGBODY.WAFERLIST, 'WP00001.01,WP00001.02');

    const masks = await sendMessage('MASKINFO', {
      ID_IDENT: 'T',
      RETICLEID: 'MASK-001',
      FACILITY: 'GUMI',
    });
    assert.equal(masks.STATUS, 'PASS');
    assert.deepEqual(
      masks.MSGBODY.ITEMS.ITEM.map((item) => item.RETICLETAG),
      ['MASK-001', 'MASK-002'],
    );

    const pcm = await sendMessage('PCMREWORKRECIPE', { LOTID: 'WP00001' });
    assert.equal(pcm.STATUS, 'PASS');
    assert.deepEqual(pcm.MSGBODY, {
      PCMREQPLIST: 'EQP-A',
      RECIPELIST: 'RCP-A',
      PCMRESULT: 'OK',
    });

    const future = await sendMessage('CHECKFUTURE', {
      LOTNAME: 'WP00001',
      OPERATION: 'P00002',
      SUBOPERATION: '00',
    });
    assert.equal(future.STATUS, 'PASS');
    assert.equal(future.MSGBODY.FUTURELIST, 'FUTURE HOLD');

    const sample = await sendMessage('CHECKPHOTOSAMPLE', {
      LOTID: 'WP00001',
      LOCATION: 'EQP-01',
    });
    assert.equal(sample.STATUS, 'PASS');
    assert.equal(sample.MSGBODY.RET, 'PASS');
    assert.equal(sample.MSGBODY.STOP, 'STOP FOR REVIEW');
  });

  it('classifies Furnace destinations using the legacy FURNACE_KJCHECK response field', async () => {
    const kj = await sendMessage('FURNACE_KJCHECK', { LOTID: 'WP00001' });
    const kec = await sendMessage('FURNACE_KJCHECK', { LOTID: 'WP-KEC' });
    const other = await sendMessage('FURNACE_KJCHECK', { LOTID: 'WP-OTHER' });

    assert.deepEqual(kj.MSGBODY, { CNT: '0' });
    assert.deepEqual(kec.MSGBODY, { CNT: 'KEC' });
    assert.deepEqual(other.MSGBODY, { CNT: '1' });
  });

  it('returns action-specific failures for missing fixtures or required sample context', async () => {
    assert.equal((await sendMessage('GETWAFER', { LOTID: 'UNKNOWN' })).STATUS, 'FAIL');
    assert.equal((await sendMessage('MASKINFO', { RETICLEID: '' })).STATUS, 'FAIL');
    assert.equal((await sendMessage('PCMREWORKRECIPE', { LOTID: 'UNKNOWN' })).STATUS, 'FAIL');
    assert.equal(
      (await sendMessage('CHECKFUTURE', { LOTNAME: 'UNKNOWN', OPERATION: '1', SUBOPERATION: '0' }))
        .STATUS,
      'FAIL',
    );
    assert.equal(
      (await sendMessage('CHECKPHOTOSAMPLE', { LOTID: '', LOCATION: '' })).STATUS,
      'FAIL',
    );
    assert.equal((await sendMessage('FURNACE_KJCHECK', { LOTID: 'UNKNOWN' })).STATUS, 'FAIL');
  });

  it('returns cloned fixtures and restores the eSheet dataset on mock reset', async () => {
    const store = createStore();
    const response = store.getESheetInfo('WP00001');
    response.ESHEETITEMS[0].PROCESSSTEP = 'MUTATED';
    assert.equal(store.getESheetInfo('WP00001').ESHEETITEMS[0].PROCESSSTEP, 'PHOTO');

    store.reset();
    assert.equal(store.getESheetInfo('WP00001').ESHEETITEMS[0].PROCESSSTEP, 'PHOTO');
  });
});
