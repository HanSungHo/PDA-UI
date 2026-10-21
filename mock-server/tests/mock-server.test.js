import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { createStore } from '../src/data/store.js';
import { createEENModifyHandlers } from '../src/messages/een-modify.handlers.js';
import { createSettingHandlers } from '../src/messages/setting.handlers.js';

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('mock server shell', () => {
  it('returns health status', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('wraps unknown messages as 404 errors', async () => {
    const response = await fetch(`${baseUrl}/hifos/UNKNOWN`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, 'MESSAGE_NOT_FOUND');
  });
});

describe('message routing', () => {
  it('dispatches POST /message/send to LOTINFO', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'LOTINFO',
        payload: { LOTID: 'LOT-DEMO-01', EVENT: 'MVOU' },
      }),
    });
    assert.equal(response.status, 200);
    const json = await response.json();
    const result = JSON.parse(json.result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PRODUCT, 'PRODUCT-DEMO');
  });

  it('resets mock state', async () => {
    const response = await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('parses the Android AIFMSG envelope and rejects a route/header mismatch', async () => {
    const response = await fetch(`${baseUrl}/hifos/lotinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: '<AIFMSG><MSGNAME>LOTINFO</MSGNAME><MSGBODY><LOTID>CVD-MOCK-001</LOTID><TYPE>NORMAL</TYPE><FACILITY>GUMI&amp;FAB</FACILITY></MSGBODY></AIFMSG>',
      }),
    });
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.LOTID, 'CVD-MOCK-001');

    const mismatch = await fetch(`${baseUrl}/hifos/remoteeqpinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: '<AIFMSG><MSGNAME>LOTINFO</MSGNAME><MSGBODY></MSGBODY></AIFMSG>',
      }),
    });
    assert.equal(mismatch.status, 400);
    assert.equal((await mismatch.json()).code, 'MESSAGE_NAME_MISMATCH');
  });
});

