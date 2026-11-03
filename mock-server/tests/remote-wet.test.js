import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { createStore } from '../src/data/store.js';

const store = createStore();
let server;
let baseUrl;

before(async () => {
  server = createApp({ store }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function messageXml(messageName, fields) {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${String(value).replace(/&/g, '&amp;')}</${name}>`)
    .join('');
  return `<AIFMSG><MSGNAME>${messageName}</MSGNAME><RECEIVER>SERVER</RECEIVER><SENDER>DEVICE</SENDER><MSGTYPE>P</MSGTYPE><WITHREPLY>YES</WITHREPLY><STATUS></STATUS><ERRMSG></ERRMSG><TID></TID><MSGBODY>${body}</MSGBODY></AIFMSG>`;
}

async function post(messageName, fields) {
  return fetch(`${baseUrl}/hifos/${messageName.toLowerCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sMsg: messageXml(messageName, fields) }),
  });
}

async function postJson(path, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function resultBody(responseJson) {
  return JSON.parse(responseJson.result);
}

describe('Remote Wet mock-server contract', () => {
  it('serves equipment, WIP LOT, recipe and facility BAY/STOCKER responses', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const equipmentResponse = await post('WETREMOTEEQPINFO', { EQPID: 'WET-EQP-01' });
    const equipment = resultBody(await equipmentResponse.json());
    assert.equal(equipment.STATUS, 'PASS');
    assert.equal(equipment.MSGBODY.MAINEQPID, 'WET-MAIN-01');
    assert.equal(equipment.MSGBODY.EQPAREA, 'WET-AREA');

    const lotResponse = await post('LOTINFO', {
      TYPE: 'MVIN',
      LOTID: 'WET-LOT-01',
      FACILITY: 'FAC-01',
    });
    const lot = resultBody(await lotResponse.json());
    assert.equal(lot.STATUS, 'PASS');
    assert.equal(lot.MSGBODY.STATUS, 'WAIT');
    assert.equal(lot.MSGBODY.STATE, 'WIP');

    const recipeResponse = await post('RECIPEINFO', {
      ISPHOTO: 'N',
      LOTID: 'WET-LOT-01',
      OPERATION: '2100',
      SUBOPERATION: '010',
      PRODUCT: 'PRODUCT-WET (JOB-WET-01)',
      EQPID: 'WET-MAIN-01',
      OPTYPE: 'WET',
      FACILITY: 'FAC-01',
    });
    assert.equal(resultBody(await recipeResponse.json()).MSGBODY.RECIPE, 'RCP-WET-01 (RUN-01)');

    const bayResponse = await post('AREABAYINFO', { FACILITY: 'FAC-01' });
    const bayBody = resultBody(await bayResponse.json()).MSGBODY;
    assert.deepEqual(bayBody.BAYS.ITEM[0], { BAY: 'BAY-A' });
    assert.equal(bayBody.BAY0, 'BAY-A');

    const stockerResponse = await post('BAYSTOCKERINFO', {
      BAY: 'BAY-A',
      FACILITY: 'FAC-01',
    });
    const stockerBody = resultBody(await stockerResponse.json()).MSGBODY;
    assert.deepEqual(stockerBody.STOCKERS.ITEM[0], { STOCKER: 'STK-A' });
    assert.equal(stockerBody.STOCKER0, 'STK-A');
  });

  it('records and serves the exact Wet start payload, including AREANAME and ISCARRAY', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
    const payload = {
      MACHINENAME: 'WET-MAIN-01',
      MACHINENAME2: 'WET-EQP-01',
      MACHINETYPE: 'WET',
      AREANAME: 'WET-AREA',
      NUMCASS: '2',
      LOTNAME: 'WET-LOT-01',
      LOTNAME2: 'WET-LOT-02',
      RECIPENAME: 'RCP-WET-01 ',
      JOBNAME: 'JOB-WET-01',
      PRODUCTQTY: '24',
      PRODUCTQTY2: '18',
      OPERATION: '2100-010',
      OPERATION2: '2200-020',
      EVENTUSER: 'USER-01',
      ISCARRAY: 'Y',
      BAY: 'BAY-A',
      STOCKER: 'STK-A',
    };
    const response = await post('WETREMOTESTART', payload);
    assert.equal(resultBody(await response.json()).STATUS, 'PASS');
    assert.deepEqual(
      store
        .getMessageRequests()
        .filter((request) => request.messageName === 'wetremotestart')
        .at(-1)?.payload,
      payload,
    );
    assert.equal(payload.AREANAME, 'WET-AREA');

    const failed = await post('WETREMOTESTART', {
      ...payload,
      MACHINENAME2: 'WET-EQP-FAIL-START',
    });
    const failedResult = resultBody(await failed.json());
    assert.equal(failedResult.STATUS, 'FAIL');
    assert.equal(failedResult.ERRMSG, 'WET Remote Start mock 오류');
  });

  it('returns deterministic equipment lookup failures and PM/PCOUNT warnings', async () => {
    const missing = await post('WETREMOTEEQPINFO', { EQPID: 'MISSING-EQP' });
    assert.equal(resultBody(await missing.json()).STATUS, 'FAIL');

    const warning = await post('WETREMOTEEQPINFO', { EQPID: 'WET-EQP-PM' });
    const body = resultBody(await warning.json()).MSGBODY;
    assert.equal(body.PCOUNT, 'N');
    assert.equal(body.PMMESSAGE, 'PM 점검 주기를 확인하세요.');
  });

  it('preserves Remote CVD, Remote Meas, EQPSPC and PR_EMPTY shared message branches', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const cvdPort = await post('MACHINEPORTSTATUS', { EQPID: 'CVD-MAIN-01', PORTNAME: '1' });
    assert.equal(resultBody(await cvdPort.json()).STATUS, 'PASS');
    const measPort = await post('MACHINEPORTSTATUS', { EQPID: 'MEQP-01', PORTNAME: 'PORT1' });
    assert.equal(resultBody(await measPort.json()).STATUS, 'PASS');

    const cvdClear = await post('MACHINEPORTCLEAR', {
      MACHINENAME: 'CVD-MAIN-01',
      PORTNAME: '1',
    });
    assert.equal(resultBody(await cvdClear.json()).STATUS, 'PASS');
    const measClear = await post('MACHINEPORTCLEAR', {
      MACHINENAME: 'MEQP-01',
      PORTNAME: 'PORT1',
    });
    assert.equal(resultBody(await measClear.json()).STATUS, 'PASS');

    const eqpSpc = await fetch(`${baseUrl}/hifos/setgasusage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: messageXml('INTLKPOPUPCHECK', { EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'Y' }),
      }),
    });
    assert.equal(resultBody(await eqpSpc.json()).STATUS, 'PASS');

    const invalidEqpSpc = await fetch(`${baseUrl}/hifos/setgasusage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: messageXml('INTLKPOPUPCHECK', { EVENT_TYPE: 'EQPSPC', USER_CONFIRM: 'N' }),
      }),
    });
    assert.equal(resultBody(await invalidEqpSpc.json()).STATUS, 'FAIL');

    const prempty = await fetch(`${baseUrl}/hifos/setgasusage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: messageXml('INTLKPOPUPCHECK', { EVENT_TYPE: 'PR_EMPTY', EQPID: 'PUMP-01' }),
      }),
    });
    assert.equal(resultBody(await prempty.json()).STATUS, 'PASS');
    assert.equal(store.getPremptyConfirmations().length, 1);
  });

  it('serves the Wet EEN COMMENTLIST, COMMENT and COMMENTSET handoff contract', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const listResponse = await post('COMMENTLIST', {
      LOTID: 'WET-LOT-01',
      FACILITY: 'FAC-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      OPERSEQUENCE: 'WET-STEP',
    });
    const list = resultBody(await listResponse.json());
    assert.equal(list.STATUS, 'PASS');
    assert.equal(list.MSGBODY.ITEMS[0].NO, '0001');
    assert.equal(list.MSGBODY.ITEMS[0].WORKCODE, 'W');
    assert.deepEqual(
      store.getMessageRequests().find((request) => request.messageName === 'commentlist')?.payload,
      {
        LOTID: 'WET-LOT-01',
        FACILITY: 'FAC-WET',
        OPERATION: '2100',
        SUBOPERATION: '010',
        OPERSEQUENCE: 'WET-STEP',
      },
    );

    const detailRequest = {
      LOTID: 'WET-LOT-01',
      FACILITY: 'FAC-WET',
      OPERATION: '2100',
      SUBOPERATION: '010',
      COMMENTNO: '0001',
      OPERSEQUENCE: '',
      OPERATORID: 'USER-WET',
    };
    const detailResponse = await postJson('/api/comment', detailRequest);
    const detail = await detailResponse.json();
    assert.equal(detail.DESCRIPTION, 'Verify the WET process before START.');
    assert.equal(detail.ISCHECK, 'N');

    const setResponse = await postJson('/api/commentSet', {
      ...detailRequest,
      OPERNAME: 'Wet Operator',
      PASSWORD: 'PASS',
    });
    assert.deepEqual(await setResponse.json(), { ok: true });

    const afterRead = await postJson('/api/comment', detailRequest);
    assert.equal((await afterRead.json()).ISCHECK, 'Y');
    const refreshedLot = resultBody(
      await (
        await post('LOTINFO', { TYPE: 'MVIN', LOTID: 'WET-LOT-01', FACILITY: 'FAC-WET' })
      ).json(),
    );
    assert.equal(refreshedLot.MSGBODY.NWCOMMENTQTY, '0');
  });

  it('serves Comment List preview lots through the shared AIFMSG and detail endpoints', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const listResponse = await post('COMMENTLIST', {
      LOTID: 'LOT-A260915-018',
      FACILITY: 'KFAB',
      OPERATION: 'PHOTO',
      SUBOPERATION: 'INSP',
      OPERSEQUENCE: 'Final Inspection',
    });
    const list = resultBody(await listResponse.json());
    assert.equal(list.MSGBODY.ITEMS.length, 3);
    assert.deepEqual(list.MSGBODY.ITEMS[0], {
      NO: '0001',
      SUBOPERATION: 'INSP',
      WORKCODE: 'W',
      TRACKTYPE: 'CURRENT',
      ISCHECK: 'N',
      WRITER: 'KIM HS',
      WRITETIME: '2026-09-15 08:12',
      READER: '',
      READTIME: '',
      DESCRIPTION: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
    });

    const detailResponse = await postJson('/api/comment', {
      LOTID: 'LOT-A260915-018',
      FACILITY: 'KFAB',
      OPERATION: 'PHOTO',
      SUBOPERATION: 'INSP',
      COMMENTNO: '0001',
      OPERSEQUENCE: '0042',
      OPERATORID: 'OPERATOR-01',
    });
    assert.equal((await detailResponse.json()).DESCRIPTION, list.MSGBODY.ITEMS[0].DESCRIPTION);
  });

  it('serves Comment View preview scenarios through the shared HTTP endpoints', async () => {
    const expectedCurrentWritable = {
      DESCRIPTION: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    };
    const scenarios = [
      'current-writable',
      'current-checked',
      'current-read-only',
      'historical',
      'empty',
      'comment-set-error',
    ];

    for (const scenario of scenarios) {
      const response = await postJson(`/api/comment?scenario=${encodeURIComponent(scenario)}`, {
        LOTID: 'PREVIEW-LOT',
        COMMENTNO: '1',
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(typeof data.ISCURRENT, 'string');
      if (scenario === 'current-writable') assert.deepEqual(data, expectedCurrentWritable);
    }

    const commentError = await postJson('/api/comment?scenario=comment-error', {});
    assert.equal(commentError.status, 400);
    assert.deepEqual(await commentError.json(), {
      message: 'Unable to load comment in mock mode.',
    });

    const commentSetError = await postJson('/api/commentSet?scenario=comment-set-error', {});
    assert.equal(commentSetError.status, 400);
    assert.deepEqual(await commentSetError.json(), {
      message: 'Unable to confirm comment in mock mode.',
    });
  });
});
