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

// route is what the app posts to: hifos2 sends merge through MessageName.MESSAGE ("message"),
// Vue posts to the lower-cased message name; both reach the same handler.
async function post(route, msgName, body) {
  const response = await fetch(`${baseUrl}/hifos/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${msgName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  assert.equal(response.status, 200);
  return JSON.parse((await response.json()).result);
}

const getMerge = (route, lotId) =>
  post(route, 'GETMERGELOT', `<FACILITY>GUMI</FACILITY><LOTID>${lotId}</LOTID>`);
const executeMerge = (lotName, mergeLot = '<ITEM/>') =>
  post(
    'executemerge',
    'EXECUTEMERGE',
    `<FACTORYNAME>GUMI</FACTORYNAME><LOTNAME>${lotName}</LOTNAME><PRODUCTSPECNAME>P</PRODUCTSPECNAME><ROUTE>R</ROUTE><PROCESSOPERATIONNAME>1100</PROCESSOPERATIONNAME><QTY>25</QTY><OPERATORID>U</OPERATORID><COMMENT>c</COMMENT><MERGELOT>${mergeLot}</MERGELOT>`,
  );

describe('Merge (hifos2 MergeActivity)', () => {
  it('serves the header keys and ITEMS the Activity reads, for both route styles', async () => {
    for (const route of ['message', 'getmergelot']) {
      const result = await getMerge(route, 'LOT-A260915-018');
      assert.equal(result.STATUS, 'PASS');
      assert.equal(result.MSGBODY.AREA, 'ETCH');
      assert.equal(result.MSGBODY.PRODUCTQUANTITY, '25');
      assert.equal(result.MSGBODY.ITEMS.ITEM.length, 5);
      assert.equal(result.MSGBODY.ITEMS.ITEM[0].LOTNAME, 'LOT-A260915-019');
    }
  });

  it('drives the CHECKMFGGROUP2, CHILDLOT and empty-list branches', async () => {
    assert.equal((await getMerge('message', 'LOT-MERGE-MFG2')).MSGBODY.CHECKMFGGROUP2, 'Y');
    assert.equal((await getMerge('message', 'LOT-MERGE-CHILD')).MSGBODY.CHILDLOT, 'Y');
    assert.equal((await getMerge('message', 'LOT-MERGE-EMPTY')).MSGBODY.ITEMS, '');
  });

  it('fails for an unknown LOT', async () => {
    const result = await getMerge('message', 'NO-SUCH-LOT');
    assert.equal(result.STATUS, 'FAIL');
    assert.ok(result.ERRMSG);
  });

  it('reports SUCCESS, FAILLOTNAME and FAIL for EXECUTEMERGE', async () => {
    assert.deepEqual((await executeMerge('LOT-A260915-018')).MSGBODY, {
      FAILLOTNAME: '',
      SUCCESS: 'Y',
    });
    assert.deepEqual((await executeMerge('LOT-PARTIAL-1')).MSGBODY, {
      FAILLOTNAME: 'LOT-A260915-021',
      SUCCESS: 'N',
    });
    assert.equal((await executeMerge('LOT-FAIL-1')).STATUS, 'FAIL');
  });
});

describe('Split (hifos2 SplitActivity)', () => {
  const slotInfo = (lotId) =>
    post('slotinfo', 'SLOTINFO', `<LOTID>${lotId}</LOTID><FACILITY>GUMI</FACILITY>`);

  it('serves every key setLotInfo reads for a splittable LOT', async () => {
    const { MSGBODY } = await slotInfo('ABC1234X');
    for (const key of [
      'PRODUCT',
      'OPERATION',
      'SUBOPERATION',
      'PROCESSSTEP',
      'QUANTITY',
      'STATE',
      'STATUS',
      'HOLDSTATUS',
      'BATCHID',
      'WAFERLIST',
      'SAMPLEFLAG',
      'ROOTLOTNAME',
      'CHILDLOTSEQUENCE',
    ]) {
      assert.equal(typeof MSGBODY[key], 'string', key);
    }
    assert.equal(MSGBODY.WAFERLIST.split(',').length, 25);
  });

  it('drives the hold, batch, sample and not-WIP guards', async () => {
    assert.equal((await slotInfo('HOLD0001')).MSGBODY.HOLDSTATUS, 'ONHOLD');
    assert.notEqual((await slotInfo('BATCH001')).MSGBODY.BATCHID, '');
    assert.equal((await slotInfo('SAMPLE01')).MSGBODY.SAMPLEFLAG, 'S');
    assert.equal((await slotInfo('SCRAP001')).MSGBODY.STATE, 'SCRAPPED');
  });

  it('keeps the Move Out SLOTINFO stub for other LOTs', async () => {
    const { MSGBODY } = await slotInfo('LOT-SKIP-01');
    assert.equal(MSGBODY.WAFERLIST, '1,2,3');
    assert.equal(MSGBODY.CHECKETCH, 'N');
  });

  it('returns CUSTOMER only for a customer product', async () => {
    const customer = await post('callcustomer', 'CALLCUSTOMER', '<PRODUCT>PROD-CUST</PRODUCT>');
    assert.equal(customer.MSGBODY.CUSTOMER, 'CUSTOMER-X');
    const none = await post('callcustomer', 'CALLCUSTOMER', '<PRODUCT>PROD-A100</PRODUCT>');
    assert.equal(none.MSGBODY.CUSTOMER, '');
  });

  it('accepts a SPLIT with child items and rejects one without or a FAIL lot', async () => {
    const item =
      '<ITEM><SPLITLOTID>ABC1234N1</SPLITLOTID><SPLITQTY>2</SPLITQTY><SPLITPROD>P</SPLITPROD><WAFERID>01,02</WAFERID></ITEM>';
    const split = (lotId, items) =>
      post(
        'split',
        'SPLIT',
        `<LOTID>${lotId}</LOTID><FACILITY>GUMI</FACILITY><QUANTITY>25</QUANTITY><SPLITITEMS>${items}</SPLITITEMS><COMMENT>c</COMMENT>`,
      );
    assert.equal((await split('ABC1234X', item)).STATUS, 'PASS');
    assert.equal((await split('ABC1234X', '')).STATUS, 'FAIL');
    assert.equal((await split('LOT-FAIL', item)).STATUS, 'FAIL');
  });
});