describe('Remote CVD AIFMSG flow', () => {
  async function postAif(routeName, messageName, fields) {
    const body = Object.entries(fields)
      .map(
        ([name, value]) =>
          `<${name}>${String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</${name}>`,
      )
      .join('');
    const response = await fetch(`${baseUrl}/hifos/${routeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
      }),
    });
    return { response, envelope: await response.json() };
  }

  it('serves the Remote CVD lookup, port, and operation message sequence', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const cases = [
      ['remoteeqpinfo', 'REMOTEEQPINFO', { EQPID: 'CVD01' }],
      ['recipeinfo', 'RECIPEINFO', { EQPID: 'CVD01', LOTID: 'CVD-MOCK-001' }],
      ['tercpselection', 'TERCPSELECTION', { EQPID: 'CVD01', LOTID: 'CVD-MOCK-001' }],
      ['memorization', 'MEMORIZATION', { EQPID: 'CVD01', RECIPE: 'CVD:RECIPE-A' }],
      ['machineportstatus', 'MACHINEPORTSTATUS', { EQPID: 'CVD-MAIN-01', PORTNAME: '1' }],
      ['remoteintlkcheck', 'REMOTEINTLKCHECK', { LOTID: 'CVD-MOCK-001' }],
      ['dooropen', 'DOOROPEN', { MACHINENAME: 'CVD-MAIN-01', PORTNAME: '1' }],
      [
        'remotestart',
        'REMOTESTART',
        {
          LOTNAME: 'CVD-MOCK-001',
          MACHINENAME: 'CVD-MAIN-01',
          PORTNAME: '1',
          RECIPENAME: 'CVD:RECIPE-A',
        },
      ],
      [
        'remoterestart',
        'REMOTERESTART',
        {
          LOTNAME: 'CVD-MOCK-001',
          MACHINENAME: 'CVD-MAIN-01',
          PORTNAME: '1',
          RECIPENAME: 'CVD:RECIPE-A',
        },
      ],
    ];

    for (const [routeName, messageName, fields] of cases) {
      const { response, envelope } = await postAif(routeName, messageName, fields);
      assert.equal(response.status, 200, messageName);
      assert.equal(JSON.parse(envelope.result).STATUS, 'PASS', messageName);
    }

    const clear = await postAif('machineportclear', 'MACHINEPORTCLEAR', {
      MACHINENAME: 'CVD-MAIN-01',
      PORTNAME: '1',
    });
    assert.equal(JSON.parse(clear.envelope.result).STATUS, 'PASS');

    const port = await postAif('machineportstatus', 'MACHINEPORTSTATUS', {
      EQPID: 'CVD-MAIN-01',
      PORTNAME: '1',
    });
    assert.equal(JSON.parse(port.envelope.result).MSGBODY.PORTSTATENAME, 'IDLE');
  });

  it('serves both RCP child message contracts and download result states', async () => {
    const conditions = await postAif('etchcommrcp', 'ETCH_COMMRCP', {
      LOTID: 'CVD-MOCK-001',
      RCP: 'CVD:RECIPE-A',
      EQP: 'CVD-MAIN-01',
      PROCESSOPERATIONNAME: '10020',
      OPERATIONDESCRIPTION: 'CVD PROCESS',
    });
    assert.equal(conditions.response.status, 200);
    const conditionsResult = JSON.parse(conditions.envelope.result);
    assert.equal(conditionsResult.STATUS, 'PASS');
    assert.equal(conditionsResult.MSGBODY.OWNERCODE, 'EMAX_OWN_02');
    assert.equal(conditionsResult.MSGBODY.COMMRCP.length, 4);

    const emptyConditions = await postAif('etchcommrcp', 'ETCH_COMMRCP', {
      LOTID: 'CVD-MOCK-001',
      RCP: 'CVD:EMPTY',
      EQP: 'CVD-EMPTY',
      PROCESSOPERATIONNAME: '10020',
      OPERATIONDESCRIPTION: 'CVD PROCESS',
    });
    const emptyResult = JSON.parse(emptyConditions.envelope.result);
    assert.equal(emptyResult.STATUS, 'PASS');
    assert.equal(emptyResult.MSGBODY.DOWNLOAD, 'N');
    assert.deepEqual(emptyResult.MSGBODY.COMMRCP, []);

    const unknownEquipment = await postAif('etchcommrcp', 'ETCH_COMMRCP', {
      LOTID: 'CVD-MOCK-001',
      RCP: 'CVD:RECIPE-A',
      EQP: 'UNKNOWN-EQP',
      PROCESSOPERATIONNAME: '10020',
      OPERATIONDESCRIPTION: 'CVD PROCESS',
    });
    assert.equal(
      JSON.parse(unknownEquipment.envelope.result).ERRMSG,
      '장비 정보를 찾을 수 없습니다.',
    );

    for (const [downValue, expected] of [
      ['320', 'OK'],
      ['FAIL-DOWNLOAD', 'D_FAIL'],
      ['FAIL-VALIDATION', 'V_FAIL'],
    ]) {
      const download = await postAif('etchrcpdownload', 'ETCH_RCP_DOWNLOAD', {
        LOTID: 'CVD-MOCK-001',
        RCP: 'CVD:RECIPE-A',
        EQP: 'CVD-MAIN-01',
        USERID: 'OP-01',
        CHM: 'CH1',
        PARAMETER: 'RF_TOP_PWR',
        DOWN_VALUE: downValue,
        STEP: '1',
      });
      const result = JSON.parse(download.envelope.result);
      assert.equal(download.response.status, 200);
      assert.equal(result.STATUS, 'PASS');
      assert.equal(result.MSGBODY.CHK, expected);
    }

    const missingField = await postAif('etchrcpdownload', 'ETCH_RCP_DOWNLOAD', {
      LOTID: 'CVD-MOCK-001',
    });
    const missingResult = JSON.parse(missingField.envelope.result);
    assert.equal(missingResult.STATUS, 'FAIL');
    assert.equal(missingResult.ERRMSG, 'RCP is required.');
  });
});

describe('EEN Modify messages', () => {
  it('loads TAG choices by facility through GETTAGID', async () => {
    const response = await fetch(`${baseUrl}/hifos/gettagid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: '<AIFMSG><MSGBODY><FACTORYNAME>GUMI</FACTORYNAME></MSGBODY></AIFMSG>',
      }),
    });
    const result = JSON.parse((await response.json()).result);

    assert.equal(result.STATUS, 'PASS');
    assert.equal(
      result.MSGBODY.TAGLIST,
      'TAG-001\tDesigner Review and approve before production\nTAG-002\t두 번째 TAG 설명',
    );
  });

  it('applies UPDATEEEN values and resets the mock state', async () => {
    const payload = {
      sMsg: [
        '<AIFMSG><MSGBODY>',
        '<LOTNAME>LOT-DEMO-01</LOTNAME>',
        '<USERID>OPERATOR-01</USERID>',
        '<FACILITY>GUMI</FACILITY>',
        '<PRODUCT>HIFI-UI-DEMO</PRODUCT>',
        '<OPERATION>1200</OPERATION>',
        '<ACTIONPOINT>MOVEOUT</ACTIONPOINT>',
        '<EENID>EEN-0001</EENID>',
        '<PROCESSFLOW>PHOTO-DEMO</PROCESSFLOW>',
        '<TAGCOMMENT>Updated comment</TAGCOMMENT>',
        '<TAGID>TAG-002</TAGID>',
        '<OLDTAGCOMMENT>Original comment</OLDTAGCOMMENT>',
        '<CHANGECAUSE>Change reason</CHANGECAUSE>',
        '</MSGBODY></AIFMSG>',
      ].join(''),
    };
    const update = await fetch(`${baseUrl}/hifos/updateeen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(JSON.parse((await update.json()).result).STATUS, 'PASS');

    const reset = await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
    assert.equal(reset.status, 200);
  });

  it('updates the handler store and clears a TAG ID represented as legacy null', () => {
    const store = createStore();
    const handlers = createEENModifyHandlers(store);
    const response = handlers.UPDATEEEN({
      payload: {
        sMsg: [
          '<AIFMSG><MSGBODY>',
          '<ACTIONPOINT>MOVEOUT</ACTIONPOINT>',
          '<EENID>EEN-0001</EENID>',
          '<TAGCOMMENT>Existing comment</TAGCOMMENT>',
          '<TAGID>null</TAGID>',
          '<CHANGECAUSE>Reason</CHANGECAUSE>',
          '</MSGBODY></AIFMSG>',
        ].join(''),
      },
    });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
    assert.deepEqual(store.getEENModifyItem('EEN-0001'), {
      actionPoint: 'MOVEOUT',
      tagId: '',
      tagComment: 'Existing comment',
      changeCause: 'Reason',
    });
  });
});

describe('sample-release messages', () => {
  async function sendMessage(messageName, payload) {
    return fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageName, payload }),
    });
  }

  it('returns sample-release lookup data and QA sentinel results', async () => {
    const response = await sendMessage('SAMPLERELEASEINFO', { TYPE: 'S', LOTID: 'LOT-001' });
    assert.equal(response.status, 200);

    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.deepEqual(result.MSGBODY.ITEMS[0], {
      SLOTNAME: 'LOT-001',
      SQTY: '5',
      SPROD: 'PROD-SMART-01',
      SOPER: '1000',
      SOPERDESC: 'ETCH INSPECTION',
      SPROCESS: 'MAIN-ROUTE-01',
      RPROD: 'PROD-SMART-01',
      RPROCESS: 'MAIN-ROUTE-01',
      ROPER: '1000',
      RMACHINENAME: 'ETCH-MC-01',
      MLOTNAME: 'MLOT-A26-999',
      MQTY: '20',
      MPROD: 'PROD-SMART-01',
      MPROCESS: 'MAIN-ROUTE-01',
      MOPER: '1000',
      MOPERDESC: 'MAIN ETCH INSPECTION',
      MPROCESSSTATE: 'WAIT',
    });

    const mismatchResponse = await sendMessage('SAMPLERELEASEINFO', { LOTID: 'LOT-MISMATCH' });
    const mismatch = JSON.parse((await mismatchResponse.json()).result);
    assert.equal(mismatch.MSGBODY.ITEMS[0].MOPER, '9999');

    const notWaitResponse = await sendMessage('SAMPLERELEASEINFO', { LOTID: 'LOT-NOTWAIT' });
    const notWait = JSON.parse((await notWaitResponse.json()).result);
    assert.equal(notWait.MSGBODY.ITEMS[0].MPROCESSSTATE, 'RUN');

    const errorResponse = await sendMessage('SAMPLERELEASEINFO', { LOTID: 'LOT-ERROR' });
    const error = JSON.parse((await errorResponse.json()).result);
    assert.equal(error.STATUS, 'FAIL');
    assert.equal(error.ERRMSG, 'LOT ID 조회 실패하였습니다.');
  });

  it('executes sample release and preserves its failure sentinel', async () => {
    const payload = {
      FACILITY: 'FAB1',
      SAMPLELOTNAME: 'SLOT-001',
      SAMPLEMACHINE: 'MC-01',
      SAMPLEQTY: '5',
      ROUTE: 'ROUTE-01',
      OPERATION: '1000',
      USERID: 'OP-01',
      COMMENT: 'release comment',
      MAINLOTNAME: 'MLOT-001',
      MAINQTY: '20',
    };
    const response = await sendMessage('SAMPLERELEASEEXECUTION', payload);
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.SUCESSMSG, 'Sample Release 실행이 정상적으로 완료되었습니다.');

    const failureResponse = await sendMessage('SAMPLERELEASEEXECUTION', {
      ...payload,
      SAMPLELOTNAME: 'SLOT-FAIL',
    });
    const failure = JSON.parse((await failureResponse.json()).result);
    assert.equal(failure.STATUS, 'FAIL');
    assert.equal(failure.ERRMSG, 'Sample Release 실행 중 오류가 발생하였습니다.');
  });
});

describe('lot status HOLD CD messages', () => {
  it('returns the ordinary HOLD comment and legacy SPC particle list', async () => {
    const holdResponse = await fetch(`${baseUrl}/hifos/LOTINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-HOLD-01', TYPE: 'NORMAL', FACILITY: 'KFAB' }),
    });
    const hold = JSON.parse((await holdResponse.json()).result);
    assert.equal(hold.MSGBODY.HOLDCODE, 'ONHOLD');
    assert.equal(hold.MSGBODY.HOLD_COMMENT, 'Engineering hold');

    const spcResponse = await fetch(`${baseUrl}/hifos/LOTINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-SPC-HOLD-01', TYPE: 'NORMAL', FACILITY: 'KFAB' }),
    });
    const spc = JSON.parse((await spcResponse.json()).result);
    assert.equal(spc.MSGBODY.HOLD_COMMENT, 'SPC OUT HOLD');

    const particleResponse = await fetch(`${baseUrl}/hifos/SLOTPARTICLE`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        LOTID: 'LOT-SPC-HOLD-01',
        FACILITY: 'KFAB',
        OPERATION: '1000-00',
      }),
    });
    const particle = JSON.parse((await particleResponse.json()).result);
    assert.deepEqual(particle.MSGBODY.ITEMS.ITEM, [
      { SLOT: '01', PARTICLE: '12' },
      { SLOT: '02', PARTICLE: '8' },
    ]);
  });
});

describe('move-out messages', () => {
  it('returns bay and stocker options', async () => {
    const bayResponse = await fetch(`${baseUrl}/hifos/AREABAYINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const bayResult = JSON.parse((await bayResponse.json()).result);
    assert.equal(bayResult.MSGBODY.BAY0, 'BAY-A');

    const stockerResponse = await fetch(`${baseUrl}/hifos/BAYSTOCKERINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ BAY: 'BAY-A' }),
    });
    const stockerResult = JSON.parse((await stockerResponse.json()).result);
    assert.equal(stockerResult.MSGBODY.STOCKER0, 'STK-A');
  });

  it('moves out a single lot and mutates LOTINFO status', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const moveResponse = await fetch(`${baseUrl}/hifos/MOVEOUT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-DEMO-01' }),
    });
    assert.equal(JSON.parse((await moveResponse.json()).result).STATUS, 'PASS');

    const lotResponse = await fetch(`${baseUrl}/hifos/LOTINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-DEMO-01' }),
    });
    const lotResult = JSON.parse((await lotResponse.json()).result);
    assert.equal(lotResult.MSGBODY.STATUS, 'WAIT');
  });

  it('supports the Move Out screen full message flow with wafer-skip reasons', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const lotResponse = await fetch(`${baseUrl}/hifos/LOTINFO`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-SKIP-01', TYPE: 'MVOU' }),
    });
    const lotResult = JSON.parse((await lotResponse.json()).result);
    assert.equal(lotResult.STATUS, 'PASS');
    assert.equal(lotResult.MSGBODY.CHECKSKIPWAFER, 'N');
    assert.equal(lotResult.MSGBODY.TYPEVALUES[0].typeValue, 'REASON-A');

    for (const [messageName, payload] of [
      ['AREABAYINFO', {}],
      ['BAYSTOCKERINFO', { BAY: 'BAY-A' }],
      ['LOGINUSERCHECK', { USERID: 'OPERATOR_ID', EQPID: 'EQP-DEMO' }],
      ['SLOTINFO', { LOTID: 'LOT-SKIP-01' }],
      [
        'UPDATESKIPWAFER',
        {
          LOTID: 'LOT-SKIP-01',
          MACHINENAME: 'EQP-DEMO',
          RECIPENAME: 'RCP-DEMO',
          SKIPWAFER: '0',
          USERID: 'OPERATOR_ID',
          SKIPREASON: 'REASON-A',
          SMINUS: '',
        },
      ],
      ['MOVEOUT', { LOTID: 'LOT-SKIP-01', OPERATORID: 'OPERATOR_ID' }],
      ['FQCSAMPLING', { LOTID: 'LOT-SKIP-01' }],
      ['PROBECARDSET', { LOTNAME: 'LOT-SKIP-01' }],
    ]) {
      const response = await fetch(`${baseUrl}/hifos/${messageName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = JSON.parse((await response.json()).result);
      assert.equal(result.STATUS, 'PASS', messageName);
    }
  });
});

