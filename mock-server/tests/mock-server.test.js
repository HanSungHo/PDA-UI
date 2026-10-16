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
