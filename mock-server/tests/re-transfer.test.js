import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

describe('ReTransfer mock handlers', () => {
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
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  describe('CARRYINFO', () => {
    it('returns default carry info for standard LOTID via /message/send', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'CARRYINFO',
          payload: { LOTID: 'LOT123', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(result.MSGBODY.CURRENTSTK);
      assert.ok(result.MSGBODY.FABS);
      assert.ok(result.MSGBODY.PORTS);
    });

    it('returns carryInfoNoStk when LOTID is NOSTK', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'CARRYINFO',
          payload: { LOTID: 'NOSTK', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.equal(result.MSGBODY.CURRENTSTK, '');
    });

    it('returns failure when LOTID contains ERROR', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'CARRYINFO',
          payload: { LOTID: 'ERROR_LOT', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'FAIL');
      assert.equal(result.ERRMSG, 'CARRYINFO 조회 중 오류가 발생하였습니다.');
    });
  });

  describe('FABBAYINFO', () => {
    it('returns bay list for valid FAB', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'FABBAYINFO',
          payload: { FAB: 'FAB4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(result.MSGBODY.BAYS);
    });

    it('returns failure when FAB contains ERROR', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'FABBAYINFO',
          payload: { FAB: 'ERROR_FAB' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'FAIL');
      assert.equal(result.ERRMSG, 'FABBAYINFO 조회 중 오류가 발생하였습니다.');
    });
  });

  describe('BAYSTOCKERINFO', () => {
    it('returns stocker list for valid BAY', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'BAYSTOCKERINFO',
          payload: { BAY: 'BAY01', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(result.MSGBODY.STOCKERS);
    });

    it('returns failure when BAY contains ERROR', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'BAYSTOCKERINFO',
          payload: { BAY: 'ERROR_BAY', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'FAIL');
      assert.equal(result.ERRMSG, 'BAYSTOCKERINFO 조회 중 오류가 발생하였습니다.');
    });
  });

  describe('PDALIST', () => {
    it('returns PDA list for valid BAY', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'PDALIST',
          payload: { BAY: 'BAY01', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(result.MSGBODY.PDAS);
    });

    it('returns failure when BAY contains ERROR', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'PDALIST',
          payload: { BAY: 'ERROR_BAY', FACILITY: 'F4' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'FAIL');
      assert.equal(result.ERRMSG, 'PDALIST 조회 중 오류가 발생하였습니다.');
    });
  });

  describe('CARRY', () => {
    it('returns success for valid carry payload', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'CARRY',
          payload: {
            LOTID: 'LOT123',
            FACILITY: 'F4',
            NEXTFAB: 'FAB4',
            NEXTBAY: 'BAY01',
            NEXTSTOCKER: 'STK01',
            PORT: 'OUT',
            PDA: '지정안함',
            CURRENTSTK: 'STK02',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
    });

    it('returns failure when LOTID contains FAIL', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'CARRY',
          payload: {
            LOTID: 'FAIL_LOT',
            FACILITY: 'F4',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'FAIL');
      assert.equal(result.ERRMSG, '반송 처리에 실패하였습니다.');
    });
  });
});