describe('batch messages', () => {
  it('returns BATCHTYPE child rows for activity_batchsub', async () => {
    const response = await fetch(`${baseUrl}/hifos/BATCHTYPE`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ FACILITY: 'KFAB', BATCHID: 'BAT2026092201', BATCHTYPE: 'C' }),
    });
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.ITEMS.length, 3);
    assert.deepEqual(result.MSGBODY.ITEMS[0], {
      ROWNUM: '1',
      BATCHID: 'BAT2026092201',
      LOT1: 'LOT2026092201 01',
    });
  });

  it('returns BATCHLISTBYLOT data', async () => {
    const response = await fetch(`${baseUrl}/hifos/BATCHLISTBYLOT`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-BATCH-01', BATCHID: 'BATCH-DEMO-01' }),
    });
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.BATCHID, 'BATCH-DEMO-01');
    assert.equal(result.MSGBODY.ITEMS.length, 2);
  });
});

describe('comment routes', () => {
  it('marks a comment as read through /api/commentSet', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const setResponse = await fetch(`${baseUrl}/api/commentSet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        LOTID: 'LOT-DEMO-01',
        COMMENTNO: '1',
        OPERATORID: 'OPERATOR_ID',
        OPERNAME: 'Demo',
      }),
    });
    assert.equal(setResponse.status, 200);

    const listResponse = await fetch(`${baseUrl}/api/comment/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LOTID: 'LOT-DEMO-01' }),
    });
    const list = await listResponse.json();
    assert.equal(list.items[0].isCheck, true);
  });
});

