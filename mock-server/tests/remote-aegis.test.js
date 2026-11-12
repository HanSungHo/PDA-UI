import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

describe('RemoteAegis mock handlers', () => {
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

  describe('REMOTEEQPINFO', () => {
    it('returns equipment details for AEGIS01', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'REMOTEEQPINFO',
          payload: { EQPID: 'AEGIS01' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.equal(result.MSGBODY.MAINEQPID, 'AEGIS01');
      assert.equal(result.MSGBODY.PCOUNT, 'Y');
      assert.ok(result.MSGBODY.PORTNAME.includes('PORT1'));
    });
  });

  describe('MACHINEPORTSTATUS & MACHINEPORTCLEAR', () => {
    it('returns port status for AEGIS01 PORT1', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'MACHINEPORTSTATUS',
          payload: { EQPID: 'AEGIS01', PORTNAME: 'PORT1' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.equal(result.MSGBODY.PORTSTATENAME, 'READY');
    });

    it('clears port for AEGIS01 PORT1', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'MACHINEPORTCLEAR',
          payload: { MACHINENAME: 'AEGIS01', PORTNAME: 'PORT1' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.statusCode, 200);
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
    });
  });

  describe('AEGISMODECHANGE', () => {
    it('changes mode to LOCAL successfully', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'AEGISMODECHANGE',
          payload: {
            MACHINENAME: 'AEGIS01',
            MODE: 'LOCAL',
            USERID: 'USER01',
            USERNAME: 'OPER01',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
    });

    it('changes mode to REMOTE successfully', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'AEGISMODECHANGE',
          payload: {
            MACHINENAME: 'AEGIS01',
            MODE: 'REMOTE',
            USERID: 'USER01',
            USERNAME: 'OPER01',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
    });
  });

  describe('AEGISLOTINFO', () => {
    it('returns lot info with ITEMS for LOT01 and AEGIS01', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'AEGISLOTINFO',
          payload: {
            LOTID: 'LOT-AEGIS-01',
            MACHINE: 'AEGIS01',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(result.MSGBODY.ITEMS);
      assert.ok(result.MSGBODY.ITEMS.ITEM);
      assert.equal(result.MSGBODY.ITEMS.ITEM.OPERDESC, 'PARTICLE TEST');
    });
  });

  describe('COMMENTLIST with COMMENTITEMS', () => {
    it('returns both ITEMS and COMMENTITEMS arrays', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'COMMENTLIST',
          payload: { LOTID: 'LOT-DEMO-01', FACILITY: 'FAB2' },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
      assert.ok(Array.isArray(result.MSGBODY.ITEMS));
      assert.ok(Array.isArray(result.MSGBODY.COMMENTITEMS));
    });
  });

  describe('AEGISREMOTESTART', () => {
    it('sends remote start command successfully', async () => {
      const response = await fetch(`${baseUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageName: 'AEGISREMOTESTART',
          payload: {
            MACHINENAME: 'AEGIS01',
            RECIPE: 'RCP-01',
            PORTNAME: 'PORT1',
            RUN_NO: 'LOT01',
            PRODEQP: 'PROD_EQP',
            SLOT: '01,02',
            USERID: 'USER01',
            USERNAME: 'OPER01',
          },
        }),
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      const result = JSON.parse(data.result);
      assert.equal(result.STATUS, 'PASS');
    });
  });
});