describe('activity-main messages', () => {
  it('logs in with the current legacy XML-like payload', async () => {
    const response = await fetch(`${baseUrl}/hifos/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: '<OPERATORID>OP10023</OPERATORID><PASSWORD>PASS</PASSWORD>',
      }),
    });
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.OPERID, 'OP10023');
    assert.equal(result.MSGBODY.PERMISSTION, 'H');
  });

  it('rejects invalid login password with the legacy message', async () => {
    const response = await fetch(`${baseUrl}/hifos/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: '<OPERATORID>OP10023</OPERATORID><PASSWORD>BAD</PASSWORD>',
      }),
    });
    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, '아이디 또는 패스워드를 확인해주세요');
  });

  it('supports the LoginActivity LOGIN then CONFIG AIFMSG sequence', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const loginResponse = await fetch(`${baseUrl}/hifos/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: [
          '<AIFMSG>',
          '<MSGNAME>LOGIN</MSGNAME>',
          '<RECEIVER>DEV-SERVER</RECEIVER>',
          '<SENDER>AR-DEMO</SENDER>',
          '<MSGTYPE>P</MSGTYPE>',
          '<WITHREPLY>YES</WITHREPLY>',
          '<STATUS></STATUS>',
          '<ERRMSG></ERRMSG>',
          '<TID></TID>',
          '<MSGBODY>',
          '<OPERATORID>OP10023</OPERATORID>',
          '<PASSWORD>PASS</PASSWORD>',
          '<BAY>P01</BAY>',
          '<FACILITY>GUMI</FACILITY>',
          '<DEVICENAME>AR-DEMO</DEVICENAME>',
          '<SERVERNAME>DEV-SERVER</SERVERNAME>',
          '</MSGBODY>',
          '</AIFMSG>',
        ].join(''),
      }),
    });
    const login = JSON.parse((await loginResponse.json()).result);
    assert.equal(login.STATUS, 'PASS');
    assert.equal(login.MSGBODY.OPERID, 'OP10023');

    const configResponse = await fetch(`${baseUrl}/hifos/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sMsg: [
          '<AIFMSG>',
          '<MSGNAME>CONFIG</MSGNAME>',
          '<RECEIVER>DEV-SERVER</RECEIVER>',
          '<SENDER>AR-DEMO</SENDER>',
          '<MSGTYPE>P</MSGTYPE>',
          '<WITHREPLY>YES</WITHREPLY>',
          '<STATUS></STATUS>',
          '<ERRMSG></ERRMSG>',
          '<TID></TID>',
          '<MSGBODY>',
          '<FACILITY>GUMI</FACILITY>',
          '<AREA>PHOTO</AREA>',
          '<BAY>P01</BAY>',
          '<DEVICENAME>AR-DEMO</DEVICENAME>',
          '<IPADDR>192.168.0.10</IPADDR>',
          '<USERID>OP10023</USERID>',
          '</MSGBODY>',
          '</AIFMSG>',
        ].join(''),
      }),
    });
    const config = JSON.parse((await configResponse.json()).result);
    assert.equal(config.STATUS, 'PASS');
    assert.equal(config.MSGBODY.CONFIG, 'OK');
  });
});

describe('activity-setting messages', () => {
  it('persists a successful CONFIG payload in mock state for later lookup', () => {
    const store = createStore();
    const handlers = createSettingHandlers(store);
    const payload = {
      FACILITY: 'GUMI',
      AREA: 'PHOTO',
      BAY: 'P01',
      DEVICENAME: 'ANDROID_001',
      IPADDR: '192.168.0.10',
      USERID: 'OP001',
    };

    const response = handlers.CONFIG({ payload });

    assert.equal(JSON.parse(response.result).STATUS, 'PASS');
    assert.deepEqual(store.getSettingConfig(), payload);
    store.reset();
    assert.equal(store.getSettingConfig(), null);
  });

  it('implements the legacy CONFINFO, AREABAYINFO and CONFIG flow', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const facilityResponse = await fetch(`${baseUrl}/hifos/confinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDENTCODE: 'F' }),
    });
    const facilities = JSON.parse((await facilityResponse.json()).result);
    assert.equal(facilities.STATUS, 'PASS');
    assert.equal(facilities.MSGBODY.ITEMS[0].VALUE, 'GUMI');

    const areaResponse = await fetch(`${baseUrl}/hifos/confinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDENTCODE: 'A', VALUE: 'GUMI' }),
    });
    const areas = JSON.parse((await areaResponse.json()).result);
    assert.deepEqual(
      areas.MSGBODY.ITEMS.map((item) => item.VALUE),
      ['PHOTO', 'ETCH', 'EMPTY-BAY', 'FAIL-BAY'],
    );

    const bayResponse = await fetch(`${baseUrl}/hifos/areabayinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ AREA: 'PHOTO', FACILITY: 'GUMI' }),
    });
    const bays = JSON.parse((await bayResponse.json()).result);
    assert.deepEqual(bays.MSGBODY.BAYS, [{ BAY: 'P01' }, { BAY: 'P02' }]);

    const configResponse = await fetch(`${baseUrl}/hifos/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FACILITY: 'GUMI',
        AREA: 'PHOTO',
        BAY: 'P01',
        DEVICENAME: 'ANDROID_001',
        IPADDR: '192.168.0.10',
        USERID: 'OP001',
      }),
    });
    const config = JSON.parse((await configResponse.json()).result);
    assert.equal(config.STATUS, 'PASS');
    assert.equal(config.MSGBODY.CONFIG, 'OK');
  });

  it('covers empty data and business failures without HTTP failures', async () => {
    for (const [messageName, payload, message] of [
      ['confinfo', { IDENTCODE: 'A', VALUE: 'EMPTY-AREA' }, undefined],
      ['confinfo', { IDENTCODE: 'A', VALUE: 'FAIL-AREA' }, 'AREA DATA Empty!'],
      ['areabayinfo', { AREA: 'FAIL-BAY', FACILITY: 'GUMI' }, 'BAY DATA Empty!'],
      [
        'config',
        {
          FACILITY: 'GUMI',
          AREA: 'PHOTO',
          BAY: 'P01',
          DEVICENAME: 'ANDROID_001',
          IPADDR: '0.0.0.0',
          USERID: 'OP001',
        },
        'CONFIG failed.',
      ],
    ]) {
      const response = await fetch(`${baseUrl}/hifos/${messageName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(response.status, 200);
      const result = JSON.parse((await response.json()).result);
      if (message) {
        assert.equal(result.STATUS, 'FAIL');
        assert.equal(result.ERRMSG, message);
      } else {
        assert.equal(result.STATUS, 'PASS');
        assert.deepEqual(result.MSGBODY.ITEMS, []);
      }
    }
  });
});

describe('diff parameter messages', () => {
  it('persists inserted parameter values', async () => {
    await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });

    const insertResponse = await fetch(`${baseUrl}/hifos/INSERTPARA`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        USERID: 'OPERATOR_ID',
        BATCHID: 'BAT202048248',
        MACHINENAME: 'DIFF-01',
        FACILITY: 'KFAB',
        EQPPARA: '0.12|540',
        EQPPARANO: '1|2',
        EQPPARAMAX: '0.15|560',
      }),
    });
    assert.equal(JSON.parse((await insertResponse.json()).result).STATUS, 'PASS');

    const listResponse = await fetch(`${baseUrl}/hifos/GETEQPPARA`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MACHINE: 'DIFF-01', FACILITY: 'KFAB' }),
    });
    const listResult = JSON.parse((await listResponse.json()).result);
    assert.equal(listResult.MSGBODY.EQPDATA[0].DATA, '0.12');
  });
});

describe('rcp inquire messages', () => {
  it('returns recipe rows for a lot through METRECIPESEARCH', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'METRECIPESEARCH',
        payload: { LOTID: 'LOT-DEMO-01', FACILITY: 'KFAB' },
      }),
    });
    assert.equal(response.status, 200);

    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.PRODUCTSPECNAME, 'PRODUCT-DEMO');
    assert.equal(result.MSGBODY.PROCESSOPERATIONNAME, '1000-00');
    assert.equal(result.MSGBODY.CATEGORY, 'CDOVERAYVI');
    assert.equal(result.MSGBODY.RCPOVITEMS[0].OVRCP, 'OV-RCP-A01');
    assert.equal(result.MSGBODY.RCPVIITEMS[0].MACHINENAME, 'VI-EQ-01');
    assert.equal(result.MSGBODY.RCPCDITEMS[0].CDRCP, 'CD-RCP-C01');
    assert.equal(result.MSGBODY.MASKITEMS[0].RETICLENAME, 'MASK-D01');
  });

  it('returns measurement messages through CHECKINSPACTION', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'CHECKINSPACTION',
        payload: {
          LOTID: 'LOT-DEMO-01',
          FACILITY: 'KFAB',
          TYPE: 'RCP',
          AFOPERM: '1000',
          AFOPERS: '00',
        },
      }),
    });
    assert.equal(response.status, 200);

    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'PASS');
    assert.equal(result.MSGBODY.MACROMSG, 'Macro sample 확인');
    assert.equal(result.MSGBODY.CDMSG, 'CD Point 01');
    assert.equal(result.MSGBODY.sOvMSG, 'Overlay 확인');
  });

  it('returns the legacy fail envelope for an unknown RCP lot', async () => {
    const response = await fetch(`${baseUrl}/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageName: 'METRECIPESEARCH',
        payload: { LOTID: 'LOT-NOT-FOUND', FACILITY: 'KFAB' },
      }),
    });

    const result = JSON.parse((await response.json()).result);
    assert.equal(result.STATUS, 'FAIL');
    assert.equal(result.ERRMSG, 'LOT 정보를 찾을 수 없습니다.');
  });
});

describe('xml messages', () => {
  it('returns floors through /hifos/message', async () => {
    const response = await fetch(`${baseUrl}/hifos/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', MESSAGENAME: 'GETFLOORDATA' },
      body: '',
    });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<FLOOR>1F<\/FLOOR>/);
  });
});
